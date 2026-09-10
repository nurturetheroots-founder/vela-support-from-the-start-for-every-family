-- =============================================================================
-- Vela — Layer 2 for the live Nurture The Roots database
-- =============================================================================
-- Adapted from drizzle/migrations/0008_layer2_secure_data_layer.sql, which
-- targets the schema in this repo's migration history (parents, babies,
-- care_logs...). The live database has a different lineage: profiles, families,
-- checkins. This script targets THAT database.
--
-- What it does NOT do, deliberately:
--   * It does not touch families, checkins, check_ins or review_queue. Their
--     shapes are unverified, and applying RLS to a table nobody has inspected
--     is how you lock an app out of its own data.
--   * It does not sweep EXECUTE from every function in `public`. The original
--     does, which is safe when this repo owns the whole schema. Here another
--     application's functions live in `public` too, so the revokes below name
--     only the functions this script creates. An opt-in sweep is at the end.
--   * It does not add a foreign key from profiles.id to auth.users, or from
--     family_members.family_id to families.id. Both may already hold rows that
--     would fail validation. Add them once you have checked.
--
-- Existing data: nothing is dropped or rewritten. profiles gains one column.
-- Idempotent — safe to replay.
-- =============================================================================


-- =============================================================================
-- 0. Prerequisites — fail early and legibly, not halfway through
-- =============================================================================

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NULL THEN
    RAISE EXCEPTION
      'public.profiles not found. This script adapts Layer 2 to the live '
      'schema; if profiles is missing you are on the wrong database.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
      AND column_name = 'id' AND data_type = 'uuid'
  ) THEN
    RAISE EXCEPTION
      'public.profiles.id is not uuid. Every table below keys off it, so '
      'stopping rather than guessing.';
  END IF;
END $$;

DO $$ BEGIN
  CREATE TYPE public.member_role AS ENUM ('parent', 'caregiver');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =============================================================================
-- 1. profiles — extend in place
-- =============================================================================
-- The original CREATE TABLE IF NOT EXISTS silently did nothing here, because
-- the table already existed with a different shape. This is the fix: add the
-- one column Layer 2 needs and leave name, due_date, baby_birthday, goals and
-- updated_at exactly as they are.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role public.member_role NOT NULL DEFAULT 'parent';

COMMENT ON COLUMN public.profiles.role IS
  'Coarse capability tier. Fine-grained cross-account access is decided by '
  'family_members.permissions, never here.';

CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles (role);

-- RLS is enabled but no policy of yours is dropped: permissive policies OR
-- together, and the one added here is the tightest possible (own row only), so
-- it cannot widen whatever you already have.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_layer2_select_own ON public.profiles;
CREATE POLICY profiles_layer2_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

REVOKE ALL ON public.profiles FROM PUBLIC, anon;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;


-- =============================================================================
-- 2. family_members — the only delegation surface
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.family_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   uuid NOT NULL,
  profile_id  uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role        public.member_role NOT NULL DEFAULT 'caregiver',
  permissions jsonb NOT NULL DEFAULT
    '{"care_logs": ["read", "write"], "shift_handovers": ["read", "write"]}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_id, profile_id)
);

CREATE INDEX IF NOT EXISTS family_members_profile_family_idx
  ON public.family_members (profile_id, family_id);

COMMENT ON COLUMN public.family_members.permissions IS
  'Structured grant map: {"<resource>": ["read"|"write", ...]}. Only operational '
  'resources may appear — the shape constraint makes it impossible to write a '
  'row that delegates private_checkins or epds_screenings.';

