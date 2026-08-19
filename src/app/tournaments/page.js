import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CalendarIcon, TrophyIcon, ArrowRightIcon } from "@/components/icons";

export const metadata = { title: "Tournaments — Zujzwang Chess Club" };

export default async function TournamentsPage() {
  const supabase = await createClient();

  const [{ data: tournaments }, { data: standings }, { data: profiles }] = await Promise.all([
    supabase.from("tournaments").select("*").order("start_date", { ascending: false, nullsFirst: false }),
    supabase.from("tournament_standings").select("*").eq("is_winner", true),
    supabase.from("profiles").select("id, name"),
  ]);

  const nameById = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.name]));
  const winnersByTournament = {};
  for (const s of standings ?? []) {
    (winnersByTournament[s.tournament_id] ??= []).push(nameById[s.player_id]);
  }

  const upcoming = (tournaments ?? []).filter((t) => t.status !== "completed");
  const completed = (tournaments ?? []).filter((t) => t.status === "completed");

  const STATUS_STYLES = {
    upcoming: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    live: "bg-red-500/10 text-red-600 dark:text-red-400",
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-950 text-amber-300 shadow-sm">
          <CalendarIcon className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Tournaments</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Upcoming events and past champions — click one for the full bracket.</p>
        </div>
      </div>

      <section className="mt-9">
        <h2 className="font-display text-lg font-semibold">Upcoming / Live</h2>
        {upcoming.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-black/[.1] px-4 py-6 text-center text-sm text-zinc-500 dark:border-white/[.12]">
            Nothing scheduled yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {upcoming.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/tournaments/${t.id}`}
                  className="card-surface card-hover group flex items-center gap-4 rounded-xl p-4"
                >
                  <span className="icon-tile flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <CalendarIcon className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{t.name}</p>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLES[t.status] ?? "bg-amber-500/10 text-amber-700 dark:text-amber-400"}`}>
                        {t.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-500">
                      {t.start_date}
                      {t.end_date && t.end_date !== t.start_date ? ` – ${t.end_date}` : ""} ·{" "}
                      <span className="capitalize">{t.format?.replace("_", " ")}</span> ·{" "}
                      <span className="capitalize">{t.time_control}</span>
                    </p>
                  </div>
                  <ArrowRightIcon className="h-4 w-4 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-1" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold">Past Winners</h2>
        {completed.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-black/[.1] px-4 py-6 text-center text-sm text-zinc-500 dark:border-white/[.12]">
            No completed tournaments yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {completed.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/tournaments/${t.id}`}
                  className="card-surface card-hover group flex items-center gap-4 rounded-xl p-4"
                >
                  <span className="icon-tile flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-700/10 text-emerald-700 dark:text-emerald-400">
                    <TrophyIcon className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <p className="font-medium">{t.name}</p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {t.start_date} · Winner:{" "}
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">
                        {winnersByTournament[t.id]?.join(" & ") ?? "TBD"}
                      </span>
                    </p>
                  </div>
                  <ArrowRightIcon className="h-4 w-4 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-1" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
