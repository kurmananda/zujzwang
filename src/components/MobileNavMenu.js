"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MenuIcon, XIcon, CrownIcon, KnightIcon, CalendarIcon, GearIcon } from "@/components/icons";

const ICONS = { crown: CrownIcon, knight: KnightIcon, calendar: CalendarIcon, gear: GearIcon };

export default function MobileNavMenu({ links, pendingCount = 0 }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative md:hidden" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle navigation menu"
        aria-expanded={open}
        className="icon-btn relative"
      >
        {open ? <XIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
        {!open && pendingCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-amber-500 ring-2 ring-background" />
        )}
      </button>

      {open && (
        <div className="dropdown-panel absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-black/[.08] bg-background p-1.5 shadow-xl dark:border-white/[.1]">
          {links.map(({ href, label, iconKey }) => {
            const Icon = ICONS[iconKey];
            return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-black/[.04] dark:text-zinc-300 dark:hover:bg-white/[.06]"
            >
              {Icon && <Icon className="h-4 w-4 opacity-75" />}
              {label}
              {href === "/matches" && pendingCount > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-semibold text-white">
                  {pendingCount}
                </span>
              )}
            </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