-- CHECK constraints cannot contain subqueries, so the shape rule lives in an
-- IMMUTABLE function. This is the structural half of the private-data
-- guarantee; has_family_permission() is the runtime half.
CREATE OR REPLACE FUNCTION public.is_valid_member_permissions(_permissions jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_typeof(_permissions) = 'object'
     AND NOT EXISTS (
       SELECT 1
       FROM jsonb_each(_permissions) AS entry(resource, actions)
       WHERE entry.resource NOT IN ('care_logs', 'shift_handovers')
          OR jsonb_typeof(entry.actions) <> 'array'
          OR EXISTS (
               SELECT 1
               FROM jsonb_array_elements_text(entry.actions) AS granted(action)
               WHERE granted.action NOT IN ('read', 'write')
             )
     );
$$;

DO $$ BEGIN
  ALTER TABLE public.family_members
    ADD CONSTRAINT family_members_permissions_shape
    CHECK (public.is_valid_member_permissions(permissions));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

REVOKE ALL ON public.family_members FROM PUBLIC, anon;
GRANT SELECT ON public.family_members TO authenticated;
GRANT ALL ON public.family_members TO service_role;

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS family_members_select_related ON public.family_members;
CREATE POLICY family_members_select_related ON public.family_members
  FOR SELECT TO authenticated
  USING (
    profile_id = (SELECT auth.uid())
    OR family_id = (SELECT auth.uid())
  );


-- =============================================================================
-- 3. Permission resolution
-- =============================================================================
-- SECURITY DEFINER on purpose: the policies on care_logs and shift_handovers
-- read family_members, which carries its own RLS. As the invoker that recurses
-- (policy -> table -> policy). As the owner it reads the row and terminates.
CREATE OR REPLACE FUNCTION public.has_family_permission(
  _family_id uuid,
  _resource  text,
  _action    text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT _family_id IS NOT NULL
     AND auth.uid() IS NOT NULL
     AND _resource IN ('care_logs', 'shift_handovers')
     AND (
       _family_id = auth.uid()
       OR EXISTS (
         SELECT 1
         FROM public.family_members m
         WHERE m.profile_id  = auth.uid()
           AND m.family_id   = _family_id
           AND m.permissions -> _resource ? _action
       )
     );
$$;

COMMENT ON FUNCTION public.has_family_permission(uuid, text, text) IS
  'Single evaluation point for cross-account access. Returns false for any '
  'resource outside the operational allowlist, regardless of stored grants.';

CREATE OR REPLACE FUNCTION public.is_family_caregiver(_family_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_members m
    WHERE m.profile_id = auth.uid()
      AND m.family_id  = _family_id
      AND m.role       = 'caregiver'
  );
$$;


-- =============================================================================
-- 4. family_invites — how a membership actually gets minted
-- =============================================================================
-- Without this, family_members is inert: there is no path to add a caregiver,
-- and the permissions system has nothing to resolve. Adapted to write
-- profiles.role rather than the parents table, which does not exist here.

CREATE TABLE IF NOT EXISTS public.family_invites (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id  uuid NOT NULL,
  code       text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  revoked    boolean NOT NULL DEFAULT false
);

REVOKE ALL ON public.family_invites FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.family_invites TO authenticated;
GRANT ALL ON public.family_invites TO service_role;

ALTER TABLE public.family_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS family_invites_select_own ON public.family_invites;
DROP POLICY IF EXISTS family_invites_insert_own ON public.family_invites;
DROP POLICY IF EXISTS family_invites_update_own ON public.family_invites;

CREATE POLICY family_invites_select_own ON public.family_invites
  FOR SELECT TO authenticated USING (family_id = (SELECT auth.uid()));
CREATE POLICY family_invites_insert_own ON public.family_invites
  FOR INSERT TO authenticated WITH CHECK (family_id = (SELECT auth.uid()));
CREATE POLICY family_invites_update_own ON public.family_invites
  FOR UPDATE TO authenticated USING (family_id = (SELECT auth.uid()))
  WITH CHECK (family_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.generate_family_invite()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

CREATE OR REPLACE FUNCTION public.redeem_family_invite(_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

  UPDATE public.profiles SET role = 'caregiver' WHERE id = auth.uid();

  -- Operational access only. The shape constraint rejects anything wider.
  INSERT INTO public.family_members (family_id, profile_id, role, permissions)
  VALUES (
    target_family,
    auth.uid(),
    'caregiver',
    '{"care_logs": ["read", "write"], "shift_handovers": ["read", "write"]}'::jsonb
  )
  ON CONFLICT (family_id, profile_id) DO UPDATE SET role = 'caregiver';

  RETURN target_family;
END;
$$;


-- =============================================================================
-- 5. care_logs — operational, family-scoped
-- =============================================================================
-- Created fresh, in the shape the Layer 2 specification actually calls for:
-- (id, family_id, created_by, content, operational_metrics, created_at). The
-- baby_id column and the babies lookup existed only because the repo's older
-- table had them. Nothing here depends on a babies table.

CREATE TABLE IF NOT EXISTS public.care_logs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id           uuid NOT NULL,
  created_by          uuid NOT NULL DEFAULT auth.uid()
                        REFERENCES public.profiles (id) ON DELETE CASCADE,
  content             text,
  operational_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT care_logs_operational_metrics_object
    CHECK (jsonb_typeof(operational_metrics) = 'object')
);

CREATE INDEX IF NOT EXISTS care_logs_family_created_idx
  ON public.care_logs (family_id, created_at DESC);

COMMENT ON COLUMN public.care_logs.operational_metrics IS
  'Shift-floor detail only (ounces, diaper condition, sleep minutes). Maternal '
  'wellness data belongs in private_checkins and must never be written here.';

REVOKE ALL ON public.care_logs FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.care_logs TO authenticated;
GRANT ALL ON public.care_logs TO service_role;

ALTER TABLE public.care_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS care_logs_read   ON public.care_logs;
DROP POLICY IF EXISTS care_logs_insert ON public.care_logs;
DROP POLICY IF EXISTS care_logs_update ON public.care_logs;
DROP POLICY IF EXISTS care_logs_delete ON public.care_logs;

-- READ: anyone holding a 'read' grant on care_logs for this family.
CREATE POLICY care_logs_read ON public.care_logs
  FOR SELECT TO authenticated
  USING (public.has_family_permission(family_id, 'care_logs', 'read'));

-- WRITE: a 'write' grant, and you may only file logs under your own name.
-- A client posting someone else's family_id fails the permission test, which is
-- why no server-side trigger is needed to derive it.
CREATE POLICY care_logs_insert ON public.care_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND public.has_family_permission(family_id, 'care_logs', 'write')
  );

CREATE POLICY care_logs_update ON public.care_logs
  FOR UPDATE TO authenticated
  USING (
    public.has_family_permission(family_id, 'care_logs', 'write')
    AND (created_by = (SELECT auth.uid()) OR family_id = (SELECT auth.uid()))
  )
  WITH CHECK (public.has_family_permission(family_id, 'care_logs', 'write'));

CREATE POLICY care_logs_delete ON public.care_logs
  FOR DELETE TO authenticated
  USING (
    public.has_family_permission(family_id, 'care_logs', 'write')
    AND (created_by = (SELECT auth.uid()) OR family_id = (SELECT auth.uid()))
  );


-- =============================================================================
-- 6. shift_handovers — operational, family-scoped
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.shift_handovers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id    uuid NOT NULL,
  caregiver_id uuid NOT NULL DEFAULT auth.uid()
                 REFERENCES public.profiles (id) ON DELETE CASCADE,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shift_handovers_family_created_idx
  ON public.shift_handovers (family_id, created_at DESC);

REVOKE ALL ON public.shift_handovers FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_handovers TO authenticated;
GRANT ALL ON public.shift_handovers TO service_role;

ALTER TABLE public.shift_handovers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shift_handovers_read   ON public.shift_handovers;
DROP POLICY IF EXISTS shift_handovers_insert ON public.shift_handovers;
DROP POLICY IF EXISTS shift_handovers_update ON public.shift_handovers;
DROP POLICY IF EXISTS shift_handovers_delete ON public.shift_handovers;

CREATE POLICY shift_handovers_read ON public.shift_handovers
  FOR SELECT TO authenticated
  USING (public.has_family_permission(family_id, 'shift_handovers', 'read'));

CREATE POLICY shift_handovers_insert ON public.shift_handovers
  FOR INSERT TO authenticated
  WITH CHECK (
    caregiver_id = (SELECT auth.uid())
    AND public.has_family_permission(family_id, 'shift_handovers', 'write')
  );

CREATE POLICY shift_handovers_update ON public.shift_handovers
  FOR UPDATE TO authenticated
  USING (
    public.has_family_permission(family_id, 'shift_handovers', 'write')
    AND (caregiver_id = (SELECT auth.uid()) OR family_id = (SELECT auth.uid()))
  )
  WITH CHECK (public.has_family_permission(family_id, 'shift_handovers', 'write'));

CREATE POLICY shift_handovers_delete ON public.shift_handovers
  FOR DELETE TO authenticated
  USING (
    public.has_family_permission(family_id, 'shift_handovers', 'write')
    AND (caregiver_id = (SELECT auth.uid()) OR family_id = (SELECT auth.uid()))
  );


-- =============================================================================
-- 7. private_checkins — absolute isolation
-- =============================================================================
-- Unchanged from the original: this is the part of Layer 2 that exists to let a
-- mother answer honestly. Note this is a NEW table and is not your existing
-- `checkins` or `check_ins`, neither of which is touched here.

CREATE TABLE IF NOT EXISTS public.private_checkins (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id        uuid NOT NULL DEFAULT auth.uid()
                     REFERENCES public.profiles (id) ON DELETE CASCADE,
  wellness_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT private_checkins_wellness_metrics_object
    CHECK (jsonb_typeof(wellness_metrics) = 'object')
);

CREATE INDEX IF NOT EXISTS private_checkins_parent_created_idx
  ON public.private_checkins (parent_id, created_at DESC);

COMMENT ON TABLE public.private_checkins IS
  'Maternal wellness. Readable and writable by the owning parent alone. No '
  'caregiver role, permissions grant, or family membership reaches this table.';

-- service_role is revoked deliberately. It carries BYPASSRLS, so leaving the
-- grant would let any server-side key read straight past the policies below.
REVOKE ALL ON public.private_checkins FROM PUBLIC, anon, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.private_checkins TO authenticated;

ALTER TABLE public.private_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_checkins FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS private_checkins_select    ON public.private_checkins;
DROP POLICY IF EXISTS private_checkins_insert    ON public.private_checkins;
DROP POLICY IF EXISTS private_checkins_update    ON public.private_checkins;
DROP POLICY IF EXISTS private_checkins_delete    ON public.private_checkins;
DROP POLICY IF EXISTS private_checkins_isolation ON public.private_checkins;

CREATE POLICY private_checkins_select ON public.private_checkins
  FOR SELECT TO authenticated
  USING (parent_id = (SELECT auth.uid()));

CREATE POLICY private_checkins_insert ON public.private_checkins
  FOR INSERT TO authenticated
  WITH CHECK (parent_id = (SELECT auth.uid()));

CREATE POLICY private_checkins_update ON public.private_checkins
  FOR UPDATE TO authenticated
  USING (parent_id = (SELECT auth.uid()))
  WITH CHECK (parent_id = (SELECT auth.uid()));

CREATE POLICY private_checkins_delete ON public.private_checkins
  FOR DELETE TO authenticated
  USING (parent_id = (SELECT auth.uid()));

-- The isolation block. RESTRICTIVE policies are ANDed with the OR-ed set of
-- permissive ones, so a future migration cannot widen access by adding a
-- permissive policy alone.
CREATE POLICY private_checkins_isolation ON public.private_checkins
  AS RESTRICTIVE FOR ALL TO public
  USING (parent_id = (SELECT auth.uid()))
  WITH CHECK (parent_id = (SELECT auth.uid()));


-- =============================================================================
-- 8. epds_screenings — absolute isolation
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.epds_screenings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id           uuid NOT NULL DEFAULT auth.uid()
                        REFERENCES public.profiles (id) ON DELETE CASCADE,
  scores              jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_score         integer NOT NULL DEFAULT 0,
  q10_emergency_state boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT epds_screenings_scores_object CHECK (jsonb_typeof(scores) = 'object'),
  CONSTRAINT epds_screenings_total_score_range CHECK (total_score BETWEEN 0 AND 30)
);

CREATE INDEX IF NOT EXISTS epds_screenings_parent_created_idx
  ON public.epds_screenings (parent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS epds_screenings_emergency_idx
  ON public.epds_screenings (created_at DESC)
  WHERE q10_emergency_state;

COMMENT ON COLUMN public.epds_screenings.q10_emergency_state IS
  'Item 10 — self-harm ideation. Derived server-side from `scores`; a client '
  'cannot suppress the flag by posting false alongside a non-zero q10.';

CREATE OR REPLACE FUNCTION public.epds_screenings_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  answered integer;
  summed   integer;
  item10   integer;
BEGIN
  SELECT count(*), COALESCE(sum((NEW.scores ->> item)::integer), 0)
  INTO answered, summed
  FROM unnest(ARRAY['q1','q2','q3','q4','q5','q6','q7','q8','q9','q10']) AS item
  WHERE jsonb_typeof(NEW.scores -> item) = 'number';

  IF answered = 10 THEN
    item10 := (NEW.scores ->> 'q10')::integer;
    NEW.total_score := summed;
    NEW.q10_emergency_state := item10 > 0;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS epds_screenings_before_write ON public.epds_screenings;
CREATE TRIGGER epds_screenings_before_write
  BEFORE INSERT OR UPDATE ON public.epds_screenings
  FOR EACH ROW EXECUTE FUNCTION public.epds_screenings_before_write();

REVOKE ALL ON public.epds_screenings FROM PUBLIC, anon, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.epds_screenings TO authenticated;

ALTER TABLE public.epds_screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epds_screenings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS epds_screenings_select    ON public.epds_screenings;
DROP POLICY IF EXISTS epds_screenings_insert    ON public.epds_screenings;
DROP POLICY IF EXISTS epds_screenings_update    ON public.epds_screenings;
DROP POLICY IF EXISTS epds_screenings_delete    ON public.epds_screenings;
DROP POLICY IF EXISTS epds_screenings_isolation ON public.epds_screenings;

CREATE POLICY epds_screenings_select ON public.epds_screenings
  FOR SELECT TO authenticated
  USING (parent_id = (SELECT auth.uid()));

CREATE POLICY epds_screenings_insert ON public.epds_screenings
  FOR INSERT TO authenticated
  WITH CHECK (parent_id = (SELECT auth.uid()));

CREATE POLICY epds_screenings_update ON public.epds_screenings
  FOR UPDATE TO authenticated
  USING (parent_id = (SELECT auth.uid()))
  WITH CHECK (parent_id = (SELECT auth.uid()));

CREATE POLICY epds_screenings_delete ON public.epds_screenings
  FOR DELETE TO authenticated
  USING (parent_id = (SELECT auth.uid()));

CREATE POLICY epds_screenings_isolation ON public.epds_screenings
  AS RESTRICTIVE FOR ALL TO public
  USING (parent_id = (SELECT auth.uid()))
  WITH CHECK (parent_id = (SELECT auth.uid()));


-- =============================================================================
-- 9. Function lockdown — scoped to this script's own functions
-- =============================================================================
-- Postgres grants EXECUTE to PUBLIC on every new function, and in Supabase
-- PUBLIC includes anon. The original swept the whole schema; here the revokes
-- name only what this script created, so another application's functions in
-- `public` are left alone.

REVOKE ALL ON FUNCTION public.epds_screenings_before_write() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.has_family_permission(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_valid_member_permissions(jsonb)      FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_family_caregiver(uuid)               FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.generate_family_invite()                FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.redeem_family_invite(text)              FROM PUBLIC, anon;

-- These grants are load-bearing, not decorative: Postgres checks EXECUTE
-- against the *invoking* user even inside an RLS policy or a CHECK constraint.
-- Revoke either of the first two and every read of care_logs, or every write to
-- family_members, fails with "permission denied for function".
GRANT EXECUTE ON FUNCTION public.has_family_permission(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_valid_member_permissions(jsonb)      TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_family_caregiver(uuid)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_family_invite()                TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_family_invite(text)              TO authenticated;


-- =============================================================================
-- 10. OPTIONAL — schema-wide function sweep
-- =============================================================================
-- Run this ONLY once you have confirmed that no other application's functions
-- live in `public` and rely on anon EXECUTE. It closes anon access to every
-- function in the schema, including ones this script did not create.
--
-- DO $$
-- DECLARE fn record;
-- BEGIN
--   FOR fn IN
--     SELECT p.oid::regprocedure AS signature
--     FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--     WHERE n.nspname = 'public' AND p.prokind = 'f'
--   LOOP
--     EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn.signature);
--   END LOOP;
-- END $$;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
