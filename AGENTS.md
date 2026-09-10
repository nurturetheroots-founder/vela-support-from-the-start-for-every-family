<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Database

Migrations live in `drizzle/migrations/` (plus the older `supabase/migrations/`).
Both are replayed in filename order.

`private_checkins` and `epds_screenings` hold maternal wellness and depression
screening data and are under a deliberate isolation guarantee: only the matching
`parent_id` can reach them, and `service_role` is revoked because it carries
`BYPASSRLS`. **Read
[`docs/architecture/0001-private-data-isolation.md`](docs/architecture/0001-private-data-isolation.md)
before touching RLS, table grants, or those two tables** — it lists what must
never change and why, including a function-privilege footgun that is easy to
"clean up" and break.

After any migration touching RLS or grants:

```sh
./drizzle/tests/run_layer2_rls.sh
```
