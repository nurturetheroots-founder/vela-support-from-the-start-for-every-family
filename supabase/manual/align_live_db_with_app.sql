-- =============================================================================
-- Vela — bring the live database up to what the app already expects
-- =============================================================================
-- The deployed frontend queries eleven tables. The live Nurture The Roots
-- database has two of them. This script creates the missing nine, in exactly
-- the shape the frontend queries, and applies the Layer 2 isolation rules on
-- top. The frontend needs no changes.
--
-- PURELY ADDITIVE. It does not touch, rename, or drop:
--   profiles (except to add one column), families, checkins, check_ins,
--   review_queue, or any function this script did not create.
--
-- Supersedes supabase/manual/layer2_live_schema.sql — do not run both. That
-- one created care_logs without baby_id, which the frontend requires.
--
-- Idempotent: safe to replay.
-- =============================================================================


-- =============================================================================
-- 0. Guards and shared types
-- =============================================================================

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NULL THEN
    RAISE EXCEPTION 'public.profiles not found — wrong database.';
  END IF;

  IF to_regclass('public.checkins') IS NULL THEN
    RAISE EXCEPTION
      'public.checkins not found. Section 11 locks it down; if it is absent '
      'here, this is not the database you inspected.';
  END IF;
END $$;

-- Checked here, before a single object is created, so the refusal is genuinely
-- free of side effects even when this file is not run inside a transaction.
-- Section 11 puts checkins under FORCE row level security, which applies to the
-- table owner too: a row with no user_id would become unreadable by everyone,
-- permanently and silently.
DO $$
DECLARE orphaned bigint;
BEGIN
  SELECT count(*) INTO orphaned FROM public.checkins WHERE user_id IS NULL;
  IF orphaned > 0 THEN
    RAISE EXCEPTION
      'checkins holds % row(s) with a NULL user_id. Locking the table down '
      'would make them unreadable by everyone, the table owner included. '
      'Inspect them with:  SELECT * FROM public.checkins WHERE user_id IS '
      'NULL;  then assign an owner or delete them, and re-run. Nothing has '
      'been created or altered.', orphaned;
  END IF;
END $$;

DO $$ BEGIN CREATE TYPE public.member_role AS ENUM ('parent','caregiver');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.care_event_type AS ENUM ('feed','diaper','sleep','observation');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.shift_handover_status AS ENUM ('draft','published');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Created only if absent. Another application may own a function of this name,
-- and silently replacing it could change that app's behaviour.
DO $$
BEGIN
  IF to_regprocedure('public.set_updated_at()') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.set_updated_at() RETURNS trigger
      LANGUAGE plpgsql SET search_path = public, pg_temp AS $body$
      BEGIN NEW.updated_at = now(); RETURN NEW; END; $body$;
    $fn$;
  END IF;
END $$;


-- =============================================================================
-- 1. profiles — one added column, nothing else disturbed
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role public.member_role NOT NULL DEFAULT 'parent';

CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles (role);


