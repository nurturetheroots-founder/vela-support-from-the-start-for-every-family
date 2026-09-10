\set QUIET 1
\pset tuples_only on
\pset format unaligned
CREATE OR REPLACE FUNCTION pg_temp.chk(_l text,_g anyelement,_w anyelement) RETURNS void
LANGUAGE plpgsql AS $$ BEGIN RAISE INFO '%  %  (got %, want %)',
 CASE WHEN _g IS NOT DISTINCT FROM _w THEN 'PASS' ELSE 'FAIL' END, rpad(_l,50),_g,_w; END; $$;
CREATE OR REPLACE FUNCTION pg_temp.rej(_l text,_s text) RETURNS void
LANGUAGE plpgsql AS $$ BEGIN EXECUTE _s; RAISE INFO 'FAIL  %  (allowed)', rpad(_l,50);
EXCEPTION WHEN insufficient_privilege OR check_violation THEN
 RAISE INFO 'PASS  %  (%)', rpad(_l,50), SQLERRM; END; $$;

\echo ''
\echo '--- existing rows survived the lockdown ---'
SELECT pg_temp.chk('all 3 pre-existing checkins still present',
  (SELECT count(*) FROM public.checkins), 3::bigint);

\echo ''
\echo '--- the owning user ---'
SET ROLE authenticated;
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SELECT pg_temp.chk('sees only her own rows', (SELECT count(*) FROM public.checkins), 2::bigint);
SELECT pg_temp.chk('mood/energy readable', (SELECT mood FROM public.checkins WHERE date='2026-09-09'), 3);
INSERT INTO public.checkins (user_id,date,mood,energy)
  VALUES ('11111111-1111-1111-1111-111111111111','2026-09-10',2,2);
SELECT pg_temp.chk('can log her own check-in', (SELECT count(*) FROM public.checkins), 3::bigint);
SELECT pg_temp.rej('cannot write a row owned by someone else',
  $q$ INSERT INTO public.checkins (user_id,date,mood,energy)
      VALUES ('22222222-2222-2222-2222-222222222222','2026-09-10',5,5) $q$);
RESET ROLE;

\echo ''
\echo '--- the caregiver (a real family member with operational grants) ---'
INSERT INTO public.family_members (family_id, profile_id, role)
  VALUES ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','caregiver')
  ON CONFLICT DO NOTHING;
SET ROLE authenticated;
SET request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
SELECT pg_temp.chk('sees ONLY his own row, none of hers',
  (SELECT count(*) FROM public.checkins), 1::bigint);
SELECT pg_temp.chk('targeted read of her rows returns nothing',
  (SELECT count(*) FROM public.checkins WHERE user_id='11111111-1111-1111-1111-111111111111'), 0::bigint);
SELECT pg_temp.chk('cannot see her mood at all',
  (SELECT count(*) FROM public.checkins WHERE mood IS NOT NULL AND user_id <> '22222222-2222-2222-2222-222222222222'), 0::bigint);
RESET ROLE;

\echo ''
\echo '--- the pre-existing USING(true) policy from the other app ---'
SELECT pg_temp.chk('it still exists (not dropped)',
  (SELECT count(*) FROM pg_policies WHERE tablename='checkins' AND policyname='other_app_wide_open'), 1::bigint);
SELECT pg_temp.chk('but the RESTRICTIVE backstop clamps it',
  (SELECT count(*) FROM pg_policies WHERE tablename='checkins' AND permissive='RESTRICTIVE'), 1::bigint);

\echo ''
\echo '--- privileged roles ---'
SET ROLE service_role;
SELECT pg_temp.rej('service_role cannot read checkins', $q$ SELECT count(*) FROM public.checkins $q$);
SELECT pg_temp.rej('service_role cannot write checkins',
  $q$ INSERT INTO public.checkins (user_id,date,mood,energy) VALUES ('11111111-1111-1111-1111-111111111111','x',1,1) $q$);
RESET ROLE;
SET ROLE anon;
SELECT pg_temp.rej('anon cannot read checkins', $q$ SELECT count(*) FROM public.checkins $q$);
RESET ROLE;
