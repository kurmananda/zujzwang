// Seeds fake club members, a friendly game, and a completed tournament.
// Usage: node scripts/seed.mjs   (reads .env.local for Supabase keys)
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  try {
    const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m) process.env[m[1]] ??= m[2].trim();
    }
  } catch {
    // no .env.local — assume env is already set
  }
}
loadEnvLocal();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// 5 famous GMs — high, realistic ratings.
const FAMOUS_USERS = [
  { name: "Magnus Carlsen", scCode: "SC2001", chessComUsername: "MagnusCarlsen", email: "seed.magnus@example.com" },
  { name: "Hikaru Nakamura", scCode: "SC2002", chessComUsername: "Hikaru", email: "seed.hikaru@example.com" },
  { name: "Fabiano Caruana", scCode: "SC2003", chessComUsername: "FabianoCaruana", email: "seed.fabiano@example.com" },
  { name: "Levy Rozman", scCode: "SC2004", chessComUsername: "GothamChess", email: "seed.levy@example.com" },
  { name: "Anish Giri", scCode: "SC2005", chessComUsername: "anishgiri", email: "seed.anish@example.com" },
];

// Ordinary fake club members — modest, everyday ratings.
const FAKE_STUDENTS = [
  { name: "Priya Nair", scCode: "SC3001", chessComUsername: "priyanair_chess", email: "seed.priya@example.com" },
  { name: "Arjun Mehta", scCode: "SC3002", chessComUsername: "arjunmehta99", email: "seed.arjun@example.com" },
  { name: "Sofia Alvarez", scCode: "SC3003", chessComUsername: "sofia_alvarez22", email: "seed.sofia@example.com" },
  { name: "Daniel Kim", scCode: "SC3004", chessComUsername: "danielkim_cc", email: "seed.daniel@example.com" },
  { name: "Aisha Rahman", scCode: "SC3005", chessComUsername: "aisha_rahman01", email: "seed.aisha@example.com" },
  { name: "Ethan Brooks", scCode: "SC3006", chessComUsername: "ethanbrooks_chess", email: "seed.ethan@example.com" },
];

const FAKE_USERS = [...FAMOUS_USERS, ...FAKE_STUDENTS];
const PASSWORD = "seedpass123";