-- =============================================================================
-- 2. parents — the onboarding record the app reads and upserts
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.parents (
  parent_id    uuid PRIMARY KEY,
  display_name text NOT NULL DEFAULT '',
  stage        text CHECK (stage IN ('expecting','postpartum')),
  due_date     date,
  birth_date   date,
  focuses      text[] NOT NULL DEFAULT '{}',
  zip          text,
  insurance    text,
  consented_at timestamptz,
  role         public.member_role NOT NULL DEFAULT 'parent',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Carry across what profiles already knows, so existing testers do not lose
-- their name or dates. consented_at is deliberately left NULL: consent should
-- be given explicitly, not inferred, so they will be asked once more.
--
-- The date columns on profiles are read at whatever type they actually are.
-- This database stores dates as text in places (checkins.date is text), and a
-- straight INSERT of text into parents.due_date fails with 42804. Rather than
-- assume either way, the expression is chosen from the live column type, and a
-- text value that is not an ISO date carries across as NULL instead of raising.
DO $$
DECLARE
  due_type   text;
  birth_type text;
  due_expr   text;
  birth_expr text;
BEGIN
  SELECT data_type INTO due_type FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'due_date';
  SELECT data_type INTO birth_type FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'baby_birthday';

  due_expr := CASE
    WHEN due_type IS NULL             THEN 'NULL::date'
    WHEN due_type = 'date'            THEN 'p.due_date'
    WHEN due_type LIKE 'timestamp%'   THEN 'p.due_date::date'
    ELSE 'CASE WHEN p.due_date ~ ''^\d{4}-\d{2}-\d{2}'' THEN left(p.due_date, 10)::date END'
  END;

  birth_expr := CASE
    WHEN birth_type IS NULL           THEN 'NULL::date'
    WHEN birth_type = 'date'          THEN 'p.baby_birthday'
    WHEN birth_type LIKE 'timestamp%' THEN 'p.baby_birthday::date'
    ELSE 'CASE WHEN p.baby_birthday ~ ''^\d{4}-\d{2}-\d{2}'' THEN left(p.baby_birthday, 10)::date END'
  END;

  EXECUTE format(
    'INSERT INTO public.parents (parent_id, display_name, due_date, birth_date)
     SELECT p.id, COALESCE(p.name::text, %L), %s, %s
     FROM public.profiles p
     ON CONFLICT (parent_id) DO NOTHING',
    '', due_expr, birth_expr);
END $$;

DROP TRIGGER IF EXISTS parents_set_updated_at ON public.parents;
CREATE TRIGGER parents_set_updated_at
  BEFORE UPDATE ON public.parents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Revoking from `authenticated` too, not just PUBLIC and anon: Supabase's
-- default privileges grant ALL on every new table in public, so a revoke that
-- omits authenticated leaves it holding INSERT/UPDATE/DELETE. RLS would still
-- block the write, but silently, as a zero-row no-op rather than a refusal.
REVOKE ALL ON public.parents FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parents TO authenticated;
GRANT ALL ON public.parents TO service_role;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS parents_own ON public.parents;
CREATE POLICY parents_own ON public.parents
  FOR ALL TO authenticated
  USING (parent_id = (SELECT auth.uid()))
  WITH CHECK (parent_id = (SELECT auth.uid()));


-- =============================================================================
-- 3. parent_daily_checkins — note the unique key the app's upsert relies on
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.parent_daily_checkins (
  checkin_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id             uuid NOT NULL REFERENCES public.parents(parent_id) ON DELETE CASCADE,
  mood_score            integer CHECK (mood_score BETWEEN 1 AND 5),
  sleep_quality         varchar(10) CHECK (sleep_quality IN ('poor','fair','good')),
  feeding_status        varchar(20) CHECK (feeding_status IN ('struggling','okay','going well')),
  overall_score         integer CHECK (overall_score BETWEEN 1 AND 5),
  parent_health_notes   text CHECK (parent_health_notes IS NULL OR char_length(parent_health_notes) <= 500),
  requires_support_flag boolean NOT NULL DEFAULT false,
  logged_date           date NOT NULL DEFAULT CURRENT_DATE,
  created_at            timestamptz NOT NULL DEFAULT now(),
  -- saveCheckin() upserts with onConflict "parent_id,logged_date"; without this
  -- constraint that call fails at runtime.
  CONSTRAINT one_checkin_per_parent_per_day UNIQUE (parent_id, logged_date)
);

CREATE INDEX IF NOT EXISTS parent_daily_checkins_parent_date_idx
  ON public.parent_daily_checkins (parent_id, logged_date DESC);

REVOKE ALL ON public.parent_daily_checkins FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parent_daily_checkins TO authenticated;
GRANT ALL ON public.parent_daily_checkins TO service_role;
ALTER TABLE public.parent_daily_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS parent_daily_checkins_own ON public.parent_daily_checkins;
CREATE POLICY parent_daily_checkins_own ON public.parent_daily_checkins
  FOR ALL TO authenticated
  USING (parent_id = (SELECT auth.uid()))
  WITH CHECK (parent_id = (SELECT auth.uid()));


-- =============================================================================
-- 4. babies
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.babies (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id  uuid NOT NULL DEFAULT auth.uid(),
  name       text NOT NULL DEFAULT 'Baby',
  birth_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS babies_parent_idx ON public.babies (parent_id, created_at);

REVOKE ALL ON public.babies FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.babies TO authenticated;
GRANT ALL ON public.babies TO service_role;
ALTER TABLE public.babies ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 5. family_members and invites — the delegation surface
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.family_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   uuid NOT NULL,
  profile_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role        public.member_role NOT NULL DEFAULT 'caregiver',
  permissions jsonb NOT NULL DEFAULT
    '{"care_logs": ["read","write"], "shift_handovers": ["read","write"]}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_id, profile_id)
);

CREATE INDEX IF NOT EXISTS family_members_profile_family_idx
  ON public.family_members (profile_id, family_id);

COMMENT ON COLUMN public.family_members.permissions IS
  'Structured grant map. Only operational resources may appear — the shape '
  'constraint makes it impossible to delegate private_checkins or epds_screenings.';

CREATE OR REPLACE FUNCTION public.is_valid_member_permissions(_permissions jsonb)
RETURNS boolean LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path = public, pg_temp AS $$
  SELECT jsonb_typeof(_permissions) = 'object'
     AND NOT EXISTS (
       SELECT 1 FROM jsonb_each(_permissions) AS entry(resource, actions)
       WHERE entry.resource NOT IN ('care_logs','shift_handovers')
          OR jsonb_typeof(entry.actions) <> 'array'
          OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(entry.actions) AS g(action)
                     WHERE g.action NOT IN ('read','write'))
     );
