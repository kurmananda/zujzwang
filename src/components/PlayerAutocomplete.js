"use client";

import { useState } from "react";
import { UserIcon } from "@/components/icons";

export default function PlayerAutocomplete({ players, value, onChange, placeholder = "Search player…" }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = players.find((p) => p.id === value);
  const suggestions = query.trim()
    ? players
        .filter(
          (p) =>
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.chess_com_username?.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 6)
    : players.slice(0, 6);

  return (
    <div className="relative">
      <input
        type="text"
        value={open ? query : selected?.name ?? query}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="field-input"
      />
      {open && suggestions.length > 0 && (
        <ul className="dropdown-panel absolute z-20 mt-1.5 w-full max-h-56 overflow-y-auto rounded-xl border border-black/[.1] bg-background p-1 dark:border-white/[.12]">
          {suggestions.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onMouseDown={() => {
                  onChange(p.id);
                  setQuery("");
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.07]"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-700/10 text-emerald-700 dark:text-emerald-400">
                  <UserIcon className="h-3 w-3" />
                </span>
                <span className="min-w-0 truncate">
                  {p.name} <span className="text-zinc-500">@{p.chess_com_username}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
