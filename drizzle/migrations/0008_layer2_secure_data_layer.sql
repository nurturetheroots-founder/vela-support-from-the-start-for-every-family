-- =============================================================================
-- Vela — Layer 2: Secure Data Layer & Schema Isolation
-- =============================================================================
-- Two data domains live in this database and they must never mix:
--
--   OPERATIONAL   care_logs, shift_handovers — feeds, diapers, sleep, shift
--                 notes. Shared inside a family. A caregiver invited by the
--                 parent may read and write these, governed by the structured
--                 `permissions` JSONB on family_members.
--
--   PRIVATE       private_checkins, epds_screenings — maternal mood, wellness
--                 and depression screening. Owned by exactly one person. No
--                 delegation path exists, at any privilege level below the
--                 database owner. This is a psychological-safety guarantee:
--                 a mother must be able to answer "I have thought of harming
--                 myself" knowing the night nurse can never see it.
--
-- Every statement is idempotent so the file can be replayed safely.
-- =============================================================================


-- =============================================================================
-- 0. Prerequisites
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE public.member_role AS ENUM ('parent', 'caregiver');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =============================================================================
-- 1. profiles — canonical identity, one row per auth.users row
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  role       public.member_role NOT NULL DEFAULT 'parent',
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS
  'Layer 2 identity. `role` is the coarse capability tier; fine-grained '
  'cross-account access is decided by family_members.permissions, never here.';

-- Backfill from the existing parents table, then from any auth user that never
-- completed onboarding, so every session has a profile to resolve against.
INSERT INTO public.profiles (id, role, updated_at)
SELECT u.id,
       COALESCE(p.role, 'parent'::public.member_role),
       COALESCE(p.updated_at, now())
FROM auth.users u
LEFT JOIN public.parents p ON p.parent_id = u.id
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles (role);

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- profiles is written by triggers only; clients may read and touch their own row.
REVOKE ALL ON public.profiles FROM PUBLIC, anon;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;

-- `(SELECT auth.uid())` rather than a bare `auth.uid()`: the planner hoists it
-- into an InitPlan and evaluates it once per statement instead of once per row.
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));


-- Keep profiles in step with the legacy parents table, whichever path writes it.
CREATE OR REPLACE FUNCTION public.sync_profile_from_parent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, updated_at)
  VALUES (NEW.parent_id, NEW.role, now())
  ON CONFLICT (id) DO UPDATE
    SET role = EXCLUDED.role,
        updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS parents_sync_profile ON public.parents;
CREATE TRIGGER parents_sync_profile
  AFTER INSERT OR UPDATE OF role ON public.parents
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_from_parent();


-- Signup now provisions the profile before the parent row so the FK to
-- auth.users is satisfied in the same transaction as the user insert.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.parents (parent_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', ''))
  ON CONFLICT (parent_id) DO NOTHING;

  RETURN NEW;
END;
$$;


-- =============================================================================
-- 2. family_members — the only delegation surface in the schema
-- =============================================================================

-- `user_id` becomes `profile_id` and gains a real foreign key, so a membership
-- row cannot outlive the identity it grants access to.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'family_members' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.family_members RENAME COLUMN user_id TO profile_id;
  END IF;
END $$;

DELETE FROM public.family_members m
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = m.profile_id);

