import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getChessComAvatar } from "@/lib/chesscom";
import UpcomingTournamentsPanel from "@/components/UpcomingTournamentsPanel";
import { TrophyIcon, CalendarIcon, ClockIcon, SwordsIcon, ArrowRightIcon } from "@/components/icons";

const STATUS_STYLES = {
  upcoming: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  live: "bg-red-500/10 text-red-600 dark:text-red-400",
};

export default async function Home() {
  let topPlayers = [];
  let stats = { players: 0, games: 0, tournaments: 0 };
  let upcomingTournaments = [];
  let pastTournaments = [];
  let recentMatches = [];
  let nameById = {};
  let isLoggedIn = false;

  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    isLoggedIn = !!user;

    const [
      { data: profiles },
      { count: gameCount },
      { count: tournamentCount },
      { data: tournaments },
      { data: standings },
      { data: games },
    ] = await Promise.all([
      supabase.from("profiles").select("id, name, photo_url, chess_com_username, ratings"),
      supabase.from("games").select("id", { count: "exact", head: true }).eq("status", "confirmed"),
      supabase.from("tournaments").select("id", { count: "exact", head: true }),
      supabase.from("tournaments").select("*").order("start_date", { ascending: false, nullsFirst: false }),
      supabase.from("tournament_standings").select("*").eq("is_winner", true),
      supabase
        .from("games")
        .select("*")
        .eq("status", "confirmed")
        .order("created_at", { ascending: false })
        .limit(4),
    ]);

    topPlayers = (profiles ?? []).sort((a, b) => b.ratings.rapid - a.ratings.rapid).slice(0, 3);
    topPlayers = await Promise.all(
      topPlayers.map(async (p) => ({
        ...p,
        photo_url: p.photo_url || (await getChessComAvatar(p.chess_com_username)),
      }))
    );
    stats = { players: profiles?.length ?? 0, games: gameCount ?? 0, tournaments: tournamentCount ?? 0 };
    nameById = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.name]));

    const winnerByTournament = Object.fromEntries(
      (standings ?? []).map((s) => [s.tournament_id, nameById[s.player_id]])
    );
    const all = (tournaments ?? []).map((t) => ({ ...t, winner: winnerByTournament[t.id] }));
    upcomingTournaments = all.filter((t) => t.status !== "completed").slice(0, 3);
    pastTournaments = all.filter((t) => t.status === "completed").slice(0, 3);
    recentMatches = games ?? [];
  }

  return (
    <div>
      <section className="chess-pattern relative overflow-hidden border-b border-black/[.06] bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 dark:border-white/[.08]">
        <span aria-hidden className="float-piece pointer-events-none absolute -right-6 top-8 hidden select-none text-[9rem] leading-none text-white/[.04] lg:block">
          ♞
        </span>
        <span aria-hidden className="pointer-events-none absolute -bottom-10 left-[-2rem] hidden select-none text-[8rem] leading-none text-white/[.03] lg:block">
          ♜
        </span>

        <div className="relative mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-[1.3fr_0.9fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-300">
              ♛ The College Chess Club
            </span>
            <h1 className="font-display mt-5 text-5xl font-semibold leading-tight tracking-tight text-white sm:text-6xl">
              <span className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
                ZUJZWANG
              </span>
            </h1>
            <p className="mt-4 max-w-lg text-lg text-emerald-100/80">
              The chess club&apos;s Chess.com stats, mirrored live — next to a college rating that only moves
              when a real, confirmed game says so.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/matches/new"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-6 py-3 text-sm font-semibold text-emerald-950 shadow-lg shadow-amber-900/30 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-xl hover:shadow-amber-900/40"
              >
                + Report a Game
              </Link>
              <Link
                href="/leaderboard"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-medium text-white backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-white/35 hover:bg-white/10"
              >
                View Ratings
              </Link>
            </div>

            {stats.players > 0 && (
              <div className="mt-9 grid max-w-md grid-cols-3 gap-3">
                <div className="stat-chip transition-transform duration-200 hover:-translate-y-0.5 hover:bg-white/[.08]">
                  <span className="text-xl font-semibold text-white">{stats.players}</span>
                  <span className="text-[11px] uppercase tracking-wide text-emerald-200/70">Players</span>
                </div>
                <div className="stat-chip transition-transform duration-200 hover:-translate-y-0.5 hover:bg-white/[.08]">
                  <span className="text-xl font-semibold text-white">{stats.games}</span>
                  <span className="text-[11px] uppercase tracking-wide text-emerald-200/70">Games Played</span>
                </div>
                <div className="stat-chip transition-transform duration-200 hover:-translate-y-0.5 hover:bg-white/[.08]">
                  <span className="text-xl font-semibold text-white">{stats.tournaments}</span>
                  <span className="text-[11px] uppercase tracking-wide text-emerald-200/70">Tournaments</span>
                </div>
              </div>
            )}
          </div>

          {topPlayers.length > 0 && (
            <div className="chess-board-tile rounded-2xl border border-white/10 bg-white/[.06] p-5 shadow-2xl shadow-black/30 backdrop-blur-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-amber-300">Top Rated · Rapid</p>
              <ul className="mt-3 space-y-3">
                {topPlayers.map((p, i) => (
                  <li
                    key={p.name}
                    className="flex items-center gap-3 rounded-xl border border-white/[.06] bg-black/10 px-2.5 py-2 transition-colors hover:bg-black/20"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400/15 text-xs font-bold text-amber-300">
                      {i + 1}
                    </span>
                    <img
                      src={p.photo_url || "/next.svg"}
                      alt=""
                      className="h-9 w-9 rounded-full bg-white/10 object-cover ring-2 ring-white/10"
                    />
                    <span className="flex-1 text-sm font-medium text-white">{p.name}</span>
                    <span className="rounded-full bg-amber-400/10 px-2 py-1 text-sm font-semibold text-amber-200">
                      {p.ratings.rapid}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-14">
        <section className="featured-panel relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 p-6 sm:p-8">
          <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 select-none text-[11rem] leading-none text-white/[.03]">
            ♜
          </span>
          <div className="relative flex items-center justify-between">
            <h2 className="font-display flex items-center gap-2.5 text-xl font-semibold tracking-tight text-white sm:text-2xl">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
                <CalendarIcon className="h-5 w-5" />
              </span>
              Upcoming Tournaments
            </h2>
            <Link
              href={isLoggedIn ? "/tournaments" : "/login"}
              className="group hidden items-center gap-1 text-sm font-medium text-amber-300/90 transition-colors hover:text-amber-200 sm:flex"
            >
              See all <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <UpcomingTournamentsPanel tournaments={upcomingTournaments} isLoggedIn={isLoggedIn} />
        </section>

        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <section>
            <div className="flex items-center justify-between">
              <h2 className="font-display flex items-center gap-2 text-base font-semibold tracking-tight">
                <TrophyIcon className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
                Past Champions
              </h2>
              <Link href={isLoggedIn ? "/tournaments" : "/login"} className="group flex items-center gap-1 text-xs font-medium text-zinc-500 transition-colors hover:text-foreground">
                All <ArrowRightIcon className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {pastTournaments.length === 0 ? (
                <EmptyCard label="No completed tournaments yet." />
              ) : (
                pastTournaments.map((t) => (
                  <Link
                    key={t.id}
                    href={isLoggedIn ? `/tournaments/${t.id}` : "/login"}
                    className="card-surface card-hover group flex items-center gap-3 rounded-xl p-4"
                  >
                    <span className="icon-tile flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-700/10 to-amber-500/10 text-amber-600 dark:text-amber-400">
                      <TrophyIcon className="h-4.5 w-4.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{t.name}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        Winner: <span className="font-medium text-zinc-700 dark:text-zinc-300">{t.winner ?? "TBD"}</span>
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between">
              <h2 className="font-display flex items-center gap-2 text-base font-semibold tracking-tight">
                <SwordsIcon className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
                Recent Matches
              </h2>
              <Link href={isLoggedIn ? "/matches" : "/login"} className="group flex items-center gap-1 text-xs font-medium text-zinc-500 transition-colors hover:text-foreground">
                All <ArrowRightIcon className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {recentMatches.length === 0 ? (
                <EmptyCard label="No confirmed games yet." />
              ) : (
                recentMatches.map((g) => (
                  <Link
                    key={g.id}
                    href={isLoggedIn ? "/matches" : "/login"}
                    className="card-surface card-hover group flex items-center gap-3 rounded-xl p-4"
                  >
                    <span className="icon-tile flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-700/10 to-amber-500/10 text-emerald-700 dark:text-emerald-400">
                      <ClockIcon className="h-4.5 w-4.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {nameById[g.white_id] ?? "Player"} <span className="text-zinc-400">vs</span> {nameById[g.black_id] ?? "Player"}
                      </p>
                      <p className="mt-0.5 text-xs capitalize text-zinc-500">
                        {g.result} · {g.time_control}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      <div className="border-t border-black/[.06] bg-black/[.015] dark:border-white/[.06] dark:bg-white/[.015]">
        <div className="mx-auto max-w-6xl px-6 py-12 text-center">
          <p className="font-display text-lg font-semibold">Played a game? Get it on the board.</p>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
            Report the result — your opponent gets notified instantly and confirms with one tap before ratings move.
          </p>
          <Link
            href="/matches/new"
            className="pill-btn pill-btn-primary mt-5 px-6 py-3 transition-all duration-200 hover:-translate-y-0.5"
          >
            + Report a Game
          </Link>
        </div>
      </div>
    </div>
  );
}

function EmptyCard({ label }) {
  return (
    <p className="rounded-xl border border-dashed border-black/[.1] px-4 py-6 text-center text-sm text-zinc-500 dark:border-white/[.12]">
      {label}
    </p>
  );
}