$$;

DO $$ BEGIN
  ALTER TABLE public.family_members ADD CONSTRAINT family_members_permissions_shape
    CHECK (public.is_valid_member_permissions(permissions));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

REVOKE ALL ON public.family_members FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.family_members TO authenticated;
GRANT ALL ON public.family_members TO service_role;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS family_members_select_related ON public.family_members;
CREATE POLICY family_members_select_related ON public.family_members
  FOR SELECT TO authenticated
  USING (profile_id = (SELECT auth.uid()) OR family_id = (SELECT auth.uid()));

CREATE TABLE IF NOT EXISTS public.family_invites (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id  uuid NOT NULL,
  code       text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  revoked    boolean NOT NULL DEFAULT false
);

REVOKE ALL ON public.family_invites FROM PUBLIC, anon, authenticated;
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


-- =============================================================================
-- 6. Permission resolution
-- =============================================================================
-- SECURITY DEFINER on purpose: the care_logs policies read family_members,
-- which carries its own RLS. As the invoker that recurses.
CREATE OR REPLACE FUNCTION public.has_family_permission(
  _family_id uuid, _resource text, _action text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT _family_id IS NOT NULL
     AND auth.uid() IS NOT NULL
     AND _resource IN ('care_logs','shift_handovers')
     AND (_family_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.family_members m
                     WHERE m.profile_id = auth.uid()
                       AND m.family_id = _family_id
                       AND m.permissions -> _resource ? _action));
$$;

CREATE OR REPLACE FUNCTION public.is_family_caregiver(_family_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM public.family_members m
                 WHERE m.profile_id = auth.uid()
                   AND m.family_id = _family_id
                   AND m.role = 'caregiver');
$$;

-- babies policies depend on is_family_caregiver, so they come after it.
DROP POLICY IF EXISTS babies_select_own       ON public.babies;
DROP POLICY IF EXISTS babies_insert_own       ON public.babies;
DROP POLICY IF EXISTS babies_update_own       ON public.babies;
DROP POLICY IF EXISTS babies_delete_own       ON public.babies;
DROP POLICY IF EXISTS babies_select_caregiver ON public.babies;
DROP POLICY IF EXISTS babies_insert_caregiver ON public.babies;

CREATE POLICY babies_select_own ON public.babies
  FOR SELECT TO authenticated USING (parent_id = (SELECT auth.uid()));
CREATE POLICY babies_insert_own ON public.babies
  FOR INSERT TO authenticated WITH CHECK (parent_id = (SELECT auth.uid()));
CREATE POLICY babies_update_own ON public.babies
  FOR UPDATE TO authenticated USING (parent_id = (SELECT auth.uid()))
  WITH CHECK (parent_id = (SELECT auth.uid()));
CREATE POLICY babies_delete_own ON public.babies
  FOR DELETE TO authenticated USING (parent_id = (SELECT auth.uid()));
