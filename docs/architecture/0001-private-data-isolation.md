# 1. Private data isolation

**Status:** Accepted · **Date:** 2026-09-10 · **Applies to:** `private_checkins`, `epds_screenings`

## Context

Vela's database holds two kinds of data about a family, and they carry very
different consent.

**Operational** — `care_logs`, `shift_handovers`. Feeds, diapers, sleep, shift
notes. A parent invites a caregiver precisely so they can read and write this.
Sharing it is the product.

**Private** — `private_checkins`, `epds_screenings`. Mood, wellness, and
Edinburgh Postnatal Depression Scale screening, including item 10, which asks
whether the mother has thought of harming herself.

A mother answers item 10 honestly only if she is certain the night nurse will
never see it. If that confidence is wrong even once, the screening stops being
a clinical instrument and becomes a liability — she under-reports, and the
escalation the instrument exists to trigger never fires. Protecting that
confidence is Vela's highest priority, above operational convenience.

Access control that lives in application code cannot carry that weight. Any
forgotten `.eq()`, any new query path, any Edge Function written in a hurry
becomes a disclosure. The guarantee has to hold in the database, against a
caller who is actively trying to get around it.

## Decision

Isolation is enforced in the schema, in four independent layers. Each one alone
would be sufficient for the common case; they are stacked so that no single
future mistake removes the guarantee.

### 1. Per-verb policies, owner test only

Each of SELECT / INSERT / UPDATE / DELETE gets its own permissive policy,
every one testing `parent_id = (SELECT auth.uid())`. Written out separately
rather than as `FOR ALL`, so widening one verb is visible in a diff instead of
hidden inside a shared clause.

### 2. A RESTRICTIVE backstop

Postgres ORs permissive policies together, then ANDs the result with every
restrictive policy. Both private tables carry a restrictive policy applying the
same owner test to all verbs.

This is the layer that survives future mistakes. A later migration that adds a
permissive policy granting caregivers access **still does not grant it** — the
restrictive policy is ANDed in regardless, and a caregiver is by definition not
the `parent_id` on the row.

### 3. FORCE ROW LEVEL SECURITY

`ENABLE ROW LEVEL SECURITY` exempts the table owner. `FORCE` removes that
exemption, closing the last in-database path that would otherwise skip the
policies.

### 4. `service_role` is revoked

`service_role` holds `BYPASSRLS`. Every policy above is invisible to it. Table
privileges are checked separately from RLS, so the grant is revoked outright:

```sql
REVOKE ALL ON public.private_checkins FROM PUBLIC, anon, service_role;
REVOKE ALL ON public.epds_screenings  FROM PUBLIC, anon, service_role;
```

A server-side key now gets `permission denied for table private_checkins`
rather than a full table read.

### Delegation is structurally impossible

`family_members.permissions` is the only delegation surface in the schema, and
it cannot express a grant to private data. Two independent mechanisms:

- `has_family_permission()` tests `_resource` against a hardcoded allowlist
  (`care_logs`, `shift_handovers`) *before* consulting any stored grant.
- A CHECK constraint on `family_members` rejects a `permissions` value naming
  any other resource, so such a grant cannot be written in the first place.

### Item 10 cannot be suppressed by the client

`total_score` and `q10_emergency_state` are recomputed from `scores` by a
`BEFORE INSERT OR UPDATE` trigger whenever the full instrument is present. A
client posting `q10: 3` alongside `q10_emergency_state: false` is overridden.
A screening totalling only 2 with a non-zero item 10 still raises the flag.

## Consequences

### Accepted cost

**Edge Functions and server-side keys cannot read wellness data.** This is not
an oversight to be patched later — it is the decision. Anything that needs to
act on a private row must run as the parent, in their own session, with their
own JWT.

This was raised explicitly during review and reaffirmed: maternal psychological
safety outranks server-side convenience.

### If server-side access becomes genuinely necessary

Do **not** restore the `service_role` grant. That re-opens full table reads for
every server-side code path at once, forever. Instead:

1. Create a dedicated role for the single job that needs it.
2. Grant it only the columns that job requires — an escalation job needs
   `parent_id`, `q10_emergency_state`, `created_at`, and never `notes` or the
   per-item `scores`.
3. Give it a matching policy on the private table, scoped as narrowly as the
   job allows.
4. Add assertions to `drizzle/tests/layer2_rls.sql` proving the new role
   *cannot* read everything else.

The partial index `epds_screenings_emergency_idx` exists to make that job cheap
when it is built.

### Rules for future migrations

- Never add a permissive policy to a private table that tests anything other
  than `parent_id = (SELECT auth.uid())`.
- Never `DROP` the `*_isolation` restrictive policies.
- Never re-grant these tables to `service_role`, `anon`, or `PUBLIC`.
- Never add a resource to the `has_family_permission()` allowlist without an
  explicit decision recorded here.
- Do not "clean up" the `EXECUTE` grants on `has_family_permission` or
  `is_valid_member_permissions`. They look redundant and are not — see below.

### A privilege footgun, documented because it already bit us

Postgres checks function `EXECUTE` privilege against the **invoking** user even
when the call sits inside an RLS policy or a CHECK constraint. The first draft
of this work revoked `has_family_permission` from `authenticated` on the
assumption that policy expressions run as the policy owner. They do not. Every
read of `care_logs` would have failed in production with
`permission denied for function has_family_permission`.

Trigger functions are the opposite case: `EXECUTE` is checked at
`CREATE TRIGGER` time, not when the trigger fires, so the trigger-only
functions stay revoked from everyone and still work.

## Verification

```sh
./drizzle/tests/run_layer2_rls.sh
```

Replays the full migration history into a throwaway Postgres cluster and
asserts the guarantees as parent, caregiver, unrelated user, `service_role`,
and `anon` — 31 checks. Run it after any migration that touches RLS, grants,
or the private tables.

## References

- `drizzle/migrations/0008_layer2_secure_data_layer.sql`
- `drizzle/tests/layer2_rls.sql`
