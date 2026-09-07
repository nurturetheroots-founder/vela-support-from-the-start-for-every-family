CREATE TYPE public.care_event_type AS ENUM ('feed', 'diaper', 'sleep', 'observation');
CREATE TYPE public.shift_handover_status AS ENUM ('draft', 'published');

CREATE TABLE public.babies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL DEFAULT 'Baby',
  birth_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.babies TO authenticated;
GRANT ALL ON public.babies TO service_role;
ALTER TABLE public.babies ENABLE ROW LEVEL SECURITY;

CREATE POLICY babies_select_own ON public.babies FOR SELECT TO authenticated USING (auth.uid() = parent_id);
CREATE POLICY babies_insert_own ON public.babies FOR INSERT TO authenticated WITH CHECK (auth.uid() = parent_id);
CREATE POLICY babies_update_own ON public.babies FOR UPDATE TO authenticated USING (auth.uid() = parent_id) WITH CHECK (auth.uid() = parent_id);
CREATE POLICY babies_delete_own ON public.babies FOR DELETE TO authenticated USING (auth.uid() = parent_id);

CREATE TABLE public.care_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id uuid NOT NULL REFERENCES public.babies(id) ON DELETE CASCADE,
  logged_by uuid NOT NULL DEFAULT auth.uid(),
  "timestamp" timestamptz NOT NULL DEFAULT now(),
  event_type public.care_event_type NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX care_logs_baby_time_idx ON public.care_logs (baby_id, "timestamp" DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.care_logs TO authenticated;
GRANT ALL ON public.care_logs TO service_role;
ALTER TABLE public.care_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY care_logs_select_related ON public.care_logs FOR SELECT TO authenticated
  USING (auth.uid() = logged_by OR EXISTS (SELECT 1 FROM public.babies b WHERE b.id = care_logs.baby_id AND b.parent_id = auth.uid()));
CREATE POLICY care_logs_insert_related ON public.care_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = logged_by AND EXISTS (SELECT 1 FROM public.babies b WHERE b.id = care_logs.baby_id AND b.parent_id = auth.uid()));
CREATE POLICY care_logs_update_own ON public.care_logs FOR UPDATE TO authenticated
  USING (auth.uid() = logged_by) WITH CHECK (auth.uid() = logged_by);
CREATE POLICY care_logs_delete_own ON public.care_logs FOR DELETE TO authenticated
  USING (auth.uid() = logged_by);

CREATE TABLE public.shift_handovers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id uuid NOT NULL REFERENCES public.babies(id) ON DELETE CASCADE,
  caregiver_id uuid NOT NULL DEFAULT auth.uid(),
  shift_start timestamptz NOT NULL,
  shift_end timestamptz NOT NULL,
  summary_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  caregiver_notes text,
  status public.shift_handover_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX shift_handovers_baby_idx ON public.shift_handovers (baby_id, shift_end DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_handovers TO authenticated;
GRANT ALL ON public.shift_handovers TO service_role;
ALTER TABLE public.shift_handovers ENABLE ROW LEVEL SECURITY;

CREATE POLICY shift_handovers_select_related ON public.shift_handovers FOR SELECT TO authenticated
  USING (auth.uid() = caregiver_id OR EXISTS (SELECT 1 FROM public.babies b WHERE b.id = shift_handovers.baby_id AND b.parent_id = auth.uid()));
CREATE POLICY shift_handovers_insert_related ON public.shift_handovers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = caregiver_id AND EXISTS (SELECT 1 FROM public.babies b WHERE b.id = shift_handovers.baby_id AND b.parent_id = auth.uid()));
CREATE POLICY shift_handovers_update_own ON public.shift_handovers FOR UPDATE TO authenticated
  USING (auth.uid() = caregiver_id) WITH CHECK (auth.uid() = caregiver_id);
CREATE POLICY shift_handovers_delete_own ON public.shift_handovers FOR DELETE TO authenticated
  USING (auth.uid() = caregiver_id);