async function chessComAvatar(username) {
  try {
    const res = await fetch(`https://api.chess.com/pub/player/${username}`, {
      headers: { "User-Agent": "zujzwang-seed-script" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { avatar: data.avatar ?? null, canonical: data.username };
  } catch {
    return null;
  }
}

async function main() {
  console.log("Creating fake users…");
  const created = [];
  const newlyCreated = new Set();

  for (const u of FAKE_USERS) {
    const profile = await chessComAvatar(u.chessComUsername);

    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: {
        name: u.name,
        sc_code: u.scCode,
        chess_com_username: profile?.canonical ?? u.chessComUsername,
        photo_url: profile?.avatar ?? null,
      },
    });

    if (error) {
      // Already seeded in a previous run — look the profile up so games/tournaments
      // can still be seeded against it below.
      const { data: existing } = await supabase.from("profiles").select("id").eq("sc_code", u.scCode).maybeSingle();
      if (existing) {
        created.push({ ...u, id: existing.id });
        console.log(`  = ${u.name} (already exists)`);
      } else {
        console.log(`  skip ${u.name}: ${error.message}`);
      }
      continue;
    }
    created.push({ ...u, id: data.user.id });
    newlyCreated.add(u.name);
    console.log(`  + ${u.name}`);
  }

  if (created.length === 0) {
    console.log("No seeded users found or created. Exiting.");
    return;
  }

  // Give each newly seeded player varied, non-default ratings so the leaderboard looks
  // real. Famous GMs sit near the top; fake students get everyday club-level ratings.
  // Skipped for users that already existed, so re-runs don't keep re-randomizing them.
  if (newlyCreated.size > 0) {
    console.log("Randomizing ratings for new users…");
    const famousNames = new Set(FAMOUS_USERS.map((u) => u.name));
    for (const u of created) {
      if (!newlyCreated.has(u.name)) continue;
      const isFamous = famousNames.has(u.name);
      const base = isFamous ? 1900 : 900;
      const spread = isFamous ? 500 : 500;
      const ratings = {
        classical: base + Math.floor(Math.random() * spread),
        rapid: base + Math.floor(Math.random() * spread),
        blitz: base + Math.floor(Math.random() * spread),
      };
      const games_played = isFamous
        ? { classical: 40, rapid: 90, blitz: 150 }
        : { classical: 6, rapid: 14, blitz: 22 };
      await supabase.from("profiles").update({ ratings, games_played }).eq("id", u.id);
    }
  }

  // A handful of confirmed friendly games with varied results/time controls, so the
  // homepage "Recent Matches" feed and /matches page have real examples to show.
  // Guarded so re-running the script doesn't pile up duplicate games.
  const { count: existingFriendlyCount } = await supabase
    .from("games")
    .select("id", { count: "exact", head: true })
    .eq("source", "friendly")
    .in("reporter_id", created.map((u) => u.id));

  if (created.length >= 2 && !existingFriendlyCount) {
    console.log("Seeding friendly games…");
    const pick = (i) => created[i % created.length];
    const friendlyGames = [
      { w: 0, b: 1, result: "white", tc: "blitz", url: "https://www.chess.com/games", dw: 8, db: -8 },
      { w: 1, b: 0, result: "draw", tc: "rapid", url: null, dw: 1, db: -1 },
      { w: 2, b: 3, result: "black", tc: "rapid", url: "https://www.chess.com/games", dw: -10, db: 10 },
      { w: 3, b: 4, result: "white", tc: "classical", url: null, dw: 12, db: -12 },
      { w: 4, b: 5, result: "white", tc: "blitz", url: "https://www.chess.com/games", dw: 6, db: -6 },
      { w: 5, b: 6, result: "draw", tc: "rapid", url: null, dw: 0, db: 0 },
      { w: 6, b: 2, result: "black", tc: "blitz", url: "https://www.chess.com/games", dw: -7, db: 7 },
      { w: 0, b: 3, result: "white", tc: "rapid", url: null, dw: 5, db: -5 },
    ]
      .filter((g) => pick(g.w).id !== pick(g.b).id)
      .map((g) => ({
        white_id: pick(g.w).id,
        black_id: pick(g.b).id,
        result: g.result,
        time_control: g.tc,
        source: "friendly",
        reporter_id: pick(g.w).id,
        status: "confirmed",
        rating_delta_white: g.dw,
        rating_delta_black: g.db,
        game_url: g.url,
        confirmed_at: new Date().toISOString(),
      }));
    await supabase.from("games").insert(friendlyGames);

    // One still-pending friendly result, to show the "waiting on confirmation" state.
    if (created.length >= 4) {
      await supabase.from("games").insert({
        white_id: created[3].id,
        black_id: created[0].id,
        result: "white",
        time_control: "blitz",
        source: "friendly",
        reporter_id: created[3].id,
        status: "pending",
        game_url: null,
      });
    }
  }

  // Two demo tournaments (completed + upcoming), each seeded once — guarded by name
  // so re-running the script doesn't create duplicates.
  const { data: existingCompleted } = await supabase
    .from("tournaments")
    .select("id")
    .eq("name", "Club Championship — Seed Edition")
    .maybeSingle();
  const { data: existingUpcoming } = await supabase
    .from("tournaments")
    .select("id")
    .eq("name", "Monsoon Blitz Open")
    .maybeSingle();

  let tournament = existingCompleted;
  if (!tournament) {
    console.log("Seeding a completed tournament with matches…");
    const { data, error } = await supabase
      .from("tournaments")
      .insert({
        name: "Club Championship — Seed Edition",
        date: "2026-07-15",
        start_date: "2026-07-12",
        end_date: "2026-07-15",
        format: "round_robin",
        time_control: "rapid",
        status: "completed",
        created_by: created[0].id,
      })
      .select()
      .single();
    if (error) {
      console.error("  ! tournament insert failed:", error.message);
      console.error("    Have you run supabase/migration_003_tournament_matches.sql yet?");
    }
    tournament = data;
  } else {
    console.log("Completed tournament already seeded — skipping.");
  }

  let upcoming = existingUpcoming;
  if (!upcoming) {
    console.log("Seeding an upcoming tournament with round 1 paired…");
    const { data, error } = await supabase
      .from("tournaments")
      .insert({
        name: "Monsoon Blitz Open",
        date: "2026-09-20",
        start_date: "2026-09-20",
        end_date: "2026-09-21",
        format: "swiss",
        time_control: "blitz",
        status: "upcoming",
        created_by: created[0].id,
      })
      .select()
      .single();
    if (error) {
      console.error("  ! tournament insert failed:", error.message);
      console.error("    Have you run supabase/migration_003_tournament_matches.sql yet?");
    }
    upcoming = data;
  } else {
    console.log("Upcoming tournament already seeded — skipping.");
  }

  if (tournament && !existingCompleted && created.length >= 4) {
    const field = created.slice(0, 4); // 4-player round robin -> 3 rounds
    await supabase
      .from("tournament_players")
      .insert(field.map((p, i) => ({ tournament_id: tournament.id, player_id: p.id, seed: i + 1 })));

    // Circle-method round robin for 4 players, 3 rounds, with results already recorded.
    const roundPairs = [
      [[0, 3], [1, 2]],
      [[0, 2], [3, 1]],
      [[0, 1], [2, 3]],
    ];
    const results = ["white", "black", "draw", "white", "black", "white"];
    let ri = 0;
    const matches = [];
    roundPairs.forEach((pairs, roundIdx) => {
      pairs.forEach(([wi, bi], boardIdx) => {
        matches.push({
          tournament_id: tournament.id,
          round: roundIdx + 1,
          board_no: boardIdx + 1,
          white_id: field[wi].id,
          black_id: field[bi].id,
          result: results[ri % results.length],
          status: "confirmed",
        });
        ri++;
      });
    });
    const { data: insertedMatches } = await supabase.from("tournament_matches").insert(matches).select();

    // Mirror each match result into `games` (rated), same as admin_record_match_result would.
    if (insertedMatches) {
      const gameRows = insertedMatches.map((m) => ({
        white_id: m.white_id,
        black_id: m.black_id,
        result: m.result,
        time_control: "rapid",
        source: "tournament",
        tournament_id: tournament.id,
        reporter_id: created[0].id,
        status: "confirmed",
        rating_delta_white: m.result === "white" ? 6 : m.result === "black" ? -6 : 0,
        rating_delta_black: m.result === "black" ? 6 : m.result === "white" ? -6 : 0,
        confirmed_at: new Date().toISOString(),
      }));
      const { data: insertedGames } = await supabase.from("games").insert(gameRows).select("id");
      if (insertedGames) {
        await Promise.all(
          insertedMatches.map((m, i) =>
            supabase.from("tournament_matches").update({ game_id: insertedGames[i].id }).eq("id", m.id)
          )
        );
      }
    }

    // Standings: points per player from the results above (round robin, 3 games each).
    // 0 beat 3 (R1), beat 2 (R2), beat 1 (R3) -> 3 pts, clean winner.
    await supabase.from("tournament_standings").insert([
      { tournament_id: tournament.id, player_id: field[0].id, rank: 1, points: 3, is_winner: true },
      { tournament_id: tournament.id, player_id: field[2].id, rank: 2, points: 1.5, is_winner: false },
      { tournament_id: tournament.id, player_id: field[1].id, rank: 3, points: 1, is_winner: false },
      { tournament_id: tournament.id, player_id: field[3].id, rank: 4, points: 0.5, is_winner: false },
    ]);
  }

  if (upcoming && !existingUpcoming && created.length >= 8) {
    const field = created.slice(4, 8); // next 4 players
    await supabase
      .from("tournament_players")
      .insert(field.map((p, i) => ({ tournament_id: upcoming.id, player_id: p.id, seed: i + 1 })));
    await supabase.from("tournament_matches").insert([
      { tournament_id: upcoming.id, round: 1, board_no: 1, white_id: field[0].id, black_id: field[1].id, status: "pending" },
      { tournament_id: upcoming.id, round: 1, board_no: 2, white_id: field[2].id, black_id: field[3].id, status: "pending" },
    ]);
  }

  console.log(`\nDone. Log in as any seeded user with password "${PASSWORD}", e.g. seed.magnus@example.com.`);
}

main();