DO $$ BEGIN
  ALTER TABLE public.family_members
    ADD CONSTRAINT family_members_profile_id_fkey
    FOREIGN KEY (profile_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS family_members_profile_family_idx
  ON public.family_members (profile_id, family_id);

COMMENT ON COLUMN public.family_members.permissions IS
  'Structured grant map: {"<resource>": ["read"|"write", ...]}. Only operational '
  'resources may appear — the shape constraint below makes it impossible to '
  'write a row that delegates private_checkins or epds_screenings.';

-- CHECK constraints cannot contain subqueries, so the shape rule lives in an
-- IMMUTABLE function. The resource allowlist is the structural half of the
-- private-data guarantee; has_family_permission() is the runtime half.
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

-- Memberships are minted only by redeem_family_invite() (SECURITY DEFINER), so
-- authenticated holds no direct write privilege on this table.
REVOKE ALL ON public.family_members FROM PUBLIC, anon;
GRANT SELECT ON public.family_members TO authenticated;
GRANT ALL ON public.family_members TO service_role;

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS family_members_select_related ON public.family_members;

-- A member sees their own membership; a parent sees everyone they invited.
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
-- need to read family_members, and family_members carries its own RLS. Calling
-- it as the invoker would recurse (policy -> table -> policy). Running as the
-- owner reads the membership row directly and terminates.
--
-- `_resource` is checked against a hardcoded allowlist before anything else, so
-- even a caller that manages to store a rogue permissions key gets false back.
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
       -- The parent who owns the family always holds every operational right.
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

-- Existing helper, re-declared with the renamed column and a hardened path.
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

-- Re-declared unchanged apart from the hardened search_path.
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

CREATE OR REPLACE FUNCTION public.redeem_family_invite(_code text, _display_name text)
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

  INSERT INTO public.profiles (id, role)
  VALUES (auth.uid(), 'caregiver')
  ON CONFLICT (id) DO UPDATE SET role = 'caregiver', updated_at = now();

  -- Operational access only. The shape constraint rejects anything wider.
  INSERT INTO public.family_members (family_id, profile_id, role, permissions)
  VALUES (
    target_family,
    auth.uid(),
    'caregiver',
    '{"care_logs": ["read", "write"], "shift_handovers": ["read", "write"]}'::jsonb
  )
  ON CONFLICT (family_id, profile_id) DO UPDATE SET role = 'caregiver';

  INSERT INTO public.parents (parent_id, display_name, role)
  VALUES (auth.uid(), COALESCE(NULLIF(trim(_display_name), ''), 'Caregiver'), 'caregiver')
  ON CONFLICT (parent_id) DO UPDATE
    SET display_name = COALESCE(NULLIF(trim(_display_name), ''), public.parents.display_name),
        role = 'caregiver';

  RETURN target_family;
END;
$$;


-- =============================================================================
-- 4. care_logs — operational, family-scoped
-- =============================================================================

ALTER TABLE public.care_logs ADD COLUMN IF NOT EXISTS family_id uuid;
ALTER TABLE public.care_logs ADD COLUMN IF NOT EXISTS content   text;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'care_logs' AND column_name = 'logged_by'
  ) THEN
    ALTER TABLE public.care_logs RENAME COLUMN logged_by TO created_by;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'care_logs' AND column_name = 'payload'
  ) THEN
    ALTER TABLE public.care_logs RENAME COLUMN payload TO operational_metrics;
  END IF;
END $$;

-- family_id is derivable for every existing row: babies.parent_id is the family.
UPDATE public.care_logs c
SET family_id = b.parent_id
FROM public.babies b
WHERE b.id = c.baby_id AND c.family_id IS NULL;

UPDATE public.care_logs
SET content = COALESCE(operational_metrics ->> 'note', operational_metrics ->> 'notes')
WHERE content IS NULL;

ALTER TABLE public.care_logs ALTER COLUMN family_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS care_logs_family_time_idx
  ON public.care_logs (family_id, "timestamp" DESC);

COMMENT ON COLUMN public.care_logs.operational_metrics IS
  'Shift-floor detail only (ounces, diaper condition, sleep minutes). Maternal '
  'wellness data belongs in private_checkins and must never be written here.';

