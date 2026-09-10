-- =============================================================================
-- Layer 2 follow-up: three findings from the review of 0008
-- =============================================================================
-- Cursor Bugbot reviewed 0008 after it merged and reported three real defects,
-- each reproduced before being fixed here. 0008 is left untouched: it has been
-- applied, so it is history.
--
-- 1. HIGH — the EPDS emergency flag could be suppressed.
--    epds_screenings_before_write only recomputed when all ten items were JSON
--    numbers. Omit one other item, or send the scores as strings, and the
--    client's own q10_emergency_state survived: a mother could answer item 10
--    with a 3 and have it stored as false. The flag is now derived whenever
--    item 10 is present in any parseable form, and is never downgraded.
--
-- 2. MEDIUM — care log and handover updates dropped the identity check.
--    The UPDATE policies' WITH CHECK re-tested only has_family_permission, and
--    an RLS WITH CHECK cannot see OLD, so a caregiver could update their own
--    row and reassign created_by. Authorship is now pinned in the trigger.
--
-- 3. LOW — an edited note left content stale. COALESCE onto the existing
--    content pinned it to the first note ever written.
--
-- Idempotent: safe to replay.
-- =============================================================================


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


-- The trigger functions are re-created above, so their grants are re-applied.
REVOKE ALL ON FUNCTION public.epds_screenings_before_write() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.care_logs_before_write()       FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.shift_handovers_before_write() FROM PUBLIC, anon, authenticated;
