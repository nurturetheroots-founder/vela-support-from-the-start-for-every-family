CREATE TABLE public.review_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  pattern_noticed text NOT NULL,
  outreach_draft text NOT NULL,
  status text NOT NULL DEFAULT 'awaiting_family_response'
    CHECK (status IN ('awaiting_family_response','approved','dismissed')),
  responded_at timestamptz
);

CREATE INDEX review_queue_family_status_idx
  ON public.review_queue (family_id, status, created_at DESC);

GRANT SELECT, UPDATE ON public.review_queue TO authenticated;
GRANT ALL ON public.review_queue TO service_role;

ALTER TABLE public.review_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY review_queue_select_own ON public.review_queue
  FOR SELECT TO authenticated
  USING (auth.uid() = family_id);

CREATE POLICY review_queue_update_own ON public.review_queue
  FOR UPDATE TO authenticated
  USING (auth.uid() = family_id)
  WITH CHECK (auth.uid() = family_id);