-- Derive family_id and content server-side so a client cannot file a log
-- against a family it does not belong to by simply posting a different id.
CREATE OR REPLACE FUNCTION public.care_logs_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  SELECT b.parent_id INTO NEW.family_id
  FROM public.babies b
  WHERE b.id = NEW.baby_id;

  IF NEW.family_id IS NULL THEN
    RAISE EXCEPTION 'care_logs.baby_id % does not resolve to a family', NEW.baby_id;
  END IF;

  NEW.content := COALESCE(
    NEW.content,
    NEW.operational_metrics ->> 'note',
    NEW.operational_metrics ->> 'notes'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS care_logs_before_write ON public.care_logs;
CREATE TRIGGER care_logs_before_write
  BEFORE INSERT OR UPDATE ON public.care_logs
  FOR EACH ROW EXECUTE FUNCTION public.care_logs_before_write();

REVOKE ALL ON public.care_logs FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.care_logs TO authenticated;
GRANT ALL ON public.care_logs TO service_role;

ALTER TABLE public.care_logs ENABLE ROW LEVEL SECURITY;

-- Replace the baby-scoped policy set with one permission-driven set per verb.
DROP POLICY IF EXISTS care_logs_select_related    ON public.care_logs;
DROP POLICY IF EXISTS care_logs_insert_related    ON public.care_logs;
DROP POLICY IF EXISTS care_logs_update_own        ON public.care_logs;
DROP POLICY IF EXISTS care_logs_delete_own        ON public.care_logs;
DROP POLICY IF EXISTS care_logs_select_caregiver  ON public.care_logs;
DROP POLICY IF EXISTS care_logs_insert_caregiver  ON public.care_logs;
DROP POLICY IF EXISTS care_logs_update_caregiver  ON public.care_logs;
DROP POLICY IF EXISTS care_logs_delete_caregiver  ON public.care_logs;
DROP POLICY IF EXISTS care_logs_read              ON public.care_logs;
DROP POLICY IF EXISTS care_logs_insert            ON public.care_logs;
DROP POLICY IF EXISTS care_logs_update            ON public.care_logs;
DROP POLICY IF EXISTS care_logs_delete            ON public.care_logs;

-- READ: anyone holding a 'read' grant on care_logs for this family.
CREATE POLICY care_logs_read ON public.care_logs
  FOR SELECT TO authenticated
  USING (public.has_family_permission(family_id, 'care_logs', 'read'));

-- WRITE: a 'write' grant, and you may only file logs under your own name.
CREATE POLICY care_logs_insert ON public.care_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND public.has_family_permission(family_id, 'care_logs', 'write')
  );

-- Caregivers may correct their own entries; the owning parent may correct any
-- entry in their family. WITH CHECK re-runs on the new row so an update cannot
-- move a log into a different family.
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
-- 5. shift_handovers — operational, family-scoped
-- =============================================================================

ALTER TABLE public.shift_handovers ADD COLUMN IF NOT EXISTS family_id uuid;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shift_handovers' AND column_name = 'caregiver_notes'
  ) THEN
    ALTER TABLE public.shift_handovers RENAME COLUMN caregiver_notes TO notes;
  END IF;
END $$;

UPDATE public.shift_handovers s
SET family_id = b.parent_id
FROM public.babies b
WHERE b.id = s.baby_id AND s.family_id IS NULL;

ALTER TABLE public.shift_handovers ALTER COLUMN family_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS shift_handovers_family_idx
  ON public.shift_handovers (family_id, shift_end DESC);

CREATE OR REPLACE FUNCTION public.shift_handovers_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  SELECT b.parent_id INTO NEW.family_id
  FROM public.babies b
  WHERE b.id = NEW.baby_id;

  IF NEW.family_id IS NULL THEN
    RAISE EXCEPTION 'shift_handovers.baby_id % does not resolve to a family', NEW.baby_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shift_handovers_before_write ON public.shift_handovers;
CREATE TRIGGER shift_handovers_before_write
  BEFORE INSERT OR UPDATE ON public.shift_handovers
  FOR EACH ROW EXECUTE FUNCTION public.shift_handovers_before_write();

REVOKE ALL ON public.shift_handovers FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_handovers TO authenticated;
GRANT ALL ON public.shift_handovers TO service_role;

ALTER TABLE public.shift_handovers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shift_handovers_select_related   ON public.shift_handovers;
DROP POLICY IF EXISTS shift_handovers_insert_related   ON public.shift_handovers;
DROP POLICY IF EXISTS shift_handovers_update_own       ON public.shift_handovers;
DROP POLICY IF EXISTS shift_handovers_delete_own       ON public.shift_handovers;
DROP POLICY IF EXISTS shift_handovers_select_caregiver ON public.shift_handovers;
DROP POLICY IF EXISTS shift_handovers_insert_caregiver ON public.shift_handovers;
DROP POLICY IF EXISTS shift_handovers_update_caregiver ON public.shift_handovers;
DROP POLICY IF EXISTS shift_handovers_read            ON public.shift_handovers;
DROP POLICY IF EXISTS shift_handovers_insert          ON public.shift_handovers;
DROP POLICY IF EXISTS shift_handovers_update          ON public.shift_handovers;
DROP POLICY IF EXISTS shift_handovers_delete          ON public.shift_handovers;

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
-- 6. private_checkins — absolute isolation
-- =============================================================================

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
-- grant in place would let any server-side key read this table straight past
-- the policies below. Only the database owner can now reach it.
REVOKE ALL ON public.private_checkins FROM PUBLIC, anon, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.private_checkins TO authenticated;

