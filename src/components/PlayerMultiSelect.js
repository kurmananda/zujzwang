"use client";

import { useState } from "react";
import { UserIcon, XIcon, CheckIcon } from "@/components/icons";

export default function PlayerMultiSelect({ players, selectedIds, onChange, maxCount = null }) {
  const [query, setQuery] = useState("");

  const selected = players.filter((p) => selectedIds.includes(p.id));
  const atLimit = maxCount != null && selectedIds.length >= maxCount;
  const q = query.trim().toLowerCase();
  const results = players.filter(
    (p) =>
      !selectedIds.includes(p.id) &&
      (!q || p.name.toLowerCase().includes(q) || p.chess_com_username?.toLowerCase().includes(q))
  );

  function add(id) {
    if (atLimit) return;
    onChange([...selectedIds, id]);
    setQuery("");
  }
  function remove(id) {
    onChange(selectedIds.filter((x) => x !== id));
  }

  return (
    <div>
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((p) => (
            <span
              key={p.id}
              className="flex items-center gap-1.5 rounded-full border border-emerald-700/25 bg-emerald-700/10 py-1 pl-2.5 pr-1.5 text-xs font-medium text-emerald-800 dark:text-emerald-400"
            >
              {p.name}
              <button
                type="button"
                onClick={() => remove(p.id)}
                className="flex h-4 w-4 items-center justify-center rounded-full transition-colors hover:bg-emerald-700/20"
              >
                <XIcon className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={atLimit ? "Player limit reached — remove one to swap" : "Search players to add…"}
        disabled={atLimit}
        className="field-input disabled:cursor-not-allowed disabled:opacity-60"
      />

      {!atLimit && (
        <div className="dropdown-panel mt-1.5 max-h-40 overflow-y-auto rounded-xl border border-black/[.1] bg-background p-1 dark:border-white/[.12]">
          {results.length === 0 ? (
            <p className="px-2.5 py-3 text-center text-xs text-zinc-500">
              {players.length === selected.length ? "All players added." : "No matches."}
            </p>
          ) : (
            results.slice(0, 8).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => add(p.id)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.07]"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-700/10 text-emerald-700 dark:text-emerald-400">
                  <UserIcon className="h-3 w-3" />
                </span>
                <span className="min-w-0 truncate">
                  {p.name} <span className="text-zinc-500">@{p.chess_com_username}</span>
                </span>
                <CheckIcon className="ml-auto h-3.5 w-3.5 shrink-0 opacity-0" />
              </button>
            ))
          )}
        </div>
      )}
      <p className={`mt-1.5 text-xs font-medium ${atLimit ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-500"}`}>
        {selected.length}{maxCount != null ? ` / ${maxCount}` : ""} player{selected.length === 1 ? "" : "s"} selected
      </p>
    </div>
  );
}
