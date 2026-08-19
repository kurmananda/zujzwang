# Chess Website — Project Overview

## 1. Purpose

A platform for the college chess community that combines:
- A local rating/leaderboard system (college tournaments + friendly games)
- Aggregated Chess.com stats for members
- Learning resources (puzzles, endgames, materials)
- Tournament management (Swiss pairing, brackets, archives)
- Broadcasting and live coverage of events
- Admin tooling to keep data (games, ratings, tournaments) clean and verified

---

## 2. Homepage Sections (v1 — 8 sections)

More sections will be added later; this is the initial scope.

### 2.1 Rating / Leaderboard
Two sub-sections, shown side by side or as tabs:

**A. College Rating**
- Time controls: Classical, Rapid, Blitz
- Computed entirely from verified local games (see §6, Rating Logic)
- Separate leaderboard per time control

**B. Chess.com Rating**
- Time controls: Rapid, Bullet, Blitz
- Pulled live from the Chess.com public API for each registered member
- Read-only mirror — never affects college rating

### 2.2 News
- Aggregated news from external chess sources (RSS/API feed)
- A separate **Announcements** section for:
  - Upcoming events (in-college)
  - Upcoming events (outside college, e.g. open tournaments)

### 2.3 Puzzles
- Standard tactics puzzles (rating-tagged), solve-and-track progress
- Can reuse a public puzzle dataset (e.g. Lichess puzzle DB) or curate manually

### 2.4 Endgame Learning
- Same delivery mechanism as Puzzles, but scoped to endgame positions/technique
- Organized by theme (K+P endings, rook endings, opposition, etc.)

### 2.5 Material Links
- Curated links to Google Drive folders: courses, training session recordings, PGN collections, etc.
- Simple categorized link list, admin-editable

### 2.6 Enter Game (Game Submission)
- Any member can submit a game result: white player, black player, result, time control, date, optional PGN
- Submitted games sit in a **pending** state
- An admin/moderator must **verify** the game before it:
  - Appears in game history
  - Is applied to the college rating calculation
- Prevents rating manipulation / spam entries

### 2.7 Candidates Page
- Grid of 8 photo cards (expandable later)
- Each card: photo placeholder, name placeholder, and below it — the tournament through which that person qualified as a "candidate"
- Purpose: highlight top players who earned candidate status via a qualifying tournament

### 2.8 Tournament Archives
- Historical record of chess league and other tournaments
- Per tournament: teams, members/rosters, results, standings/points table, and any other metadata
- Read-only historical view (current/live tournaments live under Broadcast, §3)

---

## 3. Broadcast + Online Playing / Tournament System (Phase 2)

This is the more complex, backend-heavy part of the platform.

### 3.1 Signup & Chess.com Linking
- During signup, ask for the user's **Chess.com username**
- Use the Chess.com public API (`https://api.chess.com/pub/player/{username}`, `.../stats`) to pull and display:
  - Profile info (avatar, title, country, join date)
  - Ratings: rapid, blitz, bullet
- This is stored as a reference/display field, not used in local rating math

### 3.2 Swiss Tournament Generator
- Admin creates a tournament: name, date, time control, round count, format (Swiss)
- Add registered participants (search by name / Chess.com username)
- Generate pairings each round using standard Swiss rules:
  - Pair players with equal (or closest) scores
  - Avoid repeat pairings where possible
  - Handle byes for odd participant counts
  - Color balancing (alternate white/black, avoid 3x same color in a row)
- Admin enters round results → system recalculates standings automatically
- Final standings feed into: Candidates page (qualification), Tournament Archives, and local rating updates

### 3.3 Tournament Display
- **Upcoming tournaments**: list with date, format, registration status
- **Live/current tournament**: bracket/standings updating as rounds are entered
- **Past tournaments**: winners displayed, links into Tournament Archives

### 3.4 Admin Portal
- Create / edit / delete tournaments
- Manage rounds and enter results
- Verify/reject submitted "Enter Game" entries (§2.6)
- Manage Candidates page entries
- Manage News/Announcements
- Manage Material Links
- (Role-gated: admin/moderator accounts only)

---

## 4. Two Rating Systems — Summary

| | Chess.com Rating | Local (College) Rating |
|---|---|---|
| Source | Chess.com API | Verified local games only |
| Scope | Global, all Chess.com play | Tournament games + verified friendly/fun games |
| Editable by admin? | No (mirrored) | Indirectly, via game verification |
| Time controls | Rapid, Blitz, Bullet | Classical, Rapid, Blitz |
| Purpose | Show external strength/activity | Rank community standing based on actual local play |

---

## 5. Game Types Feeding Local Rating

1. **Tournament games** — generated via the Swiss system, results entered by admin during the event (auto-verified, since admin enters them).
2. **Fun / friendly games** — submitted via "Enter Game" by any member, require admin verification before counting.