-- An invited caregiver works inside the family that invited them.
CREATE POLICY babies_select_caregiver ON public.babies
  FOR SELECT TO authenticated USING (public.is_family_caregiver(parent_id));
CREATE POLICY babies_insert_caregiver ON public.babies
  FOR INSERT TO authenticated WITH CHECK (public.is_family_caregiver(parent_id));

CREATE OR REPLACE FUNCTION public.generate_family_invite()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE new_code text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  LOOP
    new_code := upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.family_invites i WHERE i.code = new_code);
  END LOOP;
  INSERT INTO public.family_invites (family_id, code) VALUES (auth.uid(), new_code);
  RETURN new_code;
END; $$;

CREATE OR REPLACE FUNCTION public.redeem_family_invite(_code text, _display_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE target_family uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;

  SELECT i.family_id INTO target_family FROM public.family_invites i
  WHERE i.code = upper(trim(_code)) AND i.revoked = false AND i.expires_at > now()
  LIMIT 1;

  IF target_family IS NULL THEN RAISE EXCEPTION 'That invite code is not valid.'; END IF;
  IF target_family = auth.uid() THEN RAISE EXCEPTION 'That invite belongs to your own family.'; END IF;

  UPDATE public.profiles SET role = 'caregiver' WHERE id = auth.uid();

  INSERT INTO public.family_members (family_id, profile_id, role, permissions)
  VALUES (target_family, auth.uid(), 'caregiver',
          '{"care_logs":["read","write"],"shift_handovers":["read","write"]}'::jsonb)
  ON CONFLICT (family_id, profile_id) DO UPDATE SET role = 'caregiver';

  INSERT INTO public.parents (parent_id, display_name, role)
  VALUES (auth.uid(), COALESCE(NULLIF(trim(_display_name),''),'Caregiver'), 'caregiver')
  ON CONFLICT (parent_id) DO UPDATE
    SET display_name = COALESCE(NULLIF(trim(_display_name),''), public.parents.display_name),
        role = 'caregiver';

  RETURN target_family;
END; $$;


-- =============================================================================
-- 7. care_logs and shift_handovers — the shape the frontend queries
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.care_logs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id             uuid NOT NULL REFERENCES public.babies(id) ON DELETE CASCADE,
  family_id           uuid NOT NULL,
  created_by          uuid NOT NULL DEFAULT auth.uid(),
  "timestamp"         timestamptz NOT NULL DEFAULT now(),
  event_type          public.care_event_type NOT NULL,
  operational_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  content             text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS care_logs_baby_time_idx ON public.care_logs (baby_id, "timestamp" DESC);
CREATE INDEX IF NOT EXISTS care_logs_family_time_idx ON public.care_logs (family_id, "timestamp" DESC);

COMMENT ON COLUMN public.care_logs.operational_metrics IS
  'Shift-floor detail only. Maternal wellness data belongs in private_checkins.';

-- family_id is derived server-side so a client cannot file a log against a
-- family it does not belong to by posting a different id.
CREATE OR REPLACE FUNCTION public.care_logs_before_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  -- Authorship is fixed at insert. An RLS WITH CHECK cannot see OLD, so
  -- without this a caregiver with write access could update their own row and
  -- reassign created_by to someone else — falsifying who logged a care event.
  IF TG_OP = 'UPDATE' THEN
    NEW.created_by := OLD.created_by;
  END IF;

  SELECT b.parent_id INTO NEW.family_id FROM public.babies b WHERE b.id = NEW.baby_id;
  IF NEW.family_id IS NULL THEN
    RAISE EXCEPTION 'care_logs.baby_id % does not resolve to a family', NEW.baby_id;
  END IF;

  -- content mirrors the note on operational_metrics. updateCareLog() patches
  -- only operational_metrics, so COALESCE onto the existing content would pin
  -- it to the first note ever written; re-derive unless content was set
  -- explicitly in this same statement.
  IF TG_OP = 'UPDATE' AND NEW.content IS NOT DISTINCT FROM OLD.content THEN
    NEW.content := COALESCE(NEW.operational_metrics ->> 'note',
                            NEW.operational_metrics ->> 'notes');
  ELSE
    NEW.content := COALESCE(NEW.content,
                            NEW.operational_metrics ->> 'note',
                            NEW.operational_metrics ->> 'notes');
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS care_logs_before_write ON public.care_logs;
CREATE TRIGGER care_logs_before_write BEFORE INSERT OR UPDATE ON public.care_logs
  FOR EACH ROW EXECUTE FUNCTION public.care_logs_before_write();

REVOKE ALL ON public.care_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.care_logs TO authenticated;
GRANT ALL ON public.care_logs TO service_role;
ALTER TABLE public.care_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS care_logs_read   ON public.care_logs;
DROP POLICY IF EXISTS care_logs_insert ON public.care_logs;
DROP POLICY IF EXISTS care_logs_update ON public.care_logs;
DROP POLICY IF EXISTS care_logs_delete ON public.care_logs;

CREATE POLICY care_logs_read ON public.care_logs
  FOR SELECT TO authenticated
  USING (public.has_family_permission(family_id,'care_logs','read'));
CREATE POLICY care_logs_insert ON public.care_logs
  FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid())
              AND public.has_family_permission(family_id,'care_logs','write'));
