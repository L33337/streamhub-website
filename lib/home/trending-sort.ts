/**
 * Sorting for the homepage "Trending on Twitch" rail (2026-07-31).
 *
 * The rail's canonical order is Twitch's own top-games rank (`trending_games`),
 * which is what the server renders and what a JS-less browser keeps. On top of
 * that the visitor can reorder by OUR catalog metrics. Pure helpers, computed
 * server-side and shipped as index permutations — the island never sorts.
 *
 * Metric choice, deliberately:
 * - 'hours'     → hours_28d, time BROADCAST. Never label this "watched" (same
 *                 invariant as lib/games-sort.ts).
 * - 'viewers'   → live_viewer_total, the sum of FRESH concurrent-viewer samples
 *                 across the category's live streams. It is the only real
 *                 viewer metric we have per game: peak_viewer_28d is 100% NULL
 *                 in production (stream_history.peak_viewer_count is written by
 *                 no collector), so it cannot back a "most watched" mode.
 * - 'streamers' → streamer_count, distinct streamers of ours in the category.
 *
 * Unit-tested in lib/__tests__/trending-sort.test.ts.
 */

export type TrendingSortMode = 'twitch' | 'hours' | 'viewers' | 'streamers';

/** Every mode in display order; 'twitch' first because it is the default. */
export const TRENDING_SORT_MODES: readonly TrendingSortMode[] = [
  'twitch',
  'hours',
  'viewers',
  'streamers',
];

export interface TrendingSortItem {
  /** Twitch's own rank — the default order AND the tiebreaker of every mode. */
  rank: number;
  hours28d: number | null;
  liveViewers: number | null;
  /** null = the game is not in our catalog (no stats at all). */
  streamerCount: number | null;
}

export type TrendingOrders = Record<TrendingSortMode, number[]>;

function metricOf(item: TrendingSortItem, mode: TrendingSortMode): number {
  const value =
    mode === 'hours'
      ? item.hours28d
      : mode === 'viewers'
        ? item.liveViewers
        : mode === 'streamers'
          ? item.streamerCount
          : null;
  // null = unknown, never "zero" — a game we don't track must not outrank a
  // tracked one with a real 0.
  return value ?? Number.NEGATIVE_INFINITY;
}

/**
 * Index permutation for one mode: metric desc, unknowns last, ties broken by
 * Twitch rank asc. Deterministic on purpose — the server renders the default
 * order and the client re-derives the others from the same numbers, so a
 * wobbly comparator would show up as a hydration divergence.
 */
function orderFor(items: TrendingSortItem[], mode: TrendingSortMode): number[] {
  const indices = items.map((_, index) => index);
  if (mode === 'twitch') return indices;
  return indices.sort((a, b) => {
    const ma = metricOf(items[a], mode);
    const mb = metricOf(items[b], mode);
    // Explicit comparisons, not subtraction: -Infinity - -Infinity is NaN.
    if (mb > ma) return 1;
    if (mb < ma) return -1;
    return items[a].rank - items[b].rank;
  });
}

export function buildTrendingOrders(items: TrendingSortItem[]): TrendingOrders {
  return {
    twitch: orderFor(items, 'twitch'),
    hours: orderFor(items, 'hours'),
    viewers: orderFor(items, 'viewers'),
    streamers: orderFor(items, 'streamers'),
  };
}

/**
 * Which modes are worth offering for this particular list. A mode whose metric
 * is unknown or zero everywhere would silently fall back to the Twitch order
 * and read as a broken button — that is the realistic night-time state of
 * 'viewers' (no live stream sampled in the last 25 minutes).
 * 'twitch' is always offered; it needs no data.
 */
export function availableTrendingModes(
  items: TrendingSortItem[],
): TrendingSortMode[] {
  return TRENDING_SORT_MODES.filter((mode) => {
    if (mode === 'twitch') return true;
    return items.some((item) => {
      const value = metricOf(item, mode);
      return Number.isFinite(value) && value > 0;
    });
  });
}
