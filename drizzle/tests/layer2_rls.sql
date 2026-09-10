-- =============================================================================
-- Layer 2 regression suite — run against a database that has replayed every
-- migration up to and including 0008_layer2_secure_data_layer.sql.
--
--   drizzle/tests/run_layer2_rls.sh
--
-- Each check prints PASS or FAIL. The suite exists because the isolation
-- guarantees on private_checkins and epds_screenings are the kind of thing that
-- breaks silently: a later migration adds one permissive policy and nobody
-- notices until a caregiver reads a mother's depression screening.
-- =============================================================================

\set ON_ERROR_STOP on
\set QUIET 1
\pset tuples_only on
\pset format unaligned

CREATE OR REPLACE FUNCTION pg_temp.check(_label text, _got anyelement, _want anyelement)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  RAISE INFO '%  %  (got %, want %)',
    CASE WHEN _got IS NOT DISTINCT FROM _want THEN 'PASS' ELSE 'FAIL' END,
    rpad(_label, 58), _got, _want;
END;
$$;

-- Runs a statement and reports whether it was rejected, so "this must fail" is
-- asserted as positively as "this must succeed".
CREATE OR REPLACE FUNCTION pg_temp.check_rejected(_label text, _sql text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE _sql;
  RAISE INFO 'FAIL  %  (statement was allowed)', rpad(_label, 58);
EXCEPTION WHEN insufficient_privilege OR check_violation THEN
  RAISE INFO 'PASS  %  (%)', rpad(_label, 58), SQLERRM;
END;
$$;

-- ---------------------------------------------------------------------------
-- Fixtures. Written as the owner because both private tables FORCE RLS.
-- ---------------------------------------------------------------------------
\set PARENT    '11111111-1111-1111-1111-111111111111'
\set CAREGIVER '22222222-2222-2222-2222-222222222222'

SET request.jwt.claim.sub = :'PARENT';

INSERT INTO public.private_checkins (parent_id, wellness_metrics, notes)
VALUES (:'PARENT', '{"mood":2,"sleep":"poor"}', 'I cried in the shower again.');

-- Item 10 answered 3, but the client claims a clean screen.
INSERT INTO public.epds_screenings (parent_id, scores, total_score, q10_emergency_state)
VALUES (:'PARENT',
        '{"q1":2,"q2":2,"q3":2,"q4":2,"q5":2,"q6":2,"q7":2,"q8":2,"q9":2,"q10":3}',
        0, false);

\echo ''
\echo '--- derived screening fields ---'
SELECT pg_temp.check('total_score recomputed from scores',
                     (SELECT total_score FROM public.epds_screenings), 21);
SELECT pg_temp.check('q10 flag cannot be suppressed by the client',
                     (SELECT q10_emergency_state FROM public.epds_screenings), true);

\echo ''
\echo '--- parent session ---'
SET ROLE authenticated;
SET request.jwt.claim.sub = :'PARENT';
SELECT pg_temp.check('parent reads own care_logs',      (SELECT count(*) FROM public.care_logs), 2::bigint);
SELECT pg_temp.check('parent reads own private_checkins',(SELECT count(*) FROM public.private_checkins), 1::bigint);
SELECT pg_temp.check('parent reads own epds_screenings', (SELECT count(*) FROM public.epds_screenings), 1::bigint);
RESET ROLE;

\echo ''
\echo '--- caregiver session: operational access granted, private access denied ---'
SET ROLE authenticated;
SET request.jwt.claim.sub = :'CAREGIVER';
SELECT pg_temp.check('caregiver reads family care_logs',     (SELECT count(*) FROM public.care_logs), 2::bigint);
SELECT pg_temp.check('caregiver reads family handovers',     (SELECT count(*) FROM public.shift_handovers), 1::bigint);
SELECT pg_temp.check('caregiver sees NO private_checkins',   (SELECT count(*) FROM public.private_checkins), 0::bigint);
SELECT pg_temp.check('caregiver sees NO epds_screenings',    (SELECT count(*) FROM public.epds_screenings), 0::bigint);
SELECT pg_temp.check('targeted read of the parent row',
                     (SELECT count(*) FROM public.private_checkins WHERE parent_id = '11111111-1111-1111-1111-111111111111'),
                     0::bigint);
SELECT pg_temp.check_rejected('caregiver writes a checkin as the parent',
  $q$ INSERT INTO public.private_checkins (parent_id, notes)
      VALUES ('11111111-1111-1111-1111-111111111111', 'injected') $q$);
SELECT pg_temp.check_rejected('caregiver forges care_logs.created_by',
  $q$ INSERT INTO public.care_logs (baby_id, created_by, event_type, operational_metrics)
      VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
              '11111111-1111-1111-1111-111111111111', 'feed', '{}') $q$);