CREATE POLICY care_logs_update ON public.care_logs
  FOR UPDATE TO authenticated
  USING (public.has_family_permission(family_id,'care_logs','write')
         AND (created_by = (SELECT auth.uid()) OR family_id = (SELECT auth.uid())))
  WITH CHECK (public.has_family_permission(family_id,'care_logs','write'));
CREATE POLICY care_logs_delete ON public.care_logs
  FOR DELETE TO authenticated
  USING (public.has_family_permission(family_id,'care_logs','write')
         AND (created_by = (SELECT auth.uid()) OR family_id = (SELECT auth.uid())));

CREATE TABLE IF NOT EXISTS public.shift_handovers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id         uuid NOT NULL REFERENCES public.babies(id) ON DELETE CASCADE,
  family_id       uuid NOT NULL,
  caregiver_id    uuid NOT NULL DEFAULT auth.uid(),
  shift_start     timestamptz NOT NULL,
  shift_end       timestamptz NOT NULL,
  summary_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes           text,
  status          public.shift_handover_status NOT NULL DEFAULT 'draft',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shift_handovers_baby_idx ON public.shift_handovers (baby_id, shift_end DESC);

CREATE OR REPLACE FUNCTION public.shift_handovers_before_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  -- Same reasoning as care_logs: an update must not reassign the caregiver.
  IF TG_OP = 'UPDATE' THEN
    NEW.caregiver_id := OLD.caregiver_id;
  END IF;

  SELECT b.parent_id INTO NEW.family_id FROM public.babies b WHERE b.id = NEW.baby_id;
  IF NEW.family_id IS NULL THEN
    RAISE EXCEPTION 'shift_handovers.baby_id % does not resolve to a family', NEW.baby_id;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS shift_handovers_before_write ON public.shift_handovers;
CREATE TRIGGER shift_handovers_before_write BEFORE INSERT OR UPDATE ON public.shift_handovers
  FOR EACH ROW EXECUTE FUNCTION public.shift_handovers_before_write();

REVOKE ALL ON public.shift_handovers FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_handovers TO authenticated;
GRANT ALL ON public.shift_handovers TO service_role;
ALTER TABLE public.shift_handovers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shift_handovers_read   ON public.shift_handovers;
DROP POLICY IF EXISTS shift_handovers_insert ON public.shift_handovers;
DROP POLICY IF EXISTS shift_handovers_update ON public.shift_handovers;
DROP POLICY IF EXISTS shift_handovers_delete ON public.shift_handovers;

CREATE POLICY shift_handovers_read ON public.shift_handovers
  FOR SELECT TO authenticated
  USING (public.has_family_permission(family_id,'shift_handovers','read'));
CREATE POLICY shift_handovers_insert ON public.shift_handovers
  FOR INSERT TO authenticated
  WITH CHECK (caregiver_id = (SELECT auth.uid())
              AND public.has_family_permission(family_id,'shift_handovers','write'));
CREATE POLICY shift_handovers_update ON public.shift_handovers
  FOR UPDATE TO authenticated
  USING (public.has_family_permission(family_id,'shift_handovers','write')
         AND (caregiver_id = (SELECT auth.uid()) OR family_id = (SELECT auth.uid())))
  WITH CHECK (public.has_family_permission(family_id,'shift_handovers','write'));
