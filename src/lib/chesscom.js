// Thin wrapper around the public Chess.com API. No auth required.
// Docs: https://www.chess.com/news/view/published-data-api

const BASE = "https://api.chess.com/pub/player";

async function safeFetchJson(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "zujzwang-chess-club-site" },
    next: { revalidate: 300 }, // 5 min cache
  });
  if (!res.ok) return null;
  return res.json();
}

export async function getChessComProfile(username) {
  if (!username) return null;
  return safeFetchJson(`${BASE}/${encodeURIComponent(username)}`);
}

/** Chess.com avatar URL for a username, or null if the account has no custom avatar. */
export async function getChessComAvatar(username) {
  if (!username) return null;
  const profile = await getChessComProfile(username);
  return profile?.avatar ?? null;
}

/**
 * Fills in `photo_url` from the linked Chess.com avatar for any profile that doesn't
 * already have one stored. Leaves profiles with an existing photo_url untouched.
 */
export async function withChessComAvatars(profiles) {
  return Promise.all(
    profiles.map(async (p) => {
      if (p.photo_url) return p;
      const avatar = await getChessComAvatar(p.chess_com_username);
      return avatar ? { ...p, photo_url: avatar } : p;
    })
  );
}

/** Returns { rapid, blitz, bullet } best-guess current ratings, or null fields if unrated. */
export async function getChessComRatings(username) {
  if (!username) return null;
  const stats = await safeFetchJson(`${BASE}/${encodeURIComponent(username)}/stats`);
  if (!stats) return null;

  return {
    rapid: stats.chess_rapid?.last?.rating ?? null,
    blitz: stats.chess_blitz?.last?.rating ?? null,
    bullet: stats.chess_bullet?.last?.rating ?? null,
  };
}
