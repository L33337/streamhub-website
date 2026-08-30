import type { PublicGame } from '@/lib/server/partner-api';

// Sorting + filtering for the /games catalog explorer (games-page expansion).
// Pure helpers, unit-tested in lib/__tests__/games-sort.test.ts.

// 'hours' was called 'watched' until 2026-07-20. hours_28d is sum(broadcast
// duration) — time STREAMED, not time watched (refresh_game_stats(), migration
// 20260720120000). We have no watch-time metric; do not reintroduce the old
// name or any "watched" label on this mode. See lib/games-hub.ts.
export type GamesSortMode = 'streamers' | 'hours' | 'trending';

/** Normalize for search matching: lowercase, diacritics stripped (same
 *  NFKD trick as gameSlug). */
function normalizeQuery(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Sort a games list for the explorer grid. Never mutates the input.
 * - 'streamers': streamer_count desc (API default order, kept stable)
 * - 'hours':     hours_28d desc (hours broadcast), nulls last
 * - 'trending':  trend_delta_percent desc, nulls last
 * Ties break by streamer_count desc, then category asc (deterministic for
 * SSR/hydration consistency).
 */
export function sortGames(games: PublicGame[], mode: GamesSortMode): PublicGame[] {
  const metric = (g: PublicGame): number => {
    if (mode === 'hours') return g.hours_28d ?? Number.NEGATIVE_INFINITY;
    if (mode === 'trending') return g.trend_delta_percent ?? Number.NEGATIVE_INFINITY;
    return g.streamer_count;
  };
  return [...games].sort((a, b) => {
    const ma = metric(a);
    const mb = metric(b);
    // Explicit comparisons, not subtraction: -Infinity - -Infinity is NaN.
    if (mb > ma) return 1;
    if (mb < ma) return -1;
    if (b.streamer_count !== a.streamer_count) return b.streamer_count - a.streamer_count;
    return a.category.localeCompare(b.category);
  });
}

/** Case- and diacritic-insensitive substring filter ("pokem" matches
 *  "Pokémon"). Blank query returns the input unchanged. */
export function filterGames<T extends Pick<PublicGame, 'category'>>(games: T[], query: string): T[] {
  const q = normalizeQuery(query.trim());
  if (q.length === 0) return games;
  return games.filter((g) => normalizeQuery(g.category).includes(q));
}
