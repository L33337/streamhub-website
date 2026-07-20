// Pure view-model for the "Rankings" block on the streamer detail page.
//
// Turns GET /v1/streamers/{id}/rankings into linked rows: "#3 of 236 · Most
// followed" pointing at the exact page and row of the leaderboard the streamer
// sits on. Same convention as lib/rankings.ts and lib/game-ranking.ts — all
// display logic lives here so the component stays markup-only and every rule
// is unit-testable (lib/__tests__/streamer-rankings.test.ts).
//
// PAGE SIZES ARE THE CONTRACT. The deep links below assume the leaderboard
// pages slice their entries exactly this way; the paginated routes import these
// same constants. Changing one without the other points readers at the wrong
// page.

import type {
  PublicGamePlacement,
  PublicRankingPlacement,
  PublicStreamerRankings,
  RankingMetric,
} from '@/lib/server/partner-api';
import { gameSlug } from '@/lib/game-slug';

/** Entries per page on /rankings/<metric>. */
export const RANKING_PAGE_SIZE = 100;

/**
 * Entries per page on /rankings/game/<slug>. Same size as the global pages so
 * the two deep-link rules stay identical. At 100 the largest category we track
 * (Just Chatting, 98 streamers as of 2026-07-20) still fits on page 1, which
 * also keeps GameRankingExplorer's client-side sort covering the whole pool
 * rather than one slice of it.
 */
export const GAME_RANKING_PAGE_SIZE = 100;

/**
 * Hard cap on rows in the streamer-page block. The API already caps games at 8;
 * with up to 5 global metrics a variety streamer could otherwise push 13 rows
 * into what is meant to be a scannable summary.
 */
export const MAX_STREAMER_RANKING_ROWS = 8;

// ============================================
// Paging math
// ============================================

/**
 * 1-based page a given rank falls on. Rank 100 with page size 100 is the last
 * row of page 1, rank 101 the first of page 2.
 */
export function pageForRank(rank: number, pageSize: number): number {
  if (!Number.isFinite(rank) || rank < 1 || pageSize < 1) return 1;
  return Math.ceil(rank / pageSize);
}

/** Total pages for a pool size (always >= 1, so an empty ranking still has page 1). */
export function pageCount(total: number, pageSize: number): number {
  if (!Number.isFinite(total) || total < 1 || pageSize < 1) return 1;
  return Math.ceil(total / pageSize);
}

/**
 * Deep link to a rank: page 1 keeps the clean canonical URL, deeper pages get
 * the /<n> segment. The #rank-<n> fragment matches RankingTable's row ids,
 * which are keyed on the ABSOLUTE rank — so this lands on the row itself.
 */
export function rankingHref(metric: RankingMetric, rank: number): string {
  const page = pageForRank(rank, RANKING_PAGE_SIZE);
  const base = page === 1 ? `/rankings/${metric}` : `/rankings/${metric}/${page}`;
  return `${base}#rank-${rank}`;
}

/** Same for a per-category ranking. Returns null when the category has no page. */
export function gameRankingHref(category: string, rank: number): string | null {
  const slug = gameSlug(category);
  if (!slug) return null;
  const page = pageForRank(rank, GAME_RANKING_PAGE_SIZE);
  const base = page === 1 ? `/rankings/game/${slug}` : `/rankings/game/${slug}/${page}`;
  return `${base}#rank-${rank}`;
}

// ============================================
// Trend
// ============================================

export type RankTrend =
  | { kind: 'none' }
  | { kind: 'up'; delta: number }
  | { kind: 'down'; delta: number };

/**
 * Rank movement vs the ~7-day baseline.
 *
 * Deliberately has no 'new' state, unlike lib/rankings.ts#rankTrend: on a
 * leaderboard a missing baseline means "wasn't in the top 100 last week", which
 * genuinely is news. Here ranks are unbounded, so a missing baseline only means
 * the snapshot didn't reach deep enough — showing "NEW" would assert a rise
 * that may never have happened. Unknown → no arrow.
 */
export function rankTrend(rank: number, previousRank: number | null): RankTrend {
  if (previousRank == null || !Number.isFinite(previousRank)) return { kind: 'none' };
  const delta = previousRank - rank;
  if (delta > 0) return { kind: 'up', delta };
  if (delta < 0) return { kind: 'down', delta: -delta };
  return { kind: 'none' };
}

// ============================================
// Rows
// ============================================

export interface StreamerRankingRow {
  /** Stable React key. */
  key: string;
  rank: number;
  total: number;
  /** Localized label, e.g. "Most followed" or the category name. */
  label: string;
  /** Leaderboard link, or null when the target page does not exist. */
  href: string | null;
  trend: RankTrend;
  /** True for per-category rows (styled as a secondary group). */
  isGame: boolean;
}

/** Label lookup, injected so this module stays free of the i18n import graph. */
export interface RankingLabels {
  metric: Record<RankingMetric, string>;
}

/**
 * Ranks worth showing. A placement in a pool of 2 is noise ("#1 of 2" reads as
 * an achievement but isn't), and the API's own game gate is 3 streamers, so we
 * align on the same floor for every ranking.
 */
export const MIN_POOL_SIZE = 3;

function isMeaningful(p: { rank: number; total: number }): boolean {
  return (
    Number.isInteger(p.rank) &&
    p.rank >= 1 &&
    Number.isInteger(p.total) &&
    p.total >= MIN_POOL_SIZE &&
    p.rank <= p.total
  );
}

function globalRow(p: PublicRankingPlacement, labels: RankingLabels): StreamerRankingRow {
  return {
    key: p.metric,
    rank: p.rank,
    total: p.total,
    label: labels.metric[p.metric] ?? p.metric,
    href: rankingHref(p.metric, p.rank),
    trend: rankTrend(p.rank, p.previous_rank),
    isGame: false,
  };
}

function gameRow(p: PublicGamePlacement): StreamerRankingRow {
  return {
    key: `game:${p.category}`,
    rank: p.rank,
    total: p.total,
    label: p.category,
    href: gameRankingHref(p.category, p.rank),
    trend: rankTrend(p.rank, p.previous_rank),
    isGame: true,
  };
}

/**
 * Ordered, filtered rows for the block: global placements first (API order is
 * already the leaderboard display order), then categories (API order is already
 * by relevance). Returns [] when nothing is worth showing, which the component
 * renders as "no section at all".
 */
export function buildStreamerRankingRows(
  data: PublicStreamerRankings | null,
  labels: RankingLabels,
): StreamerRankingRow[] {
  if (!data) return [];
  const rows: StreamerRankingRow[] = [
    ...data.rankings.filter(isMeaningful).map((p) => globalRow(p, labels)),
    ...data.games.filter(isMeaningful).map(gameRow),
  ];
  return rows.slice(0, MAX_STREAMER_RANKING_ROWS);
}

// Note: a "#3 Most followed" sentence in the streamer page's meta description
// would be a strong SEO signal, but buildStreamerMetadata already composes
// tightly length-budgeted descriptions per language and per live/next-stream
// branch. Left as a follow-up rather than half-wired here — the block's own
// crawlable copy and its two-way internal links are the substantive win.