ALTER TABLE public.private_checkins ENABLE ROW LEVEL SECURITY;
-- FORCE subjects the table owner to the policies too, closing the last
-- in-database path that would otherwise skip them.
ALTER TABLE public.private_checkins FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS private_checkins_select ON public.private_checkins;
DROP POLICY IF EXISTS private_checkins_insert ON public.private_checkins;
DROP POLICY IF EXISTS private_checkins_update ON public.private_checkins;
DROP POLICY IF EXISTS private_checkins_delete ON public.private_checkins;
DROP POLICY IF EXISTS private_checkins_isolation ON public.private_checkins;

-- One permissive policy per verb, each with the identical owner test. Written
-- out separately rather than as FOR ALL so a future migration cannot widen one
-- verb by accident without the change being visible in the diff.
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
-- permissive ones, so this cannot be satisfied by adding another policy later:
-- any future permissive grant to caregivers still has to pass this test, and a
-- caregiver is by definition not the parent_id on the row.
CREATE POLICY private_checkins_isolation ON public.private_checkins
  AS RESTRICTIVE FOR ALL TO public
  USING (parent_id = (SELECT auth.uid()))
  WITH CHECK (parent_id = (SELECT auth.uid()));


-- =============================================================================
-- 7. epds_screenings — absolute isolation
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

-- Partial index: the emergency set is tiny and is the only one ever scanned
-- without a parent_id, by the owner-level escalation job.
CREATE INDEX IF NOT EXISTS epds_screenings_emergency_idx
  ON public.epds_screenings (created_at DESC)
  WHERE q10_emergency_state;

COMMENT ON COLUMN public.epds_screenings.q10_emergency_state IS
  'Item 10 — self-harm ideation. Derived server-side from `scores`; a client '
  'cannot suppress the flag by posting false alongside a non-zero q10.';

-- total_score and q10_emergency_state are recomputed from `scores` whenever the
-- full instrument is present, so the two fields that drive escalation can never
-- disagree with the answers they summarise.
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

-- Same reasoning as private_checkins: service_role would bypass RLS.
REVOKE ALL ON public.epds_screenings FROM PUBLIC, anon, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.epds_screenings TO authenticated;

ALTER TABLE public.epds_screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epds_screenings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS epds_screenings_select ON public.epds_screenings;
DROP POLICY IF EXISTS epds_screenings_insert ON public.epds_screenings;
DROP POLICY IF EXISTS epds_screenings_update ON public.epds_screenings;
DROP POLICY IF EXISTS epds_screenings_delete ON public.epds_screenings;
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
-- 8. Function lockdown
-- =============================================================================
-- Postgres grants EXECUTE to PUBLIC on every new function, and in Supabase
-- PUBLIC includes anon. Sweep the whole schema rather than naming functions, so
-- anything added later is closed by default too.

DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn.signature);
  END LOOP;
END $$;

-- Close the default for functions created after this migration.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Trigger-only functions stay unreachable: PostgREST must never expose them,
-- and the trigger itself executes as the definer regardless of the caller.
REVOKE ALL ON FUNCTION public.handle_new_user()                FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at()                 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_epds_responses_complete()  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_profile_from_parent()       FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.care_logs_before_write()         FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.shift_handovers_before_write()   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.epds_screenings_before_write()   FROM PUBLIC, anon, authenticated;

-- The only three callables, and signed-in sessions only.
GRANT EXECUTE ON FUNCTION public.generate_family_invite()                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_family_invite(text, text)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_family_caregiver(uuid)                   TO authenticated;

-- Predicates. These grants are load-bearing, not decorative: Postgres checks
-- EXECUTE against the *invoking* user even when the call sits inside an RLS
-- policy or a CHECK constraint. Revoke either one and every read of care_logs,
-- or every write to family_members, fails with "permission denied for
-- function". Neither discloses anything on a direct call — they only answer
-- questions about the caller's own identity.
REVOKE ALL ON FUNCTION public.has_family_permission(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_valid_member_permissions(jsonb)      FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_family_permission(uuid, text, text)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_valid_member_permissions(jsonb)         TO authenticated, service_role;
