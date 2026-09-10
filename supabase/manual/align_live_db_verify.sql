\set QUIET 1
\pset tuples_only on
\pset format unaligned
CREATE OR REPLACE FUNCTION pg_temp.chk(_l text,_got anyelement,_want anyelement)
RETURNS void LANGUAGE plpgsql AS $$ BEGIN RAISE INFO '%  %  (got %, want %)',
 CASE WHEN _got IS NOT DISTINCT FROM _want THEN 'PASS' ELSE 'FAIL' END, rpad(_l,52),_got,_want; END; $$;
CREATE OR REPLACE FUNCTION pg_temp.rej(_l text,_sql text)
RETURNS void LANGUAGE plpgsql AS $$ BEGIN EXECUTE _sql;
 RAISE INFO 'FAIL  %  (allowed)', rpad(_l,52);
EXCEPTION WHEN insufficient_privilege OR check_violation THEN
 RAISE INFO 'PASS  %  (%)', rpad(_l,52), SQLERRM; END; $$;

\echo ''
\echo '--- parent onboarding + care flow, as the app performs it ---'
SET ROLE authenticated;
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
-- saveParent()
INSERT INTO public.parents (parent_id,display_name,stage,due_date,birth_date,focuses,zip,insurance,consented_at)
VALUES ('11111111-1111-1111-1111-111111111111','Ada','postpartum','2026-01-01','2026-01-14',
        ARRAY['sleep','feeding'],'94110','Private',now())
ON CONFLICT (parent_id) DO UPDATE SET consented_at = EXCLUDED.consented_at, stage = EXCLUDED.stage;
SELECT pg_temp.chk('onboarding gate (consented_at) persists',
  (SELECT consented_at IS NOT NULL FROM public.parents WHERE parent_id='11111111-1111-1111-1111-111111111111'), true);
-- saveCheckin() upsert on (parent_id, logged_date)
INSERT INTO public.parent_daily_checkins (parent_id,mood_score,sleep_quality,feeding_status,overall_score,parent_health_notes,requires_support_flag,logged_date)
VALUES ('11111111-1111-1111-1111-111111111111',2,'poor','okay',2,'rough night',true,CURRENT_DATE)
ON CONFLICT (parent_id,logged_date) DO UPDATE SET mood_score = EXCLUDED.mood_score;
SELECT pg_temp.chk('daily check-in upsert works', (SELECT count(*) FROM public.parent_daily_checkins), 1::bigint);
-- resolveBaby() then addCareLog()
INSERT INTO public.babies (id,name) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','Juniper');
INSERT INTO public.care_logs (baby_id,event_type,operational_metrics)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','feed','{"type":"bottle","amount_oz":3}');
SELECT pg_temp.chk('care log family_id derived server-side',
  (SELECT family_id FROM public.care_logs LIMIT 1), '11111111-1111-1111-1111-111111111111'::uuid);
RESET ROLE;

\echo ''
\echo '--- caregiver invite flow ---'
SET ROLE authenticated;
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SELECT set_config('vela.code', public.generate_family_invite(), false);
RESET ROLE;
SET ROLE authenticated;
SET request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
SELECT pg_temp.chk('redeem_family_invite joins the family',
  public.redeem_family_invite(current_setting('vela.code'),'Night Nurse'),
  '11111111-1111-1111-1111-111111111111'::uuid);
SELECT pg_temp.chk('caregiver reads family care_logs', (SELECT count(*) FROM public.care_logs), 1::bigint);
SELECT pg_temp.chk('caregiver sees the baby',           (SELECT count(*) FROM public.babies), 1::bigint);
SELECT pg_temp.chk('caregiver sees NO parent check-ins',(SELECT count(*) FROM public.parent_daily_checkins), 0::bigint);
RESET ROLE;

\echo ''
\echo '--- private isolation ---'
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
INSERT INTO public.private_checkins (parent_id,wellness_metrics,notes)
 VALUES ('11111111-1111-1111-1111-111111111111','{"mood":2}','I cried in the shower again.');
INSERT INTO public.epds_screenings (parent_id,scores,total_score,q10_emergency_state)
 VALUES ('11111111-1111-1111-1111-111111111111',
   '{"q1":2,"q2":2,"q3":2,"q4":2,"q5":2,"q6":2,"q7":2,"q8":2,"q9":2,"q10":3}',0,false);
SELECT pg_temp.chk('q10 flag cannot be suppressed by client',
  (SELECT q10_emergency_state FROM public.epds_screenings), true);
SET ROLE authenticated;
SET request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
SELECT pg_temp.chk('caregiver sees NO private_checkins',(SELECT count(*) FROM public.private_checkins), 0::bigint);
SELECT pg_temp.chk('caregiver sees NO epds_screenings', (SELECT count(*) FROM public.epds_screenings), 0::bigint);
SELECT pg_temp.rej('cannot delegate private_checkins (refused)',
  $q$ UPDATE public.family_members SET permissions='{"private_checkins":["read"]}' $q$);
RESET ROLE;
SELECT pg_temp.chk('permissions value actually unchanged',
  (SELECT permissions FROM public.family_members LIMIT 1),
  '{"care_logs": ["read", "write"], "shift_handovers": ["read", "write"]}'::jsonb);
SET ROLE service_role;
SELECT pg_temp.rej('service_role cannot read private_checkins', $q$ SELECT count(*) FROM public.private_checkins $q$);
RESET ROLE;

\echo ''
\echo '--- nothing else disturbed ---'
SET ROLE anon;
SELECT pg_temp.chk('foreign app function still works for anon', (SELECT public.other_app_ping()), 'pong'::text);
RESET ROLE;
SELECT pg_temp.chk('checkins columns unchanged by the lockdown',
  (SELECT string_agg(column_name,',' ORDER BY column_name)
     FROM information_schema.columns WHERE table_schema='public' AND table_name='checkins'),
  'date,energy,id,mood,user_id'::text);
SELECT pg_temp.chk('checkins is FORCE row level security',
  (SELECT relforcerowsecurity FROM pg_class WHERE oid='public.checkins'::regclass), true);