INSERT INTO public.care_logs (baby_id, event_type, operational_metrics)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'diaper', '{"condition":"wet"}');
SELECT pg_temp.check('caregiver logs care for the family', (SELECT count(*) FROM public.care_logs), 3::bigint);
RESET ROLE;

\echo ''
\echo '--- unrelated authenticated user ---'
SET ROLE authenticated;
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SELECT pg_temp.check('stranger sees no care_logs',       (SELECT count(*) FROM public.care_logs), 0::bigint);
SELECT pg_temp.check('stranger sees no shift_handovers', (SELECT count(*) FROM public.shift_handovers), 0::bigint);
SELECT pg_temp.check('stranger sees no private_checkins',(SELECT count(*) FROM public.private_checkins), 0::bigint);
RESET ROLE;

\echo ''
\echo '--- permissions JSONB is the access control, and it is enforced ---'
UPDATE public.family_members
   SET permissions = '{"care_logs":["read"],"shift_handovers":["read"]}'
 WHERE profile_id = :'CAREGIVER';
SET ROLE authenticated;
SET request.jwt.claim.sub = :'CAREGIVER';
SELECT pg_temp.check('read survives after write is revoked', (SELECT count(*) FROM public.care_logs), 3::bigint);
SELECT pg_temp.check_rejected('write blocked after grant revoked',
  $q$ INSERT INTO public.care_logs (baby_id, event_type, operational_metrics)
      VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'feed', '{}') $q$);
RESET ROLE;

SELECT pg_temp.check_rejected('cannot grant a caregiver private_checkins',
  $q$ UPDATE public.family_members SET permissions = '{"private_checkins":["read"]}' $q$);
SELECT pg_temp.check_rejected('cannot grant an unknown action',
  $q$ UPDATE public.family_members SET permissions = '{"care_logs":["admin"]}' $q$);

\echo ''
\echo '--- role-level reachability ---'
SET ROLE service_role;
SELECT pg_temp.check_rejected('service_role cannot read private_checkins',
  $q$ SELECT count(*) FROM public.private_checkins $q$);
SELECT pg_temp.check_rejected('service_role cannot read epds_screenings',
  $q$ SELECT count(*) FROM public.epds_screenings $q$);
SELECT pg_temp.check('service_role still reads care_logs', (SELECT count(*) FROM public.care_logs), 3::bigint);
RESET ROLE;

SET ROLE anon;
SELECT pg_temp.check_rejected('anon cannot read private_checkins',
  $q$ SELECT count(*) FROM public.private_checkins $q$);
SELECT pg_temp.check_rejected('anon cannot read care_logs',
  $q$ SELECT count(*) FROM public.care_logs $q$);
SELECT pg_temp.check_rejected('anon cannot call redeem_family_invite',
  $q$ SELECT public.redeem_family_invite('ABC123', 'x') $q$);
RESET ROLE;

\echo ''
\echo '--- every public function is closed to anon ---'
SELECT pg_temp.check('functions executable by anon',
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
      AND has_function_privilege('anon', p.oid, 'EXECUTE')), 0::bigint);
