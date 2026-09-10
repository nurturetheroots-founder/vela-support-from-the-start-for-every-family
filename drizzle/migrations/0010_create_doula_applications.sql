CREATE TABLE public.doula_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  full_name text NOT NULL,
  email text NOT NULL,
  location text,
  specialties text,
  about text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.doula_applications TO anon;
GRANT SELECT, INSERT ON public.doula_applications TO authenticated;
GRANT ALL ON public.doula_applications TO service_role;

ALTER TABLE public.doula_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can apply"
  ON public.doula_applications FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Applicants read their own application"
  ON public.doula_applications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX doula_applications_created_at_idx ON public.doula_applications (created_at DESC);