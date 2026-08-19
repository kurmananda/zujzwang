"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PlayerAutocomplete from "@/components/PlayerAutocomplete";
import { CheckIcon } from "@/components/icons";

export default function NewGameForm({ onDone }) {
  const supabase = createClient();

  const [players, setPlayers] = useState([]);
  const [me, setMe] = useState(null);
  const [opponentId, setOpponentId] = useState("");
  const [iPlayedWhite, setIPlayedWhite] = useState(true);
  const [myResult, setMyResult] = useState("win");
  const [timeControl, setTimeControl] = useState("rapid");
  const [gameUrl, setGameUrl] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user));
    supabase
      .from("profiles")
      .select("id, name, chess_com_username")
      .then(({ data }) => {
        setPlayers(data ?? []);
        if (data?.length) setOpponentId(data[0].id);
      });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const { error } = await supabase.rpc("submit_friendly_game", {
      p_opponent_id: opponentId,
      p_i_played_white: iPlayedWhite,
      p_my_result: myResult,
      p_time_control: timeControl,
      p_game_url: gameUrl || null,
    });

    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => onDone?.(), 1100);
  }

  const opponents = players.filter((p) => p.id !== me?.id);

  if (done) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-4 text-emerald-700 dark:text-emerald-400">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
          <CheckIcon className="h-4.5 w-4.5" />
        </span>
        <p className="text-sm font-medium">Submitted — your opponent will confirm to lock in ratings.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-1.5 block text-sm font-medium">Opponent</label>
        <PlayerAutocomplete players={opponents} value={opponentId} onChange={setOpponentId} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium">I played</label>
          <select
            value={iPlayedWhite ? "white" : "black"}
            onChange={(e) => setIPlayedWhite(e.target.value === "white")}
            className="field-input"
          >
            <option value="white">White</option>
            <option value="black">Black</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Result</label>
          <select value={myResult} onChange={(e) => setMyResult(e.target.value)} className="field-input">
            <option value="win">I won</option>
            <option value="loss">I lost</option>
            <option value="draw">Draw</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">Time Control</label>
        <div className="flex gap-2">
          {["classical", "rapid", "blitz"].map((tc) => (
            <button
              type="button"
              key={tc}
              onClick={() => setTimeControl(tc)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-all duration-150 ${
                timeControl === tc
                  ? "border-emerald-700 bg-gradient-to-br from-emerald-700/15 to-emerald-700/5 text-emerald-800 shadow-[inset_0_0_0_1px] shadow-emerald-700/30 dark:text-emerald-400"
                  : "border-black/[.12] text-zinc-600 hover:-translate-y-0.5 hover:border-black/25 dark:border-white/[.15] dark:text-zinc-400 dark:hover:border-white/30"
              }`}
            >
              {tc}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">Game Link (optional)</label>
        <input
          type="url"
          placeholder="https://www.chess.com/game/live/…"
          value={gameUrl}
          onChange={(e) => setGameUrl(e.target.value)}
          className="field-input"
        />
        <p className="mt-1.5 text-xs text-zinc-500">Skip this and the match won&apos;t have an &quot;Open Match&quot; link.</p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/[.06] px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || !opponentId}
        className="pill-btn pill-btn-primary w-full justify-center py-2.5 transition-all duration-200 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit Result"}
      </button>
    </form>
  );
}
