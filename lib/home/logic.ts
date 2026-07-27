// Pure view-model helpers for the feed-style homepage (rebuild 2026-07-27).
// No fetching, no clocks of their own — everything takes its inputs, so the
// functions stay unit-testable (lib/home/__tests__/logic.test.ts).

import type { PublicGame, PublicStreamSlot } from '@/lib/server/partner-api';

/**
 * Top live slots for the "Live now" rail: highest viewer_count first (slots
 * without a fresh viewer sample sort last), one slot per streamer. Input is
 * expected to be live slots already; non-live rows are dropped defensively.
 */
export function pickLiveRailSlots(
  slots: PublicStreamSlot[],
  cap = 12,
): PublicStreamSlot[] {
  const sorted = slots
    .filter((slot) => slot.status === 'live')
    .slice()
    .sort((a, b) => (b.viewer_count ?? -1) - (a.viewer_count ?? -1));

  const seen = new Set<string>();
  const picked: PublicStreamSlot[] = [];
  for (const slot of sorted) {
    if (seen.has(slot.streamer_id)) continue;
    seen.add(slot.streamer_id);
    picked.push(slot);
    if (picked.length >= cap) break;
  }
  return picked;
}

/**
 * How many streamers have an upcoming slot starting within the next N hours.
 * Counts streamers (not slots) so the ticker's "38 starting soon" matches the
 * "214 streamers live" phrasing. Slots already started don't count.
 */
export function countStartingSoon(
  slots: PublicStreamSlot[],
  now: Date,
  hours = 6,
): number {
  const windowEnd = now.getTime() + hours * 60 * 60 * 1000;
  const streamers = new Set<string>();
  for (const slot of slots) {
    if (slot.status !== 'upcoming') continue;
    const start = Date.parse(slot.start_time);
    if (Number.isNaN(start)) continue;
    if (start > now.getTime() && start <= windowEnd) {
      streamers.add(slot.streamer_id);
    }
  }
  return streamers.size;
}

/** Top categories by hours streamed in the 28-day window (most-watched list). */
export function topCategoriesByHours(games: PublicGame[], cap = 5): PublicGame[] {
  return games
    .filter((game) => (game.hours_28d ?? 0) > 0)
    .slice()
    .sort((a, b) => (b.hours_28d ?? 0) - (a.hours_28d ?? 0))
    .slice(0, cap);
}

/**
 * Fetch-URL timestamp bucket (5 min, the lib/server/next-streams.ts
 * convention). Every homepage fetch that embeds a timestamp MUST floor it to
 * this bucket: a raw `new Date().toISOString()` produces a unique URL per
 * render, so the 12 locale prerenders each fire their own uncached API sweep
 * — enough build-time load to time out the sitemap's sequential sweep and
 * abort the deploy (Vercel build failure 2026-07-27).
 */
export const FETCH_BUCKET_MS = 300_000;

/** Floor a date to the fetch bucket — stable data-cache keys inside it. */
export function floorToBucket(date: Date, bucketMs = FETCH_BUCKET_MS): Date {
  return new Date(Math.floor(date.getTime() / bucketMs) * bucketMs);
}

/**
 * Floor a date to the full hour (UTC), as ISO string. Slow-moving homepage
 * queries (clips, quick facts) embed timestamps in their fetch URLs; bucketing
 * keeps the Next data-cache key stable across the page's 60 s re-renders.
 */
export function floorToHourIso(date: Date): string {
  const floored = new Date(date.getTime());
  floored.setUTCMinutes(0, 0, 0);
  return floored.toISOString();
}

export interface PredictionAccuracy {
  hits: number;
  total: number;
  /** Rounded percentage, 0-100. */
  pct: number;
}

/**
 * Aggregate evaluated predictions into the "Prediction check" quick fact.
 * Below `minTotal` evaluations the fact is statistically embarrassing rather
 * than impressive — return null and let the card hide.
 */
export function buildPredictionAccuracy(
  rows: Array<{ was_accurate: boolean | null }>,
  minTotal = 10,
): PredictionAccuracy | null {
  let hits = 0;
  let total = 0;
  for (const row of rows) {
    if (row.was_accurate === null) continue;
    total += 1;
    if (row.was_accurate) hits += 1;
  }
  if (total < minTotal) return null;
  return { hits, total, pct: Math.round((hits / total) * 100) };
}

/**
 * The M14 reliability table stores a rate + sample size; the quick fact wants
 * "started X of Y on time". Clamped so rounding can never claim X > Y.
 */
export function reliabilityHits(rate: number, sample: number): number {
  return Math.min(sample, Math.max(0, Math.round(rate * sample)));
}
