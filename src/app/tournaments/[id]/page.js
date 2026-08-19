import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CalendarIcon, TrophyIcon, ArrowRightIcon } from "@/components/icons";

const STATUS_STYLES = {
  upcoming: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  live: "bg-red-500/10 text-red-600 dark:text-red-400",
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

const RESULT_STYLES = {
  white: "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100",
  black: "bg-zinc-800 text-white dark:bg-zinc-900",
  draw: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
};

export default async function TournamentDetailPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: tournament }, { data: matches }, { data: standings }, { data: profiles }] = await Promise.all([
    supabase.from("tournaments").select("*").eq("id", id).maybeSingle(),
    supabase.from("tournament_matches").select("*").eq("tournament_id", id).order("round").order("board_no"),
    supabase.from("tournament_standings").select("*").eq("tournament_id", id).order("rank"),
    supabase.from("profiles").select("id, name, photo_url"),
  ]);

  if (!tournament) {
    return <div className="mx-auto max-w-3xl px-6 py-16 text-center text-sm text-zinc-500">Tournament not found.</div>;
  }

  const nameById = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.name]));
  const photoById = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.photo_url]));
  const rounds = [...new Set((matches ?? []).map((m) => m.round))].sort((a, b) => a - b);
  const winners = (standings ?? []).filter((s) => s.is_winner);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/tournaments" className="group flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-foreground">
        <ArrowRightIcon className="h-3.5 w-3.5 rotate-180 transition-transform group-hover:-translate-x-0.5" />
        All tournaments
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-950 text-amber-300 shadow-sm">
            <CalendarIcon className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">{tournament.name}</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {tournament.start_date}
              {tournament.end_date && tournament.end_date !== tournament.start_date ? ` – ${tournament.end_date}` : ""} ·{" "}
              <span className="capitalize">{tournament.format?.replace("_", " ")}</span> ·{" "}
              <span className="capitalize">{tournament.time_control}</span>
            </p>
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${STATUS_STYLES[tournament.status] ?? ""}`}>
          {tournament.status}
        </span>
      </div>

      {winners.length > 0 && (
        <div className="card-surface mt-6 flex items-center gap-3 rounded-2xl border-amber-500/30 bg-amber-500/[.06] p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <TrophyIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">
              {winners.length > 1 ? "Champions" : "Champion"}
            </p>
            <p className="font-display text-lg font-semibold">{winners.map((w) => nameById[w.player_id]).join(" & ")}</p>
          </div>
        </div>
      )}

      {rounds.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-black/[.1] px-4 py-10 text-center text-sm text-zinc-500 dark:border-white/[.12]">
          No matches scheduled yet.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="roadmap">
            {rounds.map((round) => {
              const roundMatches = matches.filter((m) => m.round === round);
              const roundDone = roundMatches.every((m) => m.status === "confirmed");
              return (
                <section key={round} className="roadmap-node" data-done={roundDone}>
                  <h2 className="font-display text-base font-semibold">Round {round}</h2>
                  <ul className="mt-2.5 space-y-2">
                    {roundMatches.map((m) => (
                      <li key={m.id} className="card-surface card-hover flex items-center justify-between gap-3 rounded-xl p-3.5 text-sm">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="hidden rounded-md bg-black/[.06] px-1.5 py-0.5 font-mono text-[10px] text-zinc-500 sm:inline dark:bg-white/[.08]">
                            {m.id.slice(0, 8)}
                          </span>
                          <PlayerChip name={nameById[m.white_id]} photo={photoById[m.white_id]} />
                          {m.black_id ? (
                            <>
                              <span className="text-zinc-400">vs</span>
                              <PlayerChip name={nameById[m.black_id]} photo={photoById[m.black_id]} />
                            </>
                          ) : (
                            <span className="text-xs text-zinc-400">(bye)</span>
                          )}
                        </div>
                        {m.status === "confirmed" ? (
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${RESULT_STYLES[m.result] ?? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"}`}>
                            {!m.black_id ? "bye" : m.result === "draw" ? "Draw" : `${m.result} won`}
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full bg-black/[.05] px-2.5 py-1 text-xs font-medium text-zinc-500 dark:bg-white/[.06]">
                            Pending
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>

          {standings && standings.length > 0 && (
            <div>
              <h2 className="font-display text-base font-semibold">Standings</h2>
              <ol className="card-surface mt-2.5 divide-y divide-black/[.06] rounded-xl px-1 dark:divide-white/[.08]">
                {standings.map((s) => (
                  <li key={s.player_id} className="flex items-center gap-3 py-2.5">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${s.is_winner ? "bg-gradient-to-br from-amber-300 to-amber-600 text-emerald-950" : "text-zinc-500"}`}>
                      {s.rank}
                    </span>
                    <span className="flex-1 truncate text-sm font-medium">{nameById[s.player_id]}</span>
                    <span className="text-sm font-semibold">{s.points}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PlayerChip({ name, photo }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <img src={photo || "/next.svg"} alt="" className="h-5 w-5 shrink-0 rounded-full bg-black/[.05] object-cover" />
      <span className="truncate font-medium">{name ?? "—"}</span>
    </span>
  );
}
