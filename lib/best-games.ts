// Pure view-model for /best-games-to-stream (M24 Modul C) — the opportunity
// ranking of categories ("viewers per live channel"). Sanitizes the API rows,
// resolves hub slugs, and provides the two client-side sort orders. Rendering
// lives in app/[locale]/best-games-to-stream + BestGamesTable.

import type { BestGameEntry, TimingBestSlot } from '@/lib/server/partner-api';
import { gameSlug } from '@/lib/game-slug';

/**
 * Thin-content gate, same philosophy as MIN_INDEXABLE_RANKING_ENTRIES: below
 * this many rendered rows the page shows its warming state and stays out of
 * the index (also the degraded-API case). Flips automatically as timing data
 * matures.
 */
export const MIN_INDEXABLE_BEST_GAMES = 5;

/** Rows above this are never rendered — the long tail adds nothing. */
export const BEST_GAMES_DISPLAY_LIMIT = 100;

export type BestGamesSort = 'opportunity' | 'competition';

export interface BestGameRow {
  category: string;
  /** Hub slug; linked only when `hasHub` (never emit internal 404 links). */
  slug: string;
  hasHub: boolean;
  score: number;
  avgViewers: number | null;
  avgStreamers: number | null;
  bestSlot: TimingBestSlot | null;
  trackedStreamers: number;
  isTrending: boolean;
  boxArtUrl: string | null;
}

function finiteOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
}

/**
 * Sanitizes + shapes the API rows. `hubCategories` is the /v1/games catalog
 * (categories with a hub page); rows outside it render unlinked. Defensive
 * re-sort by score even though the API already orders — the order is this
 * page's core promise.
 */
export function buildBestGameRows(
  entries: BestGameEntry[],
  hubCategories: ReadonlySet<string>,
): BestGameRow[] {
  const rows: BestGameRow[] = [];
  for (const e of entries) {
    if (typeof e.category !== 'string' || e.category.length === 0) continue;
    const score = finiteOrNull(e.overall_score);
    if (score === null) continue;
    const slug = gameSlug(e.category);
    rows.push({
      category: e.category,
      slug,
      hasHub: slug.length > 0 && hubCategories.has(e.category),
      score,
      avgViewers: finiteOrNull(e.avg_viewers),
      avgStreamers: finiteOrNull(e.avg_streamers),
      bestSlot: e.best_slot ?? null,
      trackedStreamers: e.tracked_streamers ?? 0,
      isTrending: e.is_trending === true,
      boxArtUrl: e.box_art_url ?? null,
    });
  }
  rows.sort((a, b) => b.score - a.score || a.category.localeCompare(b.category));
  return rows.slice(0, BEST_GAMES_DISPLAY_LIMIT);
}

/**
 * The two client-side orders. 'opportunity' = score desc (default,
 * server-rendered). 'competition' = fewest concurrent live channels first
 * (nulls last), score desc as tiebreak — the "where is room for a small
 * streamer" reading.
 */
export function sortBestGameRows(rows: BestGameRow[], sort: BestGamesSort): BestGameRow[] {
  const copy = [...rows];
  if (sort === 'opportunity') {
    copy.sort((a, b) => b.score - a.score || a.category.localeCompare(b.category));
  } else {
    copy.sort((a, b) => {
      const sa = a.avgStreamers ?? Number.POSITIVE_INFINITY;
      const sb = b.avgStreamers ?? Number.POSITIVE_INFINITY;
      return sa - sb || b.score - a.score || a.category.localeCompare(b.category);
    });
  }
  return copy;
}

export function isBestGamesIndexable(rowCount: number): boolean {
  return rowCount >= MIN_INDEXABLE_BEST_GAMES;
}
