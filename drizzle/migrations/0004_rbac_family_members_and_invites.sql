DO $$ BEGIN
  CREATE TYPE public.member_role AS ENUM ('parent', 'caregiver');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.parents ADD COLUMN IF NOT EXISTS role public.member_role NOT NULL DEFAULT 'parent';

CREATE TABLE IF NOT EXISTS public.family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role public.member_role NOT NULL DEFAULT 'caregiver',
  permissions jsonb NOT NULL DEFAULT '{"care_logs": ["read","write"], "shift_handovers": ["read","write"]}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_id, user_id)
);

GRANT SELECT ON public.family_members TO authenticated;
GRANT ALL ON public.family_members TO service_role;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY family_members_select_related ON public.family_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR family_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.family_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  revoked boolean NOT NULL DEFAULT false
);

GRANT SELECT, INSERT, UPDATE ON public.family_invites TO authenticated;
GRANT ALL ON public.family_invites TO service_role;
ALTER TABLE public.family_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY family_invites_select_own ON public.family_invites
  FOR SELECT TO authenticated USING (family_id = auth.uid());
CREATE POLICY family_invites_insert_own ON public.family_invites
  FOR INSERT TO authenticated WITH CHECK (family_id = auth.uid());
CREATE POLICY family_invites_update_own ON public.family_invites
  FOR UPDATE TO authenticated USING (family_id = auth.uid()) WITH CHECK (family_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_family_caregiver(_family_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_members m
    WHERE m.user_id = auth.uid()
      AND m.family_id = _family_id
      AND m.role = 'caregiver'
  )
$$;

CREATE OR REPLACE FUNCTION public.generate_family_invite()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;
  LOOP
    new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.family_invites i WHERE i.code = new_code);
  END LOOP;
  INSERT INTO public.family_invites (family_id, code) VALUES (auth.uid(), new_code);
  RETURN new_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_family_invite(_code text, _display_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_family uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;

  SELECT i.family_id INTO target_family
  FROM public.family_invites i
  WHERE i.code = upper(trim(_code))
    AND i.revoked = false
    AND i.expires_at > now()
  LIMIT 1;

  IF target_family IS NULL THEN
    RAISE EXCEPTION 'That invite code is not valid.';
  END IF;

  IF target_family = auth.uid() THEN
    RAISE EXCEPTION 'That invite belongs to your own family.';
  END IF;

  INSERT INTO public.family_members (family_id, user_id, role)
  VALUES (target_family, auth.uid(), 'caregiver')
  ON CONFLICT (family_id, user_id) DO UPDATE SET role = 'caregiver';

  INSERT INTO public.parents (parent_id, display_name, role)
  VALUES (auth.uid(), COALESCE(NULLIF(trim(_display_name), ''), 'Caregiver'), 'caregiver')
  ON CONFLICT (parent_id) DO UPDATE
    SET display_name = COALESCE(NULLIF(trim(_display_name), ''), public.parents.display_name),
        role = 'caregiver';

  RETURN target_family;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_family_caregiver(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_family_invite() TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_family_invite(text, text) TO authenticated;

CREATE POLICY babies_select_caregiver ON public.babies
  FOR SELECT TO authenticated
  USING (public.is_family_caregiver(parent_id));

CREATE POLICY care_logs_select_caregiver ON public.care_logs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.babies b WHERE b.id = care_logs.baby_id AND public.is_family_caregiver(b.parent_id)));

CREATE POLICY care_logs_insert_caregiver ON public.care_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = logged_by AND EXISTS (SELECT 1 FROM public.babies b WHERE b.id = care_logs.baby_id AND public.is_family_caregiver(b.parent_id)));

CREATE POLICY care_logs_update_caregiver ON public.care_logs
  FOR UPDATE TO authenticated
  USING (auth.uid() = logged_by AND EXISTS (SELECT 1 FROM public.babies b WHERE b.id = care_logs.baby_id AND public.is_family_caregiver(b.parent_id)))
  WITH CHECK (auth.uid() = logged_by);

CREATE POLICY care_logs_delete_caregiver ON public.care_logs
  FOR DELETE TO authenticated
  USING (auth.uid() = logged_by AND EXISTS (SELECT 1 FROM public.babies b WHERE b.id = care_logs.baby_id AND public.is_family_caregiver(b.parent_id)));

CREATE POLICY shift_handovers_select_caregiver ON public.shift_handovers
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.babies b WHERE b.id = shift_handovers.baby_id AND public.is_family_caregiver(b.parent_id)));

CREATE POLICY shift_handovers_insert_caregiver ON public.shift_handovers
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = caregiver_id AND EXISTS (SELECT 1 FROM public.babies b WHERE b.id = shift_handovers.baby_id AND public.is_family_caregiver(b.parent_id)));

CREATE POLICY shift_handovers_update_caregiver ON public.shift_handovers
  FOR UPDATE TO authenticated
  USING (auth.uid() = caregiver_id AND EXISTS (SELECT 1 FROM public.babies b WHERE b.id = shift_handovers.baby_id AND public.is_family_caregiver(b.parent_id)))
  WITH CHECK (auth.uid() = caregiver_id);
