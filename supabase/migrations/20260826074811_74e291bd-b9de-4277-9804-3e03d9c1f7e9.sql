-- FAMILIES
CREATE TABLE public.families (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  email text,
  due_or_birth_date date,
  timezone text NOT NULL DEFAULT 'UTC'
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.families TO authenticated;
GRANT ALL ON public.families TO service_role;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
CREATE POLICY "families_select_own" ON public.families FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "families_insert_own" ON public.families FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "families_update_own" ON public.families FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- CONSENTS (append-only)
CREATE TABLE public.consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  consent_type text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  version text NOT NULL
);
CREATE INDEX consents_family_idx ON public.consents(family_id);
GRANT SELECT, INSERT ON public.consents TO authenticated;
GRANT ALL ON public.consents TO service_role;
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "consents_select_own" ON public.consents FOR SELECT TO authenticated USING (auth.uid() = family_id);
CREATE POLICY "consents_insert_own" ON public.consents FOR INSERT TO authenticated WITH CHECK (auth.uid() = family_id);

-- CHECK_INS (append-only)
CREATE TABLE public.check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  local_date date NOT NULL,
  mood integer CHECK (mood BETWEEN 1 AND 5),
  sleep text CHECK (sleep IN ('poor','fair','good')),
  feeding text CHECK (feeding IN ('struggling','okay','going well')),
  overall integer CHECK (overall BETWEEN 1 AND 5),
  note text
);
CREATE INDEX check_ins_family_date_idx ON public.check_ins(family_id, local_date DESC);
GRANT SELECT, INSERT ON public.check_ins TO authenticated;
GRANT ALL ON public.check_ins TO service_role;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "check_ins_select_own" ON public.check_ins FOR SELECT TO authenticated USING (auth.uid() = family_id);
CREATE POLICY "check_ins_insert_own" ON public.check_ins FOR INSERT TO authenticated WITH CHECK (auth.uid() = family_id);

-- EPDS ADMINISTRATIONS
CREATE TABLE public.epds_administrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  administered_at timestamptz NOT NULL DEFAULT now(),
  local_date date NOT NULL,
  total_score integer CHECK (total_score BETWEEN 0 AND 30),
  trigger_reason text CHECK (trigger_reason IN ('2wk','6wk','3mo','6mo'))
);
CREATE INDEX epds_admin_family_idx ON public.epds_administrations(family_id, local_date DESC);
GRANT SELECT, INSERT ON public.epds_administrations TO authenticated;
GRANT ALL ON public.epds_administrations TO service_role;
ALTER TABLE public.epds_administrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "epds_admin_select_own" ON public.epds_administrations FOR SELECT TO authenticated USING (auth.uid() = family_id);
CREATE POLICY "epds_admin_insert_own" ON public.epds_administrations FOR INSERT TO authenticated WITH CHECK (auth.uid() = family_id);

-- EPDS RESPONSES
CREATE TABLE public.epds_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  administration_id uuid NOT NULL REFERENCES public.epds_administrations(id) ON DELETE CASCADE,
  item_number integer NOT NULL CHECK (item_number BETWEEN 1 AND 10),
  response_value integer NOT NULL CHECK (response_value BETWEEN 0 AND 3),
  UNIQUE (administration_id, item_number)
);
CREATE INDEX epds_responses_admin_idx ON public.epds_responses(administration_id);
GRANT SELECT, INSERT ON public.epds_responses TO authenticated;
GRANT ALL ON public.epds_responses TO service_role;
ALTER TABLE public.epds_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "epds_responses_select_own" ON public.epds_responses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.epds_administrations a WHERE a.id = administration_id AND a.family_id = auth.uid()));
CREATE POLICY "epds_responses_insert_own" ON public.epds_responses FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.epds_administrations a WHERE a.id = administration_id AND a.family_id = auth.uid()));

-- ESCALATIONS
CREATE TABLE public.escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  trigger_type text NOT NULL,
  trigger_detail text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved')),
  resolved_at timestamptz
);
CREATE INDEX escalations_family_idx ON public.escalations(family_id, triggered_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.escalations TO authenticated;
GRANT ALL ON public.escalations TO service_role;
ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "escalations_select_own" ON public.escalations FOR SELECT TO authenticated USING (auth.uid() = family_id);
CREATE POLICY "escalations_insert_own" ON public.escalations FOR INSERT TO authenticated WITH CHECK (auth.uid() = family_id);
CREATE POLICY "escalations_update_own" ON public.escalations FOR UPDATE TO authenticated USING (auth.uid() = family_id) WITH CHECK (auth.uid() = family_id);

-- DERIVED SIGNALS
CREATE TABLE public.derived_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  signal_type text NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  rule_version text NOT NULL
);
CREATE INDEX derived_signals_family_idx ON public.derived_signals(family_id, computed_at DESC);
GRANT SELECT, INSERT ON public.derived_signals TO authenticated;
GRANT ALL ON public.derived_signals TO service_role;
ALTER TABLE public.derived_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "derived_signals_select_own" ON public.derived_signals FOR SELECT TO authenticated USING (auth.uid() = family_id);
CREATE POLICY "derived_signals_insert_own" ON public.derived_signals FOR INSERT TO authenticated WITH CHECK (auth.uid() = family_id);

-- DOULAS
CREATE TABLE public.doulas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  bio text,
  specialties text[] NOT NULL DEFAULT '{}',
  languages text[] NOT NULL DEFAULT '{}'
);
GRANT SELECT ON public.doulas TO authenticated;
GRANT ALL ON public.doulas TO service_role;
ALTER TABLE public.doulas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doulas_select_authenticated" ON public.doulas FOR SELECT TO authenticated USING (true);

-- ASSIGNMENTS
CREATE TABLE public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  doula_id uuid NOT NULL REFERENCES public.doulas(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_id, doula_id)
);
CREATE INDEX assignments_family_idx ON public.assignments(family_id);
GRANT SELECT ON public.assignments TO authenticated;
GRANT ALL ON public.assignments TO service_role;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assignments_select_own" ON public.assignments FOR SELECT TO authenticated USING (auth.uid() = family_id);

-- CONTENT VIEWS
CREATE TABLE public.content_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  content_id text NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX content_views_family_idx ON public.content_views(family_id, viewed_at DESC);
GRANT SELECT, INSERT ON public.content_views TO authenticated;
GRANT ALL ON public.content_views TO service_role;
ALTER TABLE public.content_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_views_select_own" ON public.content_views FOR SELECT TO authenticated USING (auth.uid() = family_id);
CREATE POLICY "content_views_insert_own" ON public.content_views FOR INSERT TO authenticated WITH CHECK (auth.uid() = family_id);