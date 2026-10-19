# MAX — private family streaming

React + Vite + TypeScript + Tailwind, Supabase (Auth + Postgres + RLS), Vercel hosting, Google Drive playback.

**Status: written but not yet run.** The build environment had no network access, so `npm install`, `npm run build` and the acceptance tests (A–E) have **not** been executed. Run the checklist below before relying on it.

## How the shared catalog works
Videos live in the Supabase `videos` table. RLS lets any active signed-in member read `published` rows; only the admin can insert/update/delete. Favorites and watch history are per-user rows. Nothing important is kept in localStorage.

## 1. Supabase setup
1. Create a project at supabase.com.
2. SQL Editor → paste and run `supabase/migrations/001_schema.sql` once. (Future changes: add `002_…sql` files; never re-create tables.)
3. Authentication → Providers → Email: enable; turn **off** “Allow new users to sign up” (invite-only). Under URL Configuration, set Site URL to your Vercel URL and add `<url>/login` to Redirect URLs.
4. Create your own account: Authentication → Users → Add user (email + password, auto-confirm).
5. Make yourself admin (SQL Editor, trusted context — cannot be done from the app):
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
6. Project Settings → API: copy the Project URL and the anon/publishable key.

## 2. Run locally
```
cp .env.example .env.local   # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```
Invites (`/api/invite`) need Vercel Functions; locally use `npx vercel dev` with the server-only variables set, or create users in the Supabase dashboard.

## 3. Deploy to Vercel
1. Push this folder to GitHub; import it in Vercel (Framework: Vite; build `npm run build`; output `dist`).
2. Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (public) and `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server-only; never prefix with VITE_).
3. Deploy. `vercel.json` routes all non-API paths to the SPA.
4. Custom domain: Vercel → Settings → Domains → add domain, set the DNS records it shows, then update Supabase Site URL/Redirect URLs.

## 4. Google Drive sharing
Paste a link like `https://drive.google.com/file/d/FILE_ID/view`; MAX converts it to `/preview`. For family to watch: in Drive, Share → either add each family member’s Google account as Viewer, or set “Anyone with the link: Viewer”. Family members using a different Google account than the owner’s will see “access denied” if neither is done. Drive may throttle large or popular files (view quotas), re-encode newly uploaded videos for a while, and does not report playback position — so “Continue Watching” records last opened, not exact progress. The app cannot reliably test playback from the browser; use **Preview playback** in the admin. If Drive proves unreliable, consider Cloudflare R2, Backblaze B2, or Bunny Stream with a signed-URL player (not included).

## 5. Backup and recovery
- Nothing is backed up automatically by this project. Supabase’s free plan does not include downloadable scheduled backups (daily backups are a paid-plan feature) — check your plan in Project Settings → Database → Backups.
- Free option: run `scripts/backup.sh` (needs `pg_dump` and your DB connection string) weekly, or schedule it in GitHub Actions with the connection string stored as an encrypted secret. Keep dumps outside git.
- Restore into a fresh project: run `001_schema.sql`, then `psql "$NEW_DB_URL" -f backups/<file>.sql` (data only conflicts may need `--data-only` handling). Auth users are not in the `public` dump; also export users or re-invite them.
- Videos themselves live in Google Drive; back those up separately.

## 6. Security notes
Admin routes are hidden in the UI **and** enforced by RLS (`is_admin()`); a trigger blocks role/status/email changes by non-admins; the service-role key is used only in `api/invite.ts`, which verifies the caller is an admin. Policies per table are in the SQL file.

## 7. Testing checklist (none run yet)
- [ ] A: Admin publishes a video; a member on another browser/device sees it and the Drive player loads (file shared correctly).
- [ ] B: As a member, `/admin` redirects home; in the browser console `supabase.from('videos').insert(...)` / `.update(...)` return a permission error or 0 rows; `update profiles set role='admin'` is rejected.
- [ ] C: Add several videos, sign out, hard refresh, sign in again — all still present for members.
- [ ] D: Favorite + open a video as user 1; user 2 sees none of user 1’s favorites/history.
- [ ] E: Deployed URL works from another device; invite email link and password reset land on `/login`.
- [ ] Disabled member: disable in Admin → Members; their next load is blocked and catalog queries return nothing.