CREATE POLICY shift_handovers_delete ON public.shift_handovers
  FOR DELETE TO authenticated
  USING (public.has_family_permission(family_id,'shift_handovers','write')
         AND (caregiver_id = (SELECT auth.uid()) OR family_id = (SELECT auth.uid())));


-- =============================================================================
-- 8. escalations, derived_signals, epds_administrations — alerts and screening
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.escalations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id     uuid NOT NULL DEFAULT auth.uid(),
  triggered_at  timestamptz NOT NULL DEFAULT now(),
  trigger_type  text NOT NULL,
  trigger_detail text,
  status        text NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved')),
  resolved_at   timestamptz
);
CREATE INDEX IF NOT EXISTS escalations_family_idx ON public.escalations (family_id, triggered_at DESC);
REVOKE ALL ON public.escalations FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.escalations TO authenticated;
GRANT ALL ON public.escalations TO service_role;
ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS escalations_own ON public.escalations;
CREATE POLICY escalations_own ON public.escalations
  FOR ALL TO authenticated
  USING (family_id = (SELECT auth.uid())) WITH CHECK (family_id = (SELECT auth.uid()));

CREATE TABLE IF NOT EXISTS public.derived_signals (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id    uuid NOT NULL DEFAULT auth.uid(),
  signal_type  text NOT NULL,
  computed_at  timestamptz NOT NULL DEFAULT now(),
  rule_version text NOT NULL
);
CREATE INDEX IF NOT EXISTS derived_signals_family_idx ON public.derived_signals (family_id, computed_at DESC);
REVOKE ALL ON public.derived_signals FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.derived_signals TO authenticated;
GRANT ALL ON public.derived_signals TO service_role;
ALTER TABLE public.derived_signals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS derived_signals_own ON public.derived_signals;
CREATE POLICY derived_signals_own ON public.derived_signals
  FOR ALL TO authenticated
  USING (family_id = (SELECT auth.uid())) WITH CHECK (family_id = (SELECT auth.uid()));

CREATE TABLE IF NOT EXISTS public.epds_administrations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id      uuid NOT NULL DEFAULT auth.uid(),
  administered_at timestamptz NOT NULL DEFAULT now(),
  local_date     date NOT NULL DEFAULT CURRENT_DATE,
  total_score    integer CHECK (total_score BETWEEN 0 AND 30),
  trigger_reason text CHECK (trigger_reason IN ('2wk','6wk','3mo','6mo'))
);
CREATE INDEX IF NOT EXISTS epds_admin_family_idx ON public.epds_administrations (family_id, local_date DESC);
REVOKE ALL ON public.epds_administrations FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.epds_administrations TO authenticated;
GRANT ALL ON public.epds_administrations TO service_role;
ALTER TABLE public.epds_administrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS epds_admin_own ON public.epds_administrations;
CREATE POLICY epds_admin_own ON public.epds_administrations
  FOR ALL TO authenticated
  USING (family_id = (SELECT auth.uid())) WITH CHECK (family_id = (SELECT auth.uid()));


-- =============================================================================
-- 9. beta_feedback — the in-app feedback tab
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.beta_feedback (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid,
  message    text NOT NULL,
  page_path  text,
  created_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON public.beta_feedback FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.beta_feedback TO authenticated;
GRANT INSERT ON public.beta_feedback TO anon;   -- a tester who is not signed in
GRANT ALL ON public.beta_feedback TO service_role;
ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS beta_feedback_insert_any ON public.beta_feedback;
DROP POLICY IF EXISTS beta_feedback_select_own ON public.beta_feedback;
CREATE POLICY beta_feedback_insert_any ON public.beta_feedback
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY beta_feedback_select_own ON public.beta_feedback
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));


-- =============================================================================
-- 10. private_checkins and epds_screenings — absolute isolation
-- =============================================================================
-- New tables. Not your existing `checkins` or `check_ins`, which are untouched.

