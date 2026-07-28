// Pure view-model helpers for the feed-style homepage (rebuild 2026-07-27).
// No fetching, no clocks of their own — everything takes its inputs, so the
// functions stay unit-testable (lib/home/__tests__/logic.test.ts).

import type { PublicGame, PublicStreamSlot } from '@/lib/server/partner-api';

// The live rail's own helpers (pool picking, runtime estimate, filters) moved
// to lib/home/live-rail.ts with the "Most Watched right now" rebuild.

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

/**
 * Only slots whose start still lies in the future. The lineup fetch already
 * asks for start_time >= bucketedNow, but the 5-min URL bucket plus ISR
 * staleness leave "upcoming" slots whose start has passed — those render as
 * "was expected at …" cards, which "Today's lineup" must never show. Server
 * half of the fix; HomeUpNextFilters hides expired cards client-side because
 * the served HTML itself can be minutes-to-hours stale.
 */
export function filterFutureSlots(
  slots: PublicStreamSlot[],
  now: Date,
): PublicStreamSlot[] {
  return slots.filter((slot) => {
    const start = Date.parse(slot.start_time);
    return !Number.isNaN(start) && start > now.getTime();
  });
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
 * Aggregate evaluated HIGH-confidence predictions into the "Prediction
 * check" quick fact (the caller's fetch is already confidence-filtered).
 * Cancelled pause-slots are dropped here: their evaluation semantics are
 * inverted (expiring WITHOUT a stream = accurate), so the tile's "started
 * within the two-hour window" wording would not cover them. The tile is a
 * homepage trust signal, not a lab report — below `minTotal` evaluations or
 * below `minPct` percent the number reads as an admission rather than a
 * proof point; return null and let the card hide (UX round 2026-07-27:
 * the all-confidence share hovered near 50% and looked like a coin flip).
 */
export function buildPredictionAccuracy(
  rows: Array<{ was_accurate: boolean | null; slot_kind?: string | null }>,
  minTotal = 20,
  minPct = 65,
): PredictionAccuracy | null {
  let hits = 0;
  let total = 0;
  for (const row of rows) {
    if (row.was_accurate === null) continue;
    if (row.slot_kind === 'cancelled') continue;
    total += 1;
    if (row.was_accurate) hits += 1;
  }
  if (total < minTotal) return null;
  const pct = Math.round((hits / total) * 100);
  if (pct < minPct) return null;
  return { hits, total, pct };
}

/**
 * The M14 reliability table stores a rate + sample size; the quick fact wants
 * "started X of Y on time". Clamped so rounding can never claim X > Y.
 */
export function reliabilityHits(rate: number, sample: number): number {
  return Math.min(sample, Math.max(0, Math.round(rate * sample)));
}

/**
 * Uniform random sample of `count` items (partial Fisher–Yates on a copy).
 * The RNG is injected so tests stay deterministic; callers pass Math.random.
 */
export function sampleRandom<T>(
  items: T[],
  count: number,
  random: () => number,
): T[] {
  const pool = items.slice();
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(random() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

/**
 * Order a sampled candidate list so entries with a known next stream come
 * first (sample order preserved within each half), then cap. The discover
 * grid promises "next stream + category" — candidates that can actually
 * show it should win the six visible cards.
 */
export function preferWithNextSlot<T extends { id: string }>(
  candidates: T[],
  withSlotIds: ReadonlySet<string>,
  count: number,
): T[] {
  const withSlot = candidates.filter((c) => withSlotIds.has(c.id));
  const without = candidates.filter((c) => !withSlotIds.has(c.id));
  return [...withSlot, ...without].slice(0, count);
}

export interface HistoryIntervalRow {
  streamer_id: string;
  started_at: string;
  ended_at: string | null;
}

export interface WeekStreamedEntry {
  streamerId: string;
  hours: number;
  sessions: number;
}

/**
 * Twitch splits one night into several VODs and a simulcast writes one
 * stream_history row per platform — merging rows whose gap is below this
 * tolerance folds both back into one session (the pure-TS sibling of the
 * gaps-and-islands dedupe in compute_streamer_stats, see CLAUDE.md
 * "Session counting").
 */
const SESSION_GAP_TOLERANCE_MS = 15 * 60 * 1000;

/**
 * "Most streamed this week": union the vod intervals per streamer into
 * sessions, rank by total hours live. Rows with unparseable/missing bounds
 * are dropped; intervals are clamped to [since, now] so a marathon that
 * started before the window only counts its in-window share.
 */
export function rankWeekStreamed(
  rows: HistoryIntervalRow[],
  since: Date,
  now: Date,
  top = 3,
): WeekStreamedEntry[] {
  const byStreamer = new Map<string, Array<{ start: number; end: number }>>();
  for (const row of rows) {
    const start = Date.parse(row.started_at);
    const end = row.ended_at ? Date.parse(row.ended_at) : Number.NaN;
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) continue;
    const clampedStart = Math.max(start, since.getTime());
    const clampedEnd = Math.min(end, now.getTime());
    if (clampedEnd <= clampedStart) continue;
    const list = byStreamer.get(row.streamer_id) ?? [];
    list.push({ start: clampedStart, end: clampedEnd });
    byStreamer.set(row.streamer_id, list);
  }

  const entries: WeekStreamedEntry[] = [];
  for (const [streamerId, intervals] of byStreamer) {
    intervals.sort((a, b) => a.start - b.start);
    let totalMs = 0;
    let sessions = 0;
    let currentStart = -1;
    let currentEnd = -1;
    for (const interval of intervals) {
      if (currentEnd >= 0 && interval.start <= currentEnd + SESSION_GAP_TOLERANCE_MS) {
        currentEnd = Math.max(currentEnd, interval.end);
      } else {
        if (currentEnd >= 0) {
          totalMs += currentEnd - currentStart;
          sessions += 1;
        }
        currentStart = interval.start;
        currentEnd = interval.end;
      }
    }
    if (currentEnd >= 0) {
      totalMs += currentEnd - currentStart;
      sessions += 1;
    }
    entries.push({ streamerId, hours: totalMs / 3_600_000, sessions });
  }

  return entries.sort((a, b) => b.hours - a.hours).slice(0, top);
}
