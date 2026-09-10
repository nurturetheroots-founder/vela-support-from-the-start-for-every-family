#!/usr/bin/env bash
# Replays the full migration history into a throwaway Postgres cluster and runs
# drizzle/tests/layer2_rls.sql against it. Needs a local PostgreSQL 15+.
#
#   ./drizzle/tests/run_layer2_rls.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PGBIN="${PGBIN:-$(dirname "$(command -v postgres || command -v pg_ctl)")}"
PORT="${PGPORT:-55432}"
WORK="$(mktemp -d)"
trap '"$PGBIN/pg_ctl" -D "$WORK/data" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$WORK"' EXIT

"$PGBIN/initdb" -D "$WORK/data" -A trust -U postgres >/dev/null
"$PGBIN/pg_ctl" -D "$WORK/data" -l "$WORK/pg.log" -o "-p $PORT -k $WORK" -w start >/dev/null
psql() { command psql -h "$WORK" -p "$PORT" -U postgres -v ON_ERROR_STOP=1 "$@"; }

# Stand-ins for the Supabase platform objects the migrations assume.
psql -q -f - <<'SQL'
DO $$ BEGIN CREATE ROLE anon NOLOGIN;                  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated NOLOGIN;         EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role NOLOGIN BYPASSRLS;EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE SCHEMA auth;
CREATE TABLE auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
GRANT USAGE ON SCHEMA auth, public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
SQL

# Supabase migrations first (they create parents/families), then the drizzle set.
# client_min_messages=warning hides the "does not exist, skipping" notices that
# the idempotent DROP ... IF EXISTS statements emit on a first run.
for f in $(ls "$ROOT"/supabase/migrations/*.sql | sort) $(ls "$ROOT"/drizzle/migrations/*.sql | sort); do
  PGOPTIONS='-c client_min_messages=warning' psql -q -f "$f" >/dev/null
done

# Pre-existing rows, so the 0008 backfills are covered too.
psql -q -f - <<'SQL' >/dev/null
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('11111111-1111-1111-1111-111111111111', 'parent@example.test',    '{"display_name":"Ada"}'),
  ('22222222-2222-2222-2222-222222222222', 'caregiver@example.test', '{"display_name":"Night Nurse"}'),
  ('33333333-3333-3333-3333-333333333333', 'other@example.test',     '{"display_name":"Stranger"}');
INSERT INTO public.families (id, email) VALUES ('11111111-1111-1111-1111-111111111111', 'parent@example.test');
INSERT INTO public.babies (id, parent_id, name)
  VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Juniper');
INSERT INTO public.care_logs (baby_id, created_by, event_type, operational_metrics) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'feed',        '{"type":"bottle","amount_oz":3}'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'observation', '{"category":"soothing","note":"Settled with swaddle"}');
INSERT INTO public.shift_handovers (baby_id, caregiver_id, shift_start, shift_end, notes, status)
  VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222',
          now() - interval '8 hours', now(), 'Good night overall.', 'published');
INSERT INTO public.family_members (family_id, profile_id, role)
  VALUES ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'caregiver');
SQL

OUT="$(psql -q -f "$ROOT/drizzle/tests/layer2_rls.sql" 2>&1 \
        | sed -E 's/^psql:[^ ]+: INFO:  //; s/^INFO:  //' | cat -s)"
echo "$OUT"
if grep -q '^FAIL' <<<"$OUT"; then echo; echo "Layer 2 RLS suite FAILED"; exit 1; fi
echo
echo "Layer 2 RLS suite passed"