CREATE TABLE IF NOT EXISTS public.private_checkins (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id        uuid NOT NULL DEFAULT auth.uid()
                     REFERENCES public.profiles(id) ON DELETE CASCADE,
  wellness_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT private_checkins_wellness_metrics_object
    CHECK (jsonb_typeof(wellness_metrics) = 'object')
);
CREATE INDEX IF NOT EXISTS private_checkins_parent_created_idx
  ON public.private_checkins (parent_id, created_at DESC);

COMMENT ON TABLE public.private_checkins IS
  'Maternal wellness. The owning parent alone. No caregiver role, permissions '
  'grant, or family membership reaches this table.';

-- service_role carries BYPASSRLS, so the grant is revoked outright.
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
  FOR SELECT TO authenticated USING (parent_id = (SELECT auth.uid()));
CREATE POLICY private_checkins_insert ON public.private_checkins
  FOR INSERT TO authenticated WITH CHECK (parent_id = (SELECT auth.uid()));
CREATE POLICY private_checkins_update ON public.private_checkins
  FOR UPDATE TO authenticated USING (parent_id = (SELECT auth.uid()))
  WITH CHECK (parent_id = (SELECT auth.uid()));
CREATE POLICY private_checkins_delete ON public.private_checkins
  FOR DELETE TO authenticated USING (parent_id = (SELECT auth.uid()));

-- RESTRICTIVE policies are ANDed with the permissive set, so a later migration
-- cannot widen access by adding a permissive policy alone.
CREATE POLICY private_checkins_isolation ON public.private_checkins
  AS RESTRICTIVE FOR ALL TO public
  USING (parent_id = (SELECT auth.uid()))
  WITH CHECK (parent_id = (SELECT auth.uid()));

CREATE TABLE IF NOT EXISTS public.epds_screenings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id           uuid NOT NULL DEFAULT auth.uid()
                        REFERENCES public.profiles(id) ON DELETE CASCADE,
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
  ON public.epds_screenings (created_at DESC) WHERE q10_emergency_state;

COMMENT ON COLUMN public.epds_screenings.q10_emergency_state IS
  'Item 10 — self-harm ideation. Derived server-side; a client cannot suppress '
  'the flag by posting false alongside a non-zero q10.';

CREATE OR REPLACE FUNCTION public.epds_screenings_before_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  answered integer := 0;
  summed   integer := 0;
  item10   integer;
  parsed   integer;
  item     text;
BEGIN
  -- Accept an item whether it arrives as a JSON number or a numeric string;
  -- anything else (null, 2.5, "n/a") parses to NULL and is simply not counted.
  FOREACH item IN ARRAY ARRAY['q1','q2','q3','q4','q5','q6','q7','q8','q9','q10'] LOOP
    parsed := CASE
      WHEN jsonb_typeof(NEW.scores -> item) IN ('number','string')
           AND btrim(NEW.scores ->> item) ~ '^-?\d+$'
      THEN btrim(NEW.scores ->> item)::integer
      ELSE NULL
    END;
    IF parsed IS NOT NULL THEN
      answered := answered + 1;
      summed   := summed + parsed;
      IF item = 'q10' THEN item10 := parsed; END IF;
    END IF;
  END LOOP;

  -- Item 10 is self-harm ideation, so its flag is derived whenever the item is
  -- present at all — NOT only when the whole instrument parses. Requiring all
  -- ten let a client suppress the flag by omitting one other item, or by
  -- sending the scores as strings. The flag is also never downgraded: a client
  -- that sets it true keeps it true.
  IF item10 IS NOT NULL THEN
    NEW.q10_emergency_state := (item10 > 0) OR COALESCE(NEW.q10_emergency_state, false);
  END IF;

  -- The total is only meaningful once every item has parsed.
  IF answered = 10 THEN
    NEW.total_score := summed;
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS epds_screenings_before_write ON public.epds_screenings;
CREATE TRIGGER epds_screenings_before_write BEFORE INSERT OR UPDATE ON public.epds_screenings
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
  FOR SELECT TO authenticated USING (parent_id = (SELECT auth.uid()));
CREATE POLICY epds_screenings_insert ON public.epds_screenings
  FOR INSERT TO authenticated WITH CHECK (parent_id = (SELECT auth.uid()));
CREATE POLICY epds_screenings_update ON public.epds_screenings
  FOR UPDATE TO authenticated USING (parent_id = (SELECT auth.uid()))
  WITH CHECK (parent_id = (SELECT auth.uid()));
