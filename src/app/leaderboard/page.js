import { createClient } from "@/lib/supabase/server";
import { getChessComRatings, getChessComAvatar } from "@/lib/chesscom";
import RatingsExplorer from "@/components/RatingsExplorer";
import { CrownIcon } from "@/components/icons";

export const metadata = { title: "Ratings — Zujzwang Chess Club" };

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, name, sc_code, chess_com_username, photo_url, ratings");

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12 text-sm text-red-600 dark:text-red-400">
        Couldn&apos;t load ratings: {error.message}. Make sure Supabase env vars are set and the schema in
        supabase/schema.sql has been applied.
      </div>
    );
  }

  const players = await Promise.all(
    (profiles ?? []).map(async (p) => ({
      ...p,
      chesscom_ratings: await getChessComRatings(p.chess_com_username),
      photo_url: p.photo_url || (await getChessComAvatar(p.chess_com_username)),
    }))
  );

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-950 text-amber-300 shadow-sm">
          <CrownIcon className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Ratings</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            College rating from verified local games, plus live Chess.com ratings.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <RatingsExplorer players={players} />
      </div>
    </div>
  );
}
