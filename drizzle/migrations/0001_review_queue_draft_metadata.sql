ALTER TABLE public.review_queue ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.review_queue ADD COLUMN IF NOT EXISTS clinical_context TEXT;