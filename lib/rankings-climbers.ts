// Pure weekly-movers logic for /rankings/climbers — the "Biggest climbers
// this week" recap built from the leaderboards' `values.previous_rank`
// (~7-day-old ranking snapshot). Same layering convention as lib/rankings.ts:
// all selection/sorting rules live here, unit-tested in
// lib/__tests__/rankings-climbers.test.ts; the page stays markup-only.
//
// Semantics guard (see rankTrend): `previous_rank` ABSENT means the snapshot
// history is still warming up — no claim about direction is ever made then.
// `previous_rank: null` on a row that ranks in the CURRENT top list means the
// streamer was not in the ~7d-old top-100 snapshot — "new in the top 100" is
// a statement about presence in the list, which is exactly what the snapshot
// covers. Never extend it to "grew" / "came from nowhere".

import type { PublicRankingEntry } from '@/lib/server/partner-api';
import { rankTrend, type RankingPageSpec } from '@/lib/rankings';

export const MAX_CLIMBERS_PER_METRIC = 10;
export const MAX_NEWCOMERS_PER_METRIC = 5;

/**
 * Thin-content gate, same philosophy as MIN_INDEXABLE_RANKING_ENTRIES: below
 * this many rendered movers across all metric sections the page renders its
 * warming-up state but stays out of the index. Flips automatically as the
 * snapshot history matures.
 */
export const MIN_INDEXABLE_MOVERS = 10;

export interface RankingClimber {
  entry: PublicRankingEntry;
  /** Places climbed vs the ~7-day-old snapshot (>= 1). */
  delta: number;
  /** Rank ~7 days ago (entry.rank + delta). */
  previousRank: number;
}

export interface MetricMovers {
  spec: RankingPageSpec;
  refreshedAt: string | null;
  /** False while the API omits previous_rank entirely (snapshots warming up). */
  hasTrendData: boolean;
  /** Sorted by places climbed desc, ties → better current rank first. */
  climbers: RankingClimber[];
  /** Ranked now, absent from the ~7d-old snapshot — sorted by current rank. */
  newcomers: PublicRankingEntry[];
}

/** Expects SANITIZED entries (sanitizeRankingEntries) so ranks match the leaderboard rows. */
export function computeMovers(
  spec: RankingPageSpec,
  entries: PublicRankingEntry[],
  refreshedAt: string | null = null,
): MetricMovers {
  const hasTrendData = entries.some((e) => e.values.previous_rank !== undefined);
  const climbers: RankingClimber[] = [];
  const newcomers: PublicRankingEntry[] = [];
  for (const entry of entries) {
    const trend = rankTrend(entry);
    if (trend.kind === 'up') {
      climbers.push({ entry, delta: trend.delta, previousRank: entry.rank + trend.delta });
    } else if (trend.kind === 'new') {
      newcomers.push(entry);
    }
  }
  climbers.sort((a, b) => b.delta - a.delta || a.entry.rank - b.entry.rank);
  newcomers.sort((a, b) => a.rank - b.rank);
  return {
    spec,
    refreshedAt,
    hasTrendData,
    climbers: climbers.slice(0, MAX_CLIMBERS_PER_METRIC),
    newcomers: newcomers.slice(0, MAX_NEWCOMERS_PER_METRIC),
  };
}

/** Movers the page would actually render — drives the index gate. */
export function totalMoverCount(all: MetricMovers[]): number {
  return all.reduce((n, m) => n + m.climbers.length + m.newcomers.length, 0);
}

export function isClimbersIndexable(all: MetricMovers[]): boolean {
  return totalMoverCount(all) >= MIN_INDEXABLE_MOVERS;
}

/** Biggest climb across all metrics — feeds the meta description + OG card. */
export function topClimber(
  all: MetricMovers[],
): { movers: MetricMovers; climber: RankingClimber } | null {
  let best: { movers: MetricMovers; climber: RankingClimber } | null = null;
  for (const movers of all) {
    for (const climber of movers.climbers) {
      if (!best || climber.delta > best.climber.delta) best = { movers, climber };
    }
  }
  return best;
}

/** Top climbers across all metrics, deduped by streamer (best delta wins). */
export function topClimbersAcrossMetrics(
  all: MetricMovers[],
  limit: number,
): RankingClimber[] {
  const bestById = new Map<string, RankingClimber>();
  for (const movers of all) {
    for (const climber of movers.climbers) {
      const id = climber.entry.streamer.id;
      const existing = bestById.get(id);
      if (!existing || climber.delta > existing.delta) bestById.set(id, climber);
    }
  }
  return [...bestById.values()]
    .sort((a, b) => b.delta - a.delta || a.entry.rank - b.entry.rank)
    .slice(0, limit);
}
