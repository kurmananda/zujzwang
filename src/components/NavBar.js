import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getChessComAvatar } from "@/lib/chesscom";
import NavProfileMenu from "@/components/NavProfileMenu";
import MobileNavMenu from "@/components/MobileNavMenu";
import { CrownIcon, KnightIcon, CalendarIcon, GearIcon, BellIcon } from "@/components/icons";

const LINKS = [
  { href: "/leaderboard", label: "Ratings", Icon: CrownIcon, iconKey: "crown" },
  { href: "/matches", label: "Matches", Icon: KnightIcon, iconKey: "knight" },
  { href: "/tournaments", label: "Tournaments", Icon: CalendarIcon, iconKey: "calendar" },
  { href: "/admin", label: "Admin", Icon: GearIcon, iconKey: "gear" },
];

export default async function NavBar() {
  let user = null;
  let profile = null;
  let pendingCount = 0;

  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;

    if (user) {
      const [{ count }, { data: profileRow }] = await Promise.all([
        supabase
          .from("games")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending")
          .eq("source", "friendly")
          .neq("reporter_id", user.id)
          .or(`white_id.eq.${user.id},black_id.eq.${user.id}`),
        supabase
          .from("profiles")
          .select("name, photo_url, chess_com_username, ratings")
          .eq("id", user.id)
          .maybeSingle(),
      ]);
      pendingCount = count ?? 0;
      profile = profileRow
        ? { ...profileRow, photo_url: profileRow.photo_url || (await getChessComAvatar(profileRow.chess_com_username)) }
        : null;
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-black/[.07] bg-white/80 backdrop-blur-md dark:border-white/[.08] dark:bg-black/70">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
        <Link href="/" className="group flex items-center gap-2.5 font-semibold tracking-tight text-lg">
          <span className="brand-mark flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-700 to-emerald-950 text-amber-300 shadow-sm shadow-emerald-900/30">
            <KnightIcon className="h-5 w-5" />
          </span>
          <span className="font-display hidden sm:inline">Zujzwang Chess Club</span>
          <span className="font-display sm:hidden">Zujzwang</span>
        </Link>

        <nav className="hidden flex-wrap gap-x-1 text-sm text-zinc-600 md:flex dark:text-zinc-400">
          {LINKS.map(({ href, label, Icon }) => (
            <Link key={href} href={href} className="nav-link relative flex items-center gap-1.5 rounded-full px-3 py-1.5">
              <Icon className="h-4 w-4 opacity-75" />
              <span className="hidden lg:inline">{label}</span>
              {href === "/matches" && pendingCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-semibold text-white">
                  {pendingCount}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 text-sm sm:gap-3">
          <MobileNavMenu
            links={LINKS.map(({ href, label, iconKey }) => ({ href, label, iconKey }))}
            pendingCount={pendingCount}
          />
          {user ? (
            <>
              {pendingCount > 0 && (
                <Link
                  href="/matches"
                  className="hidden items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 lg:flex"
                >
                  <BellIcon className="h-3.5 w-3.5" />
                  {pendingCount} to confirm
                </Link>
              )}
              <NavProfileMenu profile={profile} />
            </>
          ) : (
            <>
              <Link href="/login" className="text-zinc-600 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50">
                Log In
              </Link>
              <Link href="/signup" className="pill-btn pill-btn-primary px-4 py-1.5">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