CREATE POLICY epds_screenings_delete ON public.epds_screenings
  FOR DELETE TO authenticated USING (parent_id = (SELECT auth.uid()));
CREATE POLICY epds_screenings_isolation ON public.epds_screenings
  AS RESTRICTIVE FOR ALL TO public
  USING (parent_id = (SELECT auth.uid()))
  WITH CHECK (parent_id = (SELECT auth.uid()));


-- =============================================================================
-- 11. checkins — absolute isolation for wellness data that already exists
-- =============================================================================
-- Columns: id (uuid), user_id (uuid), date (text), mood (integer), energy (integer).
-- Mood and energy per person per day is maternal wellness data, so it gets the
-- same treatment as private_checkins.
--
-- This table differs from every other one here in one way that matters: it is
-- already live and already holds rows. Two consequences, stated plainly:
--
--   * FORCE row level security applies to the table owner as well. Any row
--     whose user_id is NULL becomes unreadable by everyone, permanently and
--     silently. The guard below refuses to run rather than orphan such rows.
--   * Revoking service_role is the point of the exercise, but it takes effect
--     immediately. If any server-side job, Edge Function, or admin script
--     writes to checkins with the service_role key, it stops working the
--     moment this runs.
--
-- Existing policies are left alone rather than dropped, because another
-- application owns this table and its policies may be load-bearing. They do
-- not weaken the guarantee: the RESTRICTIVE policy at the end of this section
-- is ANDed with every permissive policy, so even a pre-existing USING (true)
-- cannot grant access to someone else's row.

CREATE INDEX IF NOT EXISTS checkins_user_date_idx ON public.checkins (user_id, date DESC);

COMMENT ON TABLE public.checkins IS
  'Maternal wellness (mood, energy). Readable and writable by the owning user '
  'alone. No caregiver role, permissions grant, or family membership reaches '
  'this table, and service_role is revoked because it carries BYPASSRLS.';

-- service_role carries BYPASSRLS, so the policies below are invisible to it.
-- Table privileges are checked separately from RLS, so the grant is revoked.
REVOKE ALL ON public.checkins FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkins TO authenticated;

ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS checkins_layer2_select    ON public.checkins;
DROP POLICY IF EXISTS checkins_layer2_insert    ON public.checkins;
DROP POLICY IF EXISTS checkins_layer2_update    ON public.checkins;
DROP POLICY IF EXISTS checkins_layer2_delete    ON public.checkins;
DROP POLICY IF EXISTS checkins_layer2_isolation ON public.checkins;

-- One permissive policy per verb, each with the identical owner test, written
-- out separately so a future migration cannot widen one verb without the
-- change being visible in the diff.
CREATE POLICY checkins_layer2_select ON public.checkins
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY checkins_layer2_insert ON public.checkins
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY checkins_layer2_update ON public.checkins
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY checkins_layer2_delete ON public.checkins
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- The isolation block. RESTRICTIVE policies are ANDed with the OR-ed set of
-- permissive ones, so this cannot be satisfied by adding another policy later,
-- and it clamps any permissive policy that already exists on this table.
CREATE POLICY checkins_layer2_isolation ON public.checkins
  AS RESTRICTIVE FOR ALL TO public
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));


-- =============================================================================
-- 12. Function lockdown — scoped to this script's own functions
-- =============================================================================
-- Not a schema-wide sweep: another application's functions live in this public
-- schema and a blanket revoke would strip their anon EXECUTE too.

REVOKE ALL ON FUNCTION public.care_logs_before_write()       FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.shift_handovers_before_write() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.epds_screenings_before_write() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.has_family_permission(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_valid_member_permissions(jsonb)      FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_family_caregiver(uuid)               FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.generate_family_invite()                FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.redeem_family_invite(text, text)        FROM PUBLIC, anon;

-- These two grants are load-bearing: Postgres checks EXECUTE against the
-- invoking user even inside an RLS policy or a CHECK constraint.
GRANT EXECUTE ON FUNCTION public.has_family_permission(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_valid_member_permissions(jsonb)      TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_family_caregiver(uuid)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_family_invite()                TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_family_invite(text, text)        TO authenticated;
