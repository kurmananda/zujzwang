"use client";

import { useMemo, useState } from "react";
import { ShuffleIcon, ChevronDownIcon } from "@/components/icons";

const TIME_CONTROLS = ["classical", "rapid", "blitz"];

function shuffled(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function RatingsExplorer({ players }) {
  const [tab, setTab] = useState("highest"); // highest | random
  const [timeControl, setTimeControl] = useState("rapid");
  const [query, setQuery] = useState("");
  const [randomSeed, setRandomSeed] = useState(0);
  const [selected, setSelected] = useState(null);

  const searchResults = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.trim().toLowerCase();
    return players.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sc_code.toLowerCase().includes(q) ||
        p.chess_com_username.toLowerCase().includes(q)
    );
  }, [players, query]);

  const randomSet = useMemo(() => shuffled(players).slice(0, 8), [players, randomSeed]);

  const highestSet = useMemo(
    () => [...players].sort((a, b) => b.ratings[timeControl] - a.ratings[timeControl]),
    [players, timeControl]
  );

  const listToShow = searchResults ?? (tab === "highest" ? highestSet : randomSet);

  return (
    <div>
      <input
        type="text"
        placeholder="Search by name, SC code, or Chess.com username…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-xl border border-black/[.1] bg-white/60 px-4 py-2.5 text-sm shadow-sm outline-none focus:border-emerald-600/50 dark:border-white/[.15] dark:bg-white/[.04]"
      />

      {!searchResults && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex rounded-full border border-black/[.1] bg-white/50 p-1 text-sm dark:border-white/[.15] dark:bg-white/[.04]">
            <button
              onClick={() => setTab("highest")}
              className={`rounded-full px-3 py-1 transition-colors ${
                tab === "highest" ? "bg-gradient-to-r from-emerald-700 to-emerald-900 text-white" : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              Highest Rated
            </button>
            <button
              onClick={() => setTab("random")}
              className={`rounded-full px-3 py-1 transition-colors ${
                tab === "random" ? "bg-gradient-to-r from-emerald-700 to-emerald-900 text-white" : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              Random Discover
            </button>
          </div>

          {tab === "highest" && (
            <div className="flex gap-2 text-sm">
              {TIME_CONTROLS.map((tc) => (
                <button
                  key={tc}
                  onClick={() => setTimeControl(tc)}
                  className={`rounded-full border px-3 py-1 capitalize transition-colors dark:border-white/[.15] ${
                    timeControl === tc
                      ? "border-emerald-700 bg-emerald-700/10 text-emerald-800 dark:text-emerald-400"
                      : "border-black/[.1] text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  {tc}
                </button>
              ))}
            </div>
          )}

          {tab === "random" && (
            <button
              onClick={() => setRandomSeed((s) => s + 1)}
              className="pill-btn-ghost flex items-center gap-1.5 rounded-full px-3 py-1 text-sm"
            >
              <ShuffleIcon className="h-3.5 w-3.5" />
              Shuffle
            </button>
          )}
        </div>
      )}

      <div className="mt-5 hidden items-center gap-4 px-4 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 sm:flex">
        <span className="w-6" />
        <span className="flex-1">Player</span>
        <span className="w-20 text-center">Chess.com</span>
        <span className="w-16 text-center">College</span>
        <span className="w-4" />
      </div>
      <ul className="card-surface mt-1.5 divide-y divide-black/[.06] rounded-xl px-1 dark:divide-white/[.08] sm:mt-0">
        {listToShow.map((p, i) => {
          const showRank = !searchResults && tab === "highest";
          const topThree = showRank && i < 3;
          return (
            <li key={p.id}>
              <button
                onClick={() => setSelected(p)}
                className="group flex w-full items-center gap-4 py-3 text-left transition-colors hover:bg-black/[.02] dark:hover:bg-white/[.04]"
              >
                {showRank && (
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      topThree
                        ? "bg-gradient-to-br from-amber-300 to-amber-600 text-emerald-950"
                        : "text-zinc-500"
                    }`}
                  >
                    {i + 1}
                  </span>
                )}
                <img
                  src={p.photo_url || "/next.svg"}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover bg-black/[.05] ring-1 ring-black/[.06] dark:ring-white/[.08]"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">{p.name}</p>
                  <p className="text-xs text-zinc-500">@{p.chess_com_username} · {p.sc_code}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2 sm:gap-4">
                  <span className="w-20 text-center">
                    {p.chesscom_ratings?.[tab === "highest" && timeControl !== "classical" ? timeControl : "rapid"] != null ? (
                      <span
                        title="Chess.com rating"
                        className="inline-flex items-center gap-1.5 rounded-full border border-black/[.08] bg-black/[.02] px-2.5 py-1 text-xs font-semibold text-zinc-600 dark:border-white/[.1] dark:bg-white/[.03] dark:text-zinc-300"
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#7fa650]" aria-hidden />
                        {p.chesscom_ratings[tab === "highest" && timeControl !== "classical" ? timeControl : "rapid"]}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400">—</span>
                    )}
                  </span>
                  <span className="w-16 text-center">
                    <p className="rounded-full bg-emerald-700/10 px-2.5 py-1 text-sm font-semibold text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-400">
                      {p.ratings[tab === "highest" ? timeControl : "rapid"]}
                    </p>
                  </span>
                  <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 -rotate-90 text-zinc-400 transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            </li>
          );
        })}
        {listToShow.length === 0 && (
          <p className="py-6 text-center text-sm text-zinc-500">No players found.</p>
        )}
      </ul>

      {selected && <PlayerDetailModal player={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function PlayerDetailModal({ player, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="chess-board-tile w-full max-w-sm rounded-2xl border border-black/[.1] bg-background p-6 shadow-2xl dark:border-white/[.15]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-4">
          <img
            src={player.photo_url || "/next.svg"}
            alt=""
            className="h-14 w-14 rounded-full object-cover bg-black/[.05] ring-2 ring-amber-500/30"
          />
          <div>
            <p className="font-display font-semibold">{player.name}</p>
            <p className="text-sm text-zinc-500">@{player.chess_com_username}</p>
          </div>
        </div>

        <dl className="mt-5 space-y-2 text-sm">
          <Row label="SC Code" value={player.sc_code} />
          <Row label="College — Classical" value={player.ratings.classical} />
          <Row label="College — Rapid" value={player.ratings.rapid} />
          <Row label="College — Blitz" value={player.ratings.blitz} />
          {player.chesscom_ratings && (
            <>
              <Row label="Chess.com — Rapid" value={player.chesscom_ratings.rapid ?? "—"} />
              <Row label="Chess.com — Blitz" value={player.chesscom_ratings.blitz ?? "—"} />
              <Row label="Chess.com — Bullet" value={player.chesscom_ratings.bullet ?? "—"} />
            </>
          )}
        </dl>

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-full border border-black/[.12] py-2 text-sm dark:border-white/[.2]"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between border-b border-black/[.05] pb-1.5 dark:border-white/[.08]">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
