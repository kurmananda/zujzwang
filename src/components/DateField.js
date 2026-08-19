"use client";

import { CalendarIcon } from "@/components/icons";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function DateField({ label, value, onChange, min }) {
  return (
    <div>
      <label className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <button
          type="button"
          onClick={() => onChange(todayIso())}
          className="flex items-center gap-1 rounded-full border border-black/[.1] px-2 py-0.5 text-[11px] font-medium text-zinc-600 transition-colors hover:border-emerald-700/40 hover:text-emerald-700 dark:border-white/[.15] dark:text-zinc-400 dark:hover:text-emerald-400"
        >
          <CalendarIcon className="h-3 w-3" />
          Today
        </button>
      </label>
      <input
        type="date"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        required
        className="field-input"
      />
    </div>
  );
}
