# Supabase Setup

1. Create a project at https://supabase.com.
2. In the SQL editor, run the contents of `supabase/schema.sql` once (creates tables, RLS
   policies, and all RPC functions used by the app).
3. In Project Settings → API, copy the Project URL, `anon` public key, and `service_role`
   secret key.
4. Fill in `.env.local` (copy `.env.local.example`):
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```
   The service role key is only used server-side, in `src/app/api/signup/route.js` — never
   expose it to the client.
5. `npm run dev`, then sign up through `/signup`. It verifies the Chess.com username you enter
   against the live Chess.com API and pulls its avatar as your profile photo.
6. Promote yourself to admin (needed for `/admin`) by running in the SQL editor:
   ```sql
   update profiles set is_admin = true where sc_code = 'YOUR_SC_CODE';
   ```

## How ratings move

- **Friendly game**: either player submits the result via the floating "+ New Game" button
  (`/matches/new`). It sits `pending` until the *other* player confirms it on `/matches`.
  Confirming calls the `confirm_friendly_game` RPC, which atomically applies Elo to both
  players inside Postgres — no race condition between simultaneous confirmations.
- **Tournament game**: an admin enters it directly on `/admin` (`admin_record_tournament_game`
  RPC). Since an admin is the one entering it, it's auto-verified and rating changes apply
  immediately.
- Both paths share the same Elo core (`_apply_elo` in `supabase/schema.sql`): expected score
  from the 400-point logistic curve, K-factor 40/20/10 tiered by games played and rating, one
  independent rating + game-count pool per time control (classical/rapid/blitz), stored as
  JSONB on `profiles.ratings` / `profiles.games_played`.

## What's intentionally not built

- Password reset / email verification flows (Supabase Auth defaults are used as-is).
- Chess.com rating caching — the leaderboard calls the Chess.com API live on every load
  (5-minute Next.js cache per player). Fine for a small club roster; would need a cron sync
  job at real scale.
- News/Puzzles/Endgames/Materials/Candidates pages — removed in this pass per the trimmed
  scope ("ratings, tournaments, friendly matches, admin portal, that's it"). The schema and
  original spec for them are still in `docs/PROJECT_OVERVIEW.md` if they come back later.
