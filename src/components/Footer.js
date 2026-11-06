import Link from "next/link";
import { KnightIcon, CrownIcon, CalendarIcon, GearIcon, InstagramIcon } from "@/components/icons";

const LINKS = [
  { href: "/leaderboard", label: "Ratings", Icon: CrownIcon },
  { href: "/matches", label: "Matches", Icon: KnightIcon },
  { href: "/tournaments", label: "Tournaments", Icon: CalendarIcon },
  { href: "/admin", label: "Admin", Icon: GearIcon },
];

const INSTAGRAM_URL = "https://www.instagram.com/iist_chess_club/";

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-black/[.06] bg-gradient-to-b from-transparent to-black/[.02] dark:border-white/[.07] dark:to-white/[.015]">
      <span aria-hidden className="chess-pattern pointer-events-none absolute inset-0 opacity-[.5]" />
      <div className="relative mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Link href="/" className="group flex items-center gap-2.5 font-semibold tracking-tight">
              <span className="brand-mark flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-700 to-emerald-950 text-amber-300 shadow-sm shadow-emerald-900/30">
                <KnightIcon className="h-5 w-5" />
              </span>
              <span className="font-display text-lg">Zugzwang</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-zinc-600 dark:text-zinc-400">
              The college chess club. One rating, earned over the board — Chess.com stats mirrored live, plus a
              college rating that only moves on confirmed games.
            </p>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="instagram-btn mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <InstagramIcon className="h-4 w-4" />
              IIST Chess Club on Instagram
            </a>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Explore</p>
            <ul className="mt-3 space-y-2.5">
              {LINKS.map(({ href, label, Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="group inline-flex items-center gap-2 text-sm text-zinc-600 transition-colors hover:text-foreground dark:text-zinc-400"
                  >
                    <Icon className="h-3.5 w-3.5 opacity-70 transition-transform group-hover:translate-x-0.5" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Account</p>
            <ul className="mt-3 space-y-2.5">
              <li>
                <Link href="/login" className="text-sm text-zinc-600 transition-colors hover:text-foreground dark:text-zinc-400">
                  Log In
                </Link>
              </li>
              <li>
                <Link href="/signup" className="text-sm text-zinc-600 transition-colors hover:text-foreground dark:text-zinc-400">
                  Sign Up
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 border-t border-black/[.06] pt-6 text-xs text-zinc-500 sm:flex-row sm:justify-between dark:border-white/[.07]">
          <p>© {new Date().getFullYear()} Zugzwang Chess Club. All rights reserved.</p>
          <p className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-600">
            <span aria-hidden>♞</span> Play a real game. Earn a real rating.
          </p>
        </div>
      </div>
    </footer>
  );
}
