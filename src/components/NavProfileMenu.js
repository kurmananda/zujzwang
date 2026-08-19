"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { UserIcon, ChevronDownIcon, CrownIcon } from "@/components/icons";

export default function NavProfileMenu({ profile }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const router = useRouter();

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-black/[.08] bg-black/[.02] py-1 pl-1 pr-2.5 transition-all hover:border-black/15 hover:shadow-sm dark:border-white/[.1] dark:bg-white/[.03] dark:hover:border-white/20"
      >
        {profile?.photo_url ? (
          <img src={profile.photo_url} alt="" className="h-7 w-7 rounded-full object-cover ring-1 ring-black/[.06] dark:ring-white/[.1]" />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-emerald-700 to-emerald-950 text-amber-300">
            <UserIcon className="h-3.5 w-3.5" />
          </span>
        )}
        <span className="hidden max-w-[8rem] truncate text-sm font-medium sm:inline">{profile?.name ?? "Account"}</span>
        <ChevronDownIcon className={`h-3.5 w-3.5 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="dropdown-panel absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-black/[.08] bg-background shadow-xl dark:border-white/[.1]">
          <div className="flex items-center gap-3 border-b border-black/[.06] px-3.5 py-3 dark:border-white/[.08]">
            {profile?.photo_url ? (
              <img src={profile.photo_url} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-700 to-emerald-950 text-amber-300">
                <UserIcon className="h-4.5 w-4.5" />
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{profile?.name}</p>
              <p className="truncate text-xs text-zinc-500">@{profile?.chess_com_username}</p>
            </div>
          </div>

          {profile?.ratings && (
            <div className="flex items-center gap-1.5 border-b border-black/[.06] px-3.5 py-2.5 text-xs text-zinc-500 dark:border-white/[.08]">
              <CrownIcon className="h-3.5 w-3.5 text-amber-500" />
              Rapid rating
              <span className="ml-auto font-semibold text-zinc-800 dark:text-zinc-200">{profile.ratings.rapid}</span>
            </div>
          )}

          <Link
            href="/leaderboard"
            onClick={() => setOpen(false)}
            className="block px-3.5 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-black/[.03] dark:text-zinc-300 dark:hover:bg-white/[.05]"
          >
            My rating &amp; stats
          </Link>
          <button
            onClick={handleLogout}
            className="block w-full px-3.5 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-500/[.06] dark:text-red-400"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
