"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CheckIcon, XIcon, UserIcon } from "@/components/icons";

export default function MatchesPage() {
  const supabase = createClient();
  const [me, setMe] = useState(null);
  const [games, setGames] = useState([]);
  const [players, setPlayers] = useState({});
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    setMe(userData.user);

    const [{ data: profiles }, { data: gameRows }] = await Promise.all([
      supabase.from("profiles").select("id, name"),
      supabase.from("games").select("*").order("created_at", { ascending: false }).limit(100),
    ]);

    const byId = {};
    for (const p of profiles ?? []) byId[p.id] = p.name;
    setPlayers(byId);
    setGames(gameRows ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function confirm(gameId) {
    const { error } = await supabase.rpc("confirm_friendly_game", { p_game_id: gameId });
    if (error) alert(error.message);
    load();
  }

  async function reject(gameId) {
    const { error } = await supabase.rpc("reject_friendly_game", { p_game_id: gameId });
    if (error) alert(error.message);
    load();
  }

  if (loading) return <div className="mx-auto max-w-3xl px-6 py-12 text-sm text-zinc-500">Loading…</div>;

  const awaitingMyConfirmation = games.filter(
    (g) =>
      g.status === "pending" &&
      g.source === "friendly" &&
      g.reporter_id !== me?.id &&
      (g.white_id === me?.id || g.black_id === me?.id)
  );

  const friendlyGames = games.filter((g) => g.source === "friendly");
  const tournamentGames = games.filter((g) => g.source === "tournament");

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Friendly Matches &amp; Fun Games</h1>
      <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
        Report a result — it lands here for your opponent, who confirms before it touches ratings.
      </p>

      {awaitingMyConfirmation.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-amber-700 dark:text-amber-400">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
            </span>
            Waiting on your confirmation
          </h2>
          <ul className="mt-3 space-y-3">
            {awaitingMyConfirmation.map((g) => (
              <li key={g.id} className="card-hover rounded-2xl border border-amber-500/30 bg-amber-500/[.07] p-4 shadow-sm">
                <p className="flex flex-wrap items-center gap-1 text-sm">
                  <UserIcon className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="font-medium">{players[g.white_id]}</span>{" "}
                  <span className="text-zinc-500">vs</span>{" "}
                  <UserIcon className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="font-medium">{players[g.black_id]}</span>
                  <span className="text-zinc-500"> — reported result: </span>
                  <span className="font-semibold capitalize">{g.result}</span> · <span className="capitalize">{g.time_control}</span>
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => confirm(g.id)}
                    className="pill-btn bg-emerald-600 px-3.5 py-1.5 text-xs text-white transition-all duration-150 hover:-translate-y-0.5 hover:bg-emerald-500 hover:shadow-md"
                  >
                    <CheckIcon className="h-3.5 w-3.5" /> Confirm
                  </button>
                  <button
                    onClick={() => reject(g.id)}
                    className="pill-btn border border-red-500/30 bg-red-500/10 px-3.5 py-1.5 text-xs text-red-600 transition-all duration-150 hover:-translate-y-0.5 hover:bg-red-500/20 dark:text-red-400"
                  >
                    <XIcon className="h-3.5 w-3.5" /> Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold">Fun Games (Friendly)</h2>
        <GameList games={friendlyGames} players={players} />
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold">Tournament Games</h2>
        <GameList games={tournamentGames} players={players} />
      </section>
    </div>
  );
}

const STATUS_STYLES = {
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  confirmed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  rejected: "bg-red-500/10 text-red-600 dark:text-red-400",
};

function GameList({ games, players }) {
  if (games.length === 0)
    return (
      <p className="mt-3 rounded-xl border border-dashed border-black/[.1] px-4 py-6 text-center text-sm text-zinc-500 dark:border-white/[.12]">
        None yet.
      </p>
    );
  return (
    <ul className="mt-3 space-y-2">
      {games.map((g) => (
        <li
          key={g.id}
          className="card-hover flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/[.08] bg-white/50 p-3.5 text-sm shadow-sm transition-colors hover:bg-white/70 dark:border-white/[.1] dark:bg-white/[.02] dark:hover:bg-white/[.05]"
        >
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLES[g.status] ?? ""}`}>
              {g.status}
            </span>
            <span>
              <span className="font-medium">{players[g.white_id]}</span>{" "}
              <span className="text-zinc-500">vs</span>{" "}
              <span className="font-medium">{players[g.black_id]}</span> —{" "}
              <span className="capitalize">{g.result}</span>{" "}
              <span className="text-zinc-500">({g.time_control})</span>
            </span>
          </div>

          {g.game_url ? (
            <a
              href={g.game_url}
              target="_blank"
              rel="noopener noreferrer"
              className="pill-btn bg-foreground px-3 py-1.5 text-xs text-background transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
            >
              Open Match →
            </a>
          ) : (
            <button
              disabled
              title="No game link was provided"
              className="cursor-not-allowed rounded-full border border-black/[.1] px-3 py-1.5 text-xs font-medium text-zinc-400 dark:border-white/[.12] dark:text-zinc-600"
            >
              Open Match
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
