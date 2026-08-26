"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowRightIcon, XIcon, ClockIcon } from "@/components/icons";

const STATUS_STYLES = {
  upcoming: "bg-amber-400/15 text-amber-300",
  live: "bg-red-500/20 text-red-300",
};

export default function UpcomingTournamentsPanel({ tournaments, isLoggedIn }) {
  const [active, setActive] = useState(null);

  return (
    <>
      <div className="relative mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tournaments.length === 0 ? (
          <p className="col-span-full rounded-2xl border border-dashed border-white/15 px-4 py-10 text-center text-sm text-emerald-100/60">
            Nothing scheduled yet — check back soon.
          </p>
        ) : (
          tournaments.map((t) =>
            isLoggedIn ? (
              <button
                key={t.id}
                type="button"
                onClick={() => setActive(t)}
                className="group block rounded-2xl border border-white/10 bg-white/[.06] p-5 text-left backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-amber-400/30 hover:bg-white/[.1] hover:shadow-xl hover:shadow-black/20"
              >
                <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${STATUS_STYLES[t.status] ?? "bg-amber-400/15 text-amber-300"}`}>
                  {t.status}
                </span>
                <p className="font-display mt-3 text-lg font-semibold text-white">{t.name}</p>
                <p className="mt-1.5 text-sm text-emerald-100/70">
                  {t.start_date}
                  {t.end_date && t.end_date !== t.start_date ? ` – ${t.end_date}` : ""} ·{" "}
                  <span className="capitalize">{t.time_control}</span>
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-amber-300 transition-transform group-hover:translate-x-0.5">
                  View matches <ArrowRightIcon className="h-3.5 w-3.5" />
                </span>
              </button>
            ) : (
              <Link
                key={t.id}
                href="/login"
                className="group block rounded-2xl border border-white/10 bg-white/[.06] p-5 text-left backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-amber-400/30 hover:bg-white/[.1] hover:shadow-xl hover:shadow-black/20"
              >
                <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${STATUS_STYLES[t.status] ?? "bg-amber-400/15 text-amber-300"}`}>
                  {t.status}
                </span>
                <p className="font-display mt-3 text-lg font-semibold text-white">{t.name}</p>
                <p className="mt-1.5 text-sm text-emerald-100/70">
                  {t.start_date}
                  {t.end_date && t.end_date !== t.start_date ? ` – ${t.end_date}` : ""} ·{" "}
                  <span className="capitalize">{t.time_control}</span>
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-amber-300 transition-transform group-hover:translate-x-0.5">
                  Sign in to view matches <ArrowRightIcon className="h-3.5 w-3.5" />
                </span>
              </Link>
            )
          )
        )}
      </div>

      {active && <TournamentMatchesModal tournament={active} onClose={() => setActive(null)} />}
    </>
  );
}

function TournamentMatchesModal({ tournament, onClose }) {
  const supabase = createClient();
  const [matches, setMatches] = useState(null);
  const [nameById, setNameById] = useState({});

  useEffect(() => {
    document.body.style.overflow = "hidden";
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);

    (async () => {
      const [{ data: rows }, { data: profiles }] = await Promise.all([
        supabase
          .from("tournament_matches")
          .select("*")
          .eq("tournament_id", tournament.id)
          .order("round")
          .order("board_no"),
        supabase.from("profiles").select("id, name"),
      ]);
      setNameById(Object.fromEntries((profiles ?? []).map((p) => [p.id, p.name])));
      setMatches(rows ?? []);
    })();

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [tournament.id]);

  const rounds = [...new Set((matches ?? []).map((m) => m.round))].sort((a, b) => a - b);

  return (
    <div className="modal-backdrop fixed inset-0 z-[100] flex items-center justify-center p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
        className="modal-panel card-surface flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-black/[.06] px-6 py-5 dark:border-white/[.08]">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-950 text-amber-300 shadow-sm">
              <ClockIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold leading-tight">{tournament.name}</h2>
              <p className="text-xs text-zinc-500">
                {tournament.start_date}
                {tournament.end_date && tournament.end_date !== tournament.start_date ? ` – ${tournament.end_date}` : ""}
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="icon-btn -mr-1 -mt-1 shrink-0">
            <XIcon className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          {matches === null ? (
            <p className="text-sm text-zinc-500">Loading matches…</p>
          ) : matches.length === 0 ? (
            <p className="text-sm text-zinc-500">No matches scheduled yet.</p>
          ) : (
            <div className="space-y-5">
              {rounds.map((round) => (
                <div key={round}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Round {round}</p>
                  <ul className="mt-2 space-y-2">
                    {matches
                      .filter((m) => m.round === round)
                      .map((m) => (
                        <li
                          key={m.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-black/[.08] bg-white/40 p-3 text-sm dark:border-white/[.1] dark:bg-white/[.02]"
                        >
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
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                              m.status === "confirmed"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-black/[.05] text-zinc-500 dark:bg-white/[.06]"
                            }`}
                          >
                            {m.status === "confirmed" ? (m.result === "draw" ? "Draw" : m.black_id ? `${m.result} won` : "bye") : "Pending"}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-black/[.06] px-6 py-4 dark:border-white/[.08]">
          <Link
            href={`/tournaments/${tournament.id}`}
            className="group flex items-center justify-center gap-1.5 text-sm font-medium text-emerald-700 transition-colors hover:text-emerald-800 dark:text-emerald-400"
          >
            Full tournament details <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