Both game types feed the *same* local rating pool, tagged with a `source: tournament | friendly` field so history/analytics can distinguish them if needed later.

---

## 6. Local Rating Logic (Elo-based)

Use a standard **Elo rating system**, computed per time control (classical/rapid/blitz tracked separately, each player starts with their own rating per control — default starting rating e.g. 1200).

### 6.1 Core formula

For a game between Player A (rating `Ra`) and Player B (rating `Rb`):

1. **Expected score** for A:
   `Ea = 1 / (1 + 10^((Rb - Ra) / 400))`
   (and `Eb = 1 - Ea`)

2. **Actual score**:
   - Win = 1, Draw = 0.5, Loss = 0

3. **Rating update**:
   `Ra_new = Ra + K * (Sa - Ea)`
   `Rb_new = Rb + K * (Sb - Eb)`

This is why a win against a higher-rated player adds more points than a win against a lower-rated one (Ea was low, so `Sa - Ea` is large) — and losing to a much weaker player subtracts more than losing to a peer.

### 6.2 K-factor (how fast rating moves)

Use a tiered K-factor so new/uncertain players move faster and settled players move slower:

| Condition | K |
|---|---|
| Fewer than 20 rated games played | 40 |
| Rating < 2000, 20+ games | 20 |
| Rating ≥ 2000 | 10 |

(Tune these thresholds later based on how many active players you actually get — with a small pool, you may want a flatter K, e.g. just 32 for everyone initially, to avoid extreme swings on a thin dataset.)

### 6.3 Applying updates — event ordering

- **Tournament**: apply Elo updates round-by-round in the order rounds are entered (not all games simultaneously), so ratings used for pairing round N+1 reflect round N results if you want live-adjusting Swiss; otherwise apply all updates at tournament end using pre-tournament ratings for every round (simpler, avoids mid-event volatility). **Recommend: apply at tournament end**, computed sequentially game-by-game in the order rounds were played, using each player's rating *as of that point in the tournament*.
- **Friendly game**: applied at the moment of admin verification, using each player's current rating at that time.
- If two games affecting the same player are verified concurrently, process verification actions sequentially (queue), not in parallel, to avoid race conditions on rating writes.

### 6.4 Separate pools per time control

A player has independent ratings for Classical / Rapid / Blitz. A blitz game only updates blitz rating, etc. Game submission form requires selecting the correct time control so it updates the right pool.

### 6.5 Data model sketch

```
Player
  id, name, chessComUsername
  ratingClassical, gamesClassical
  ratingRapid, gamesRapid
  ratingBlitz, gamesBlitz

Game
  id, whiteId, blackId, result (white|black|draw)
  timeControl (classical|rapid|blitz)
  source (tournament|friendly)
  tournamentId (nullable)
  status (pending|verified|rejected)
  verifiedBy, verifiedAt
  ratingDeltaWhite, ratingDeltaBlack   // snapshot at time of application

Tournament
  id, name, date, timeControl, format (swiss)
  rounds[]: { roundNumber, pairings[]: { whiteId, blackId, result } }
  standings[] (derived)
```

### 6.6 Anti-abuse

- Friendly games always start `pending`; only count toward rating after admin verification — prevents fabricated results.
- Tournament games are effectively pre-verified because an admin is the one entering them during the event.
- Consider rate-limiting/flagging repeated submissions between the same two players in a short window (common self-boosting pattern) for admin review.

---

## 6.7 Implementation status (v2 — Supabase build)

The app now runs on Supabase (Postgres + Auth) instead of mock data. See `supabase/schema.sql` for the full schema
and RPC functions; `docs/SUPABASE_SETUP.md` for setup steps. Scope was trimmed to: Ratings, Friendly Matches,
Tournaments, Admin Portal (plus login/signup) — News/Puzzles/Endgames/Materials/Candidates pages were removed for
now but the original spec above still describes them if/when they come back.

Key behavioral notes:
- Signup requires a valid Chess.com username (verified live against the Chess.com API) and a unique SC code; the
  Chess.com avatar becomes the profile photo automatically.
- Friendly games: reporter submits a claim, the *other* player must confirm before Elo is applied — enforced
  server-side (a user cannot confirm their own submission).
- Tournament games: entered directly by an admin in `/admin`, auto-verified, ratings applied immediately.
- All Elo math lives in Postgres (`supabase/schema.sql`, function `_apply_elo`) so concurrent confirmations can't
  race — `src/lib/elo.js` is kept as a readable reference of the same formula but is no longer called at runtime.

## 7. Open Items / To Be Defined Later

- Additional homepage sections (user mentioned more will be specified later)
- Puzzle content source (self-hosted vs. third-party dataset)
- Auth provider / account system details
- Exact K-factor tuning once real usage data exists
- Whether Swiss pairing needs tie-break rules (Buchholz, Sonneborn-Berger, etc.) for standings beyond points
