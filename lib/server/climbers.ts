// Failure-isolated data loader for /rankings/climbers (page + OG image).
// React cache() dedupes the fetches between generateMetadata and the page
// body within one render; across requests the underlying fetches share the
// leaderboards' data cache (identical URL + revalidate — zero extra Partner
// API load). Never throws: a throw during prerender aborts the whole
// production build (lib/og/leaderboard.tsx rule); a failed metric simply
// drops out of the recap and ISR self-heals within the hour.

import { cache } from 'react';
import { getPartnerApi, type PublicRankingEntry } from '@/lib/server/partner-api';
import { getRankingPageSpec, sanitizeRankingEntries, type RankingPageSpec } from '@/lib/rankings';
import { computeMovers, type MetricMovers } from '@/lib/rankings-climbers';
import { RANKING_PAGE_SIZE } from '@/lib/streamer-rankings';

/**
 * Metrics with meaningful week-over-week RANK movement. fastest-growing is
 * itself a weekly-gain board (rank-over-rank of a 7d delta is noise) — it
 * feeds the growth spotlight below instead; most-reliable moves too slowly
 * for a weekly recap.
 */
export const MOVER_METRIC_SLUGS = ['most-followed', 'most-watched', 'most-active'] as const;

export const GROWTH_SPOTLIGHT_LIMIT = 5;

export interface ClimbersData {
  /** One block per mover metric whose fetch succeeded, in MOVER_METRIC_SLUGS order. */
  movers: MetricMovers[];
  /** Top of /rankings/fastest-growing for the growth spotlight; null while empty/failed. */
  growth: { spec: RankingPageSpec; entries: PublicRankingEntry[] } | null;
}

export const loadClimbersData = cache(async (): Promise<ClimbersData> => {
  const movers: MetricMovers[] = [];
  let growth: ClimbersData['growth'] = null;
  try {
    const api = getPartnerApi(); // throws when the key is unset — stay inside try
    const results = await Promise.allSettled(
      [...MOVER_METRIC_SLUGS, 'fastest-growing' as const].map((metric) =>
        api.getRankings(metric, { limit: RANKING_PAGE_SIZE, revalidate: 3600 }),
      ),
    );
    MOVER_METRIC_SLUGS.forEach((slug, i) => {
      const call = results[i];
      const spec = getRankingPageSpec(slug);
      if (!spec || call.status !== 'fulfilled') return;
      const entries = sanitizeRankingEntries(spec, call.value.data);
      movers.push(computeMovers(spec, entries, call.value.refreshed_at));
    });
    const growthCall = results[MOVER_METRIC_SLUGS.length];
    const growthSpec = getRankingPageSpec('fastest-growing');
    if (growthSpec && growthCall.status === 'fulfilled') {
      const entries = sanitizeRankingEntries(growthSpec, growthCall.value.data).slice(
        0,
        GROWTH_SPOTLIGHT_LIMIT,
      );
      if (entries.length > 0) growth = { spec: growthSpec, entries };
    }
  } catch {
    // degrade to the warming-up page (noindex via the mover gate)
  }
  return { movers, growth };
});
