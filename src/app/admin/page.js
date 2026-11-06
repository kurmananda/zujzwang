"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PlayerMultiSelect from "@/components/PlayerMultiSelect";
import DateField from "@/components/DateField";
import { LogOutIcon, TrophyIcon, SearchIcon } from "@/components/icons";

const SESSION_KEY = "zugzwang_admin_unlocked";

const RESULT_STYLES = {
  white: "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100",
  black: "bg-zinc-800 text-white dark:bg-zinc-900",
  draw: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
};

function shortId(id) {
  return id.slice(0, 8);
}

export default function AdminPage() {
  const supabase = createClient();
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [isAdmin, setIsAdmin] = useState(null);
  const [players, setPlayers] = useState([]);
  const [tournaments, setTournaments] = useState([]);

  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(null);
  const [unlocking, setUnlocking] = useState(false);

  const [newTournament, setNewTournament] = useState({
    name: "",
    startDate: "",
    endDate: "",
    format: "round_robin",
    timeControl: "rapid",
    numPlayers: "",
  });
  const [selectedPlayerIds, setSelectedPlayerIds] = useState([]);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState(null);

  const [activeTournamentId, setActiveTournamentId] = useState("");
  const [matches, setMatches] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [busyMatchId, setBusyMatchId] = useState(null);
  const [advancing, setAdvancing] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [highlightMatchId, setHighlightMatchId] = useState(null);

  const [matchSearch, setMatchSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);

  useEffect(() => {
    setUnlocked(sessionStorage.getItem(SESSION_KEY) === "true");
  }, []);

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    setMe(userData.user);
    if (!userData.user) return;

    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", userData.user.id).single();
    setIsAdmin(!!profile?.is_admin);

    const [{ data: profiles }, { data: tourneys }] = await Promise.all([
      supabase.from("profiles").select("id, name, chess_com_username").order("name"),
      supabase.from("tournaments").select("*").order("start_date", { ascending: false, nullsFirst: false }),
    ]);
    setPlayers(profiles ?? []);
    setTournaments(tourneys ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function loadMatches(tournamentId) {
    if (!tournamentId) {
      setMatches([]);
      return;
    }
    setMatchesLoading(true);
    const { data } = await supabase
      .from("tournament_matches")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("round", { ascending: true })
      .order("board_no", { ascending: true });
    setMatches(data ?? []);
    setMatchesLoading(false);
  }

  useEffect(() => {
    loadMatches(activeTournamentId);
  }, [activeTournamentId]);

  async function searchMatches(e) {
    e.preventDefault();
    const q = matchSearch.trim().toLowerCase();
    if (!q) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    const { data } = await supabase
      .from("tournament_matches")
      .select("*, tournaments(id, name)")
      .order("created_at", { ascending: false })
      .limit(500);
    setSearching(false);

    const byId = Object.fromEntries(players.map((p) => [p.id, p.name?.toLowerCase() ?? ""]));
    const hits = (data ?? []).filter(
      (m) =>
        m.id.toLowerCase().startsWith(q) ||
        (byId[m.white_id] ?? "").includes(q) ||
        (byId[m.black_id] ?? "").includes(q) ||
        (m.tournaments?.name ?? "").toLowerCase().includes(q)
    );
    setSearchResults(hits.slice(0, 12));
  }

  function jumpToMatch(m) {
    setSearchResults(null);
    setMatchSearch("");
    setHighlightMatchId(m.id);
    if (activeTournamentId !== m.tournament_id) {
      setActiveTournamentId(m.tournament_id);
    } else {
      loadMatches(m.tournament_id);
    }
    setTimeout(() => {
      document.getElementById(`match-${m.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 250);
    setTimeout(() => setHighlightMatchId(null), 3000);
  }

  async function unlock(e) {
    e.preventDefault();
    setUnlocking(true);
    setPasswordError(null);
    const { data, error } = await supabase.rpc("claim_admin", { p_password: password });
    setUnlocking(false);
    if (error || !data) {
      setPasswordError("Wrong password.");
      return;
    }
    sessionStorage.setItem(SESSION_KEY, "true");
    setUnlocked(true);
    setPassword("");
    load();
  }

  async function handleLogout() {
    sessionStorage.removeItem(SESSION_KEY);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function createTournament(e) {
    e.preventDefault();
    setCreating(true);
    setMessage(null);
    const { data, error } = await supabase.rpc("admin_create_tournament_full", {
      p_name: newTournament.name,
      p_start_date: newTournament.startDate,
      p_end_date: newTournament.endDate || newTournament.startDate,
      p_format: newTournament.format,
      p_time_control: newTournament.timeControl,
      p_player_ids: selectedPlayerIds,
    });
    setCreating(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Tournament created — schedule generated below.");
    setNewTournament({ name: "", startDate: "", endDate: "", format: "round_robin", timeControl: "rapid", numPlayers: "" });
    setSelectedPlayerIds([]);
    await load();
    setActiveTournamentId(data);
  }

  async function recordResult(matchId, result) {
    setBusyMatchId(matchId);
    const { error } = await supabase.rpc("admin_record_match_result", { p_match_id: matchId, p_result: result });
    setBusyMatchId(null);
    if (error) {
      setMessage(error.message);
      return;
    }
    loadMatches(activeTournamentId);
    load();
  }

  async function generateNextRound() {
    setAdvancing(true);
    const { error, data } = await supabase.rpc("admin_generate_next_swiss_round", { p_tournament_id: activeTournamentId });
    setAdvancing(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage(`Round ${data} generated.`);
    loadMatches(activeTournamentId);
    load();
  }

  async function finalizeTournament() {
    setFinalizing(true);
    const { error } = await supabase.rpc("admin_finalize_tournament", { p_tournament_id: activeTournamentId });
    setFinalizing(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Tournament finalized — standings and winner recorded.");
    load();
  }

  if (isAdmin === null) {
    return <div className="mx-auto max-w-3xl px-6 py-16 text-sm text-zinc-500">Loading…</div>;
  }

  if (!me) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center text-sm text-zinc-500">
        You need to be logged in to reach the admin portal.
      </div>
    );
  }

  if (!isAdmin || !unlocked) {
    return (
      <div className="mx-auto max-w-sm px-6 py-16">
        <div className="card-surface rounded-2xl p-8">
          <h1 className="text-xl font-semibold tracking-tight">Admin Access</h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Enter the admin password to unlock this portal. For security, this is asked again in every new tab
            or session.
          </p>
          <form onSubmit={unlock} className="mt-5 space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password"
              autoFocus
              className="field-input"
            />
            {passwordError && <p className="text-sm text-red-600 dark:text-red-400">{passwordError}</p>}
            <button
              disabled={unlocking || !password}
              className="pill-btn pill-btn-primary w-full justify-center py-2.5 disabled:opacity-50"
            >
              {unlocking ? "Checking…" : "Unlock"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const nameById = Object.fromEntries(players.map((p) => [p.id, p.name]));
  const activeTournament = tournaments.find((t) => t.id === activeTournamentId);
  const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b);
  const maxRound = rounds[rounds.length - 1];
  const currentRoundDone = maxRound && matches.filter((m) => m.round === maxRound).every((m) => m.status === "confirmed");
  const standings = Object.values(
    matches.reduce((acc, m) => {
      for (const id of [m.white_id, m.black_id]) {
        if (id && !acc[id]) acc[id] = { id, points: 0 };
      }
      if (m.status !== "confirmed") return acc;
      if (m.black_id === null) {
        acc[m.white_id].points += 1; // bye
      } else if (m.result === "draw") {
        acc[m.white_id].points += 0.5;
        acc[m.black_id].points += 0.5;
      } else if (m.result === "white") {
        acc[m.white_id].points += 1;
      } else if (m.result === "black") {
        acc[m.black_id].points += 1;
      }
      return acc;
    }, {})
  ).sort((a, b) => b.points - a.points);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Admin Portal</h1>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-full border border-red-500/25 bg-red-500/[.06] px-3.5 py-1.5 text-xs font-medium text-red-600 transition-all duration-150 hover:-translate-y-0.5 hover:bg-red-500/15 dark:text-red-400"
        >
          <LogOutIcon className="h-3.5 w-3.5" />
          Log out
        </button>
      </div>
      {message && (
        <p className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
          {message}
        </p>
      )}

      <section className="card-surface mt-8 rounded-2xl p-6">
        <h2 className="text-lg font-semibold">Create Tournament</h2>
        <p className="text-xs text-zinc-500">Pick the players — the round robin or Swiss round 1 schedule is generated for you.</p>

        <form onSubmit={createTournament} className="mt-4 space-y-4">
          <input
            placeholder="Tournament name"
            value={newTournament.name}
            onChange={(e) => setNewTournament({ ...newTournament, name: e.target.value })}
            required
            className="field-input"
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DateField
              label="Start date"
              value={newTournament.startDate}
              onChange={(v) => setNewTournament({ ...newTournament, startDate: v })}
            />
            <DateField
              label="End date"
              value={newTournament.endDate}
              min={newTournament.startDate || undefined}
              onChange={(v) => setNewTournament({ ...newTournament, endDate: v })}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Format</label>
            <div className="segmented">
              {[
                { v: "round_robin", label: "Round Robin" },
                { v: "swiss", label: "Swiss" },
              ].map((f) => (
                <button
                  key={f.v}
                  type="button"
                  data-active={newTournament.format === f.v}
                  onClick={() => setNewTournament({ ...newTournament, format: f.v })}
                  className="segmented-btn"
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Time Control</label>
            <div className="segmented">
              {["classical", "rapid", "blitz"].map((tc) => (
                <button
                  key={tc}
                  type="button"
                  data-active={newTournament.timeControl === tc}
                  onClick={() => setNewTournament({ ...newTournament, timeControl: tc })}
                  className="segmented-btn capitalize"
                >
                  {tc}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Number of Players</label>
            <input
              type="number"
              min={2}
              max={players.length}
              placeholder="e.g. 8"
              value={newTournament.numPlayers}
              onChange={(e) => {
                const numPlayers = e.target.value;
                setNewTournament({ ...newTournament, numPlayers });
                const cap = parseInt(numPlayers, 10);
                if (Number.isFinite(cap) && selectedPlayerIds.length > cap) {
                  setSelectedPlayerIds(selectedPlayerIds.slice(0, cap));
                }
              }}
              className="field-input"
            />
            <p className="mt-1.5 text-xs text-zinc-500">Set how many players are in the field, then pick exactly that many below.</p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Players</label>
            <PlayerMultiSelect
              players={players}
              selectedIds={selectedPlayerIds}
              onChange={setSelectedPlayerIds}
              maxCount={Number.isFinite(parseInt(newTournament.numPlayers, 10)) ? parseInt(newTournament.numPlayers, 10) : null}
            />
          </div>

          <button
            disabled={
              creating ||
              !newTournament.name ||
              !newTournament.startDate ||
              !newTournament.numPlayers ||
              selectedPlayerIds.length !== parseInt(newTournament.numPlayers, 10)
            }
            className="pill-btn pill-btn-primary w-full justify-center py-2.5 transition-all duration-200 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create & Generate Schedule"}
          </button>
        </form>
      </section>

      <section className="card-surface mt-6 rounded-2xl p-6">
        <h2 className="text-lg font-semibold">Find a Match</h2>
        <p className="text-xs text-zinc-500">Search by match ID, player name, or tournament — jump straight to it and set the winner.</p>
        <form onSubmit={searchMatches} className="mt-3 flex gap-2">
          <input
            value={matchSearch}
            onChange={(e) => setMatchSearch(e.target.value)}
            placeholder="Match ID or player name…"
            className="field-input"
          />
          <button
            type="submit"
            disabled={searching}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-950 px-4 text-sm font-medium text-white transition-all hover:-translate-y-0.5 disabled:opacity-50"
          >
            <SearchIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{searching ? "Searching…" : "Search"}</span>
          </button>
        </form>

        {searchResults && (
          <div className="dropdown-panel mt-3 max-h-64 overflow-y-auto rounded-xl border border-black/[.1] bg-background p-1 dark:border-white/[.12]">
            {searchResults.length === 0 ? (
              <p className="px-2.5 py-3 text-center text-xs text-zinc-500">No matches found for &quot;{matchSearch}&quot;.</p>
            ) : (
              searchResults.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => jumpToMatch(m)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.07]"
                >
                  <span className="rounded-md bg-black/[.06] px-1.5 py-0.5 font-mono text-[11px] text-zinc-500 dark:bg-white/[.08]">
                    {shortId(m.id)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{nameById[m.white_id] ?? "—"}</span>
                    {m.black_id && <> <span className="text-zinc-400">vs</span> <span className="font-medium">{nameById[m.black_id] ?? "—"}</span></>}
                    <span className="ml-1.5 text-zinc-500">· {m.tournaments?.name}</span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${m.status === "confirmed" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
                    {m.status === "confirmed" ? "Recorded" : "Pending"}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </section>

      <section className="card-surface mt-6 rounded-2xl p-6">
        <h2 className="text-lg font-semibold">Manage Matches</h2>
        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium">Tournament</label>
          <select value={activeTournamentId} onChange={(e) => setActiveTournamentId(e.target.value)} className="field-input">
            <option value="">Select tournament…</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — {t.start_date} · {t.status}
              </option>
            ))}
          </select>
        </div>

        {activeTournamentId && (
          <div className="mt-5">
            {matchesLoading ? (
              <p className="text-sm text-zinc-500">Loading matches…</p>
            ) : matches.length === 0 ? (
              <p className="text-sm text-zinc-500">No matches scheduled.</p>
            ) : (
              <div className="roadmap">
                {rounds.map((round) => {
                  const roundMatches = matches.filter((m) => m.round === round);
                  const roundDone = roundMatches.every((m) => m.status === "confirmed");
                  return (
                    <div key={round} className="roadmap-node" data-done={roundDone}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Round {round}</p>
                      <ul className="mt-2 space-y-2">
                        {roundMatches.map((m) => (
                          <li
                            key={m.id}
                            id={`match-${m.id}`}
                            className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-sm transition-all ${
                              highlightMatchId === m.id
                                ? "border-amber-500/60 bg-amber-500/10 shadow-lg ring-2 ring-amber-500/30"
                                : "border-black/[.08] bg-white/40 dark:border-white/[.1] dark:bg-white/[.02]"
                            }`}
                          >
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              <span className="rounded-md bg-black/[.06] px-1.5 py-0.5 font-mono text-[10px] text-zinc-500 dark:bg-white/[.08]">
                                {shortId(m.id)}
                              </span>
                              <span className="font-medium">
                                {nameById[m.white_id] ?? "—"}{" "}
                                {m.black_id ? (
                                  <>
                                    <span className="text-zinc-400">vs</span> {nameById[m.black_id] ?? "—"}
                                  </>
                                ) : (
                                  <span className="text-zinc-400">(bye)</span>
                                )}
                              </span>
                            </div>

                            {m.status === "confirmed" ? (
                              <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${RESULT_STYLES[m.result] ?? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"}`}>
                                {!m.black_id ? "bye" : m.result === "draw" ? "Draw" : `${m.result} won`}
                              </span>
                            ) : (
                              <div className="flex gap-1.5">
                                <button
                                  disabled={busyMatchId === m.id}
                                  onClick={() => recordResult(m.id, "white")}
                                  className="rounded-full border border-black/[.12] px-2.5 py-1 text-xs font-medium transition-all hover:-translate-y-0.5 hover:border-emerald-700/40 hover:text-emerald-700 disabled:opacity-50 dark:border-white/[.15] dark:hover:text-emerald-400"
                                >
                                  White won
                                </button>
                                <button
                                  disabled={busyMatchId === m.id}
                                  onClick={() => recordResult(m.id, "draw")}
                                  className="rounded-full border border-black/[.12] px-2.5 py-1 text-xs font-medium transition-all hover:-translate-y-0.5 hover:border-amber-500/50 hover:text-amber-600 disabled:opacity-50 dark:border-white/[.15] dark:hover:text-amber-400"
                                >
                                  Draw
                                </button>
                                <button
                                  disabled={busyMatchId === m.id}
                                  onClick={() => recordResult(m.id, "black")}
                                  className="rounded-full border border-black/[.12] px-2.5 py-1 text-xs font-medium transition-all hover:-translate-y-0.5 hover:border-emerald-700/40 hover:text-emerald-700 disabled:opacity-50 dark:border-white/[.15] dark:hover:text-emerald-400"
                                >
                                  Black won
                                </button>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}

            {standings.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Standings</p>
                <ul className="mt-2 space-y-1.5">
                  {standings.map((s, i) => (
                    <li key={s.id} className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm">
                      <span className="w-5 text-xs text-zinc-500">{i + 1}</span>
                      <span className="flex-1">{nameById[s.id]}</span>
                      <span className="font-semibold">{s.points}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {matches.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2 border-t border-black/[.06] pt-4 dark:border-white/[.08]">
                {activeTournament?.format === "swiss" && (
                  <button
                    onClick={generateNextRound}
                    disabled={!currentRoundDone || advancing}
                    className="pill-btn border border-black/[.12] px-3.5 py-1.5 text-xs transition-all hover:-translate-y-0.5 disabled:opacity-40 dark:border-white/[.15]"
                  >
                    {advancing ? "Generating…" : "Generate Next Round"}
                  </button>
                )}
                <button
                  onClick={finalizeTournament}
                  disabled={finalizing || activeTournament?.status === "completed"}
                  className="pill-btn bg-gradient-to-r from-amber-500 to-amber-600 px-3.5 py-1.5 text-xs text-white transition-all hover:-translate-y-0.5 disabled:opacity-40"
                >
                  <TrophyIcon className="h-3.5 w-3.5" />
                  {finalizing ? "Finalizing…" : activeTournament?.status === "completed" ? "Completed" : "Finalize & Crown Winner"}
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
