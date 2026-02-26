# Desktop migrations and CRON_SECRET

## Migrations (20260226 desktop + scheduling)

Apply the four migrations in order. Either:

### Option A: Supabase Dashboard (no local tools)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**.
2. Run each file in order (copy/paste or upload):
   - `supabase/migrations/20260226_desktops.sql`
   - `supabase/migrations/20260226_desktop_files_bucket.sql`
   - `supabase/migrations/20260226_scheduled_tasks.sql`
   - `supabase/migrations/20260226_backfill_desktops_from_sessions.sql`

### Option B: Command line (requires `psql`)

If you have `psql` on your PATH (e.g. `brew install libpq` on macOS):

```bash
npm run db:migrate
```

This reads `POSTGRES_URL_NON_POOLING` from `.env.local` and runs the four SQL files.

---

## CRON_SECRET

The route `/api/cron/run-scheduled` runs scheduled desktop tasks. It must be protected so only Vercel Cron (or your own caller) can trigger it.

### Local

`.env.local` already has a `CRON_SECRET` value. To test the cron locally, call:

```bash
curl -X GET "http://localhost:3000/api/cron/run-scheduled" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

(or use the `x-cron-secret` header with the same value).

### Vercel

1. Open **Vercel** → your project → **Settings** → **Environment Variables**.
2. Add:
   - **Name:** `CRON_SECRET`
   - **Value:** use the same value as in `.env.local` (or generate a new one and update both).
   - **Environment:** Production (and Preview if you want cron in preview).
3. Redeploy so the cron job uses the new variable.

The cron is configured in `vercel.json` to hit `/api/cron/run-scheduled` every minute.
