// Local ("college") rating engine — see docs/PROJECT_OVERVIEW.md §6.

export const STARTING_RATING = 1200;
export const TIME_CONTROLS = ["classical", "rapid", "blitz"];

/** Tiered K-factor: new players move faster, established players move slower. */
export function kFactor(gamesPlayed, rating) {
  if (gamesPlayed < 20) return 40;
  if (rating < 2000) return 20;
  return 10;
}

function expectedScore(ratingA, ratingB) {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

/**
 * Apply one game's result to two players' ratings for a single time control.
 * `result` is from white's perspective: "white" | "black" | "draw".
 */
export function applyGameResult({ white, black, result }) {
  const scoreWhite = result === "white" ? 1 : result === "draw" ? 0.5 : 0;
  const scoreBlack = 1 - scoreWhite;

  const expectedWhite = expectedScore(white.rating, black.rating);
  const expectedBlack = 1 - expectedWhite;

  const kWhite = kFactor(white.gamesPlayed, white.rating);
  const kBlack = kFactor(black.gamesPlayed, black.rating);

  const deltaWhite = Math.round(kWhite * (scoreWhite - expectedWhite));
  const deltaBlack = Math.round(kBlack * (scoreBlack - expectedBlack));

  return {
    white: {
      ratingBefore: white.rating,
      ratingAfter: white.rating + deltaWhite,
      delta: deltaWhite,
    },
    black: {
      ratingBefore: black.rating,
      ratingAfter: black.rating + deltaBlack,
      delta: deltaBlack,
    },
  };
}

/**
 * Replay a list of verified games (in chronological order) against a map of
 * players and return updated ratings/game counts per time control.
 *
 * players: { [playerId]: { name, ratings: { classical, rapid, blitz }, games: { classical, rapid, blitz } } }
 * games: [{ whiteId, blackId, result, timeControl }]
 */
export function recomputeRatings(players, games) {
  const state = structuredClone(players);

  for (const game of games) {
    const { whiteId, blackId, result, timeControl } = game;
    const w = state[whiteId];
    const b = state[blackId];
    if (!w || !b) continue;

    const { white, black } = applyGameResult({
      white: { rating: w.ratings[timeControl], gamesPlayed: w.games[timeControl] },
      black: { rating: b.ratings[timeControl], gamesPlayed: b.games[timeControl] },
      result,
    });

    w.ratings[timeControl] = white.ratingAfter;
    b.ratings[timeControl] = black.ratingAfter;
    w.games[timeControl] += 1;
    b.games[timeControl] += 1;
  }

  return state;
}

export function newPlayerRatingState() {
  return {
    ratings: { classical: STARTING_RATING, rapid: STARTING_RATING, blitz: STARTING_RATING },
    games: { classical: 0, rapid: 0, blitz: 0 },
  };
}
