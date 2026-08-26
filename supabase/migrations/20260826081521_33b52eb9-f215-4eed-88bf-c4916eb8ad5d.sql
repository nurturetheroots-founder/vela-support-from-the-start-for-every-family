-- Clean up any existing violations first (none expected)
ALTER TABLE public.epds_responses
  ADD CONSTRAINT epds_responses_item_number_range CHECK (item_number BETWEEN 1 AND 10),
  ADD CONSTRAINT epds_responses_value_range CHECK (response_value BETWEEN 0 AND 3),
  ADD CONSTRAINT epds_responses_unique_item UNIQUE (administration_id, item_number);

CREATE OR REPLACE FUNCTION public.check_epds_responses_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  target_id uuid;
  item_count integer;
BEGIN
  target_id := COALESCE(NEW.administration_id, OLD.administration_id);

  -- Skip if the administration itself is gone (cascade delete)
  IF NOT EXISTS (SELECT 1 FROM public.epds_administrations a WHERE a.id = target_id) THEN
    RETURN NULL;
  END IF;

  SELECT count(DISTINCT item_number) INTO item_count
  FROM public.epds_responses r
  WHERE r.administration_id = target_id;

  IF item_count <> 10 THEN
    RAISE EXCEPTION 'Screening % must have exactly one response for each item 1-10 (found %)', target_id, item_count;
  END IF;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER epds_responses_complete_set
AFTER INSERT OR UPDATE OR DELETE ON public.epds_responses
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.check_epds_responses_complete();