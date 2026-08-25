CREATE TABLE public.parents (
  parent_id UUID PRIMARY KEY,
  display_name TEXT NOT NULL DEFAULT '',
  stage TEXT CHECK (stage IN ('expecting','postpartum')),
  due_date DATE,
  birth_date DATE,
  focuses TEXT[] NOT NULL DEFAULT '{}',
  zip TEXT,
  insurance TEXT,
  consented_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parents TO authenticated;
GRANT ALL ON public.parents TO service_role;

ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents manage their own profile"
  ON public.parents FOR ALL TO authenticated
  USING (auth.uid() = parent_id)
  WITH CHECK (auth.uid() = parent_id);

CREATE TABLE public.parent_daily_checkins (
  checkin_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.parents(parent_id) ON DELETE CASCADE,
  mood_score INTEGER CHECK (mood_score BETWEEN 1 AND 5),
  sleep_quality VARCHAR(10) CHECK (sleep_quality IN ('poor','fair','good')),
  feeding_status VARCHAR(20) CHECK (feeding_status IN ('struggling','okay','going well')),
  overall_score INTEGER CHECK (overall_score BETWEEN 1 AND 5),
  parent_health_notes TEXT CHECK (parent_health_notes IS NULL OR char_length(parent_health_notes) <= 500),
  requires_support_flag BOOLEAN NOT NULL DEFAULT FALSE,
  logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT one_checkin_per_parent_per_day UNIQUE (parent_id, logged_date)
);

CREATE INDEX parent_daily_checkins_parent_date_idx
  ON public.parent_daily_checkins (parent_id, logged_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parent_daily_checkins TO authenticated;
GRANT ALL ON public.parent_daily_checkins TO service_role;

ALTER TABLE public.parent_daily_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents manage their own check-ins"
  ON public.parent_daily_checkins FOR ALL TO authenticated
  USING (auth.uid() = parent_id)
  WITH CHECK (auth.uid() = parent_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER parents_set_updated_at
  BEFORE UPDATE ON public.parents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.parents (parent_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', ''))
  ON CONFLICT (parent_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();