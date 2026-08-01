// Pure view-model for the homepage "Quick facts" section (expansion
// 2026-08-01: marathon, comeback, prime time, busiest day, top category,
// competition level, room-to-grow).
//
// No fetching and no clock of its own — the RPC payloads, the Partner API
// rows and the hour stamp all come in as arguments, so every rule here stays
// unit-testable (lib/home/__tests__/quick-facts.test.ts).
//
// TIMEZONE CONTRACT: the start histogram and the best slot arrive in the UTC
// frame (index = weekday * 24 + hour, weekday 0 = Monday per ISO-8601 — the
// same frame as lib/game-heatmap.ts and lib/game-timing.ts). Nothing here
// resolves a viewer timezone; the callers pass `shiftHours`, which is 0 during
// SSR and the browser's offset after hydration.

import type { BestGameEntry, TimingBestSlot } from '@/lib/server/partner-api';
import { HEATMAP_CELLS, shiftHistogram } from '@/lib/game-heatmap';
import { gameSlug } from '@/lib/game-slug';
import { weekdayLong } from '@/lib/i18n-core';
import { formatLineupHour } from '@/lib/home/lineup-filters';

/** Cards rendered at once — the rest of the pool waits for its rotation turn. */
export const QUICK_FACTS_VISIBLE = 4;

/**
 * Below this the section hides: a single card dangles under a section heading
 * and reads as a bug rather than a stat. Mirrored by the section-nav chip rule
 * in app/[locale]/page.tsx, which calls countQuickFacts() for exactly that.
 */
export const MIN_QUICK_FACT_CARDS = 2;

/**
 * Session floor for the two histogram-derived cards. Both make a superlative
 * claim ("more streams start at 8pm than at any other hour"), which needs a
 * body of data behind it — on a young or degraded dataset the peak is noise.
 */
export const MIN_HISTOGRAM_SESSIONS = 200;

/**
 * "Competition level" needs a category whose channel count is an average over
 * a real roster, not over three streamers who happened to be live together.
 */
export const COMPETITION_MIN_TRACKED = 10;

/**
 * "Room to grow" is deliberately stricter: it is advice, and a category with a
 * handful of tracked channels produces a spectacular viewers-per-channel score
 * out of one event stream (the known M24 skew — see Epic Milestone 24 §7).
 */
export const ROOM_MIN_TRACKED = 15;

/**
 * …and it must actually be uncontested. Above this many concurrently live
 * tracked channels the category is a crowd, whatever its score says (Just
 * Chatting scores highest of all AND runs 8 channels deep).
 */
export const ROOM_MAX_AVG_STREAMERS = 3;

// ---------------------------------------------------------------------------
// RPC payload parsing
// ---------------------------------------------------------------------------

export interface MarathonFact {
  streamerId: string;
  streamerName: string;
  category: string | null;
  minutes: number;
}

export interface ComebackFact {
  streamerId: string;
  streamerName: string;
  gapDays: number;
}

export interface StartHistogramFact {
  /** 168 session starts per UTC weekday-hour cell. */
  cells: number[];
  /** Sessions behind the histogram — the sample size the cards cite. */
  total: number;
}

export interface TopCategoryFact {
  category: string;
  sessions: number;
  streamers: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function posInt(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : null;
}

export function parseMarathon(payload: unknown): MarathonFact | null {
  if (!isRecord(payload)) return null;
  const streamerId = str(payload.streamer_id);
  const streamerName = str(payload.streamer_name);
  const minutes = posInt(payload.minutes);
  if (!streamerId || !streamerName || minutes === null) return null;
  return { streamerId, streamerName, category: str(payload.category), minutes };
}

export function parseComeback(payload: unknown): ComebackFact | null {
  if (!isRecord(payload)) return null;
  const streamerId = str(payload.streamer_id);
  const streamerName = str(payload.streamer_name);
  const gapDays = posInt(payload.gap_days);
  if (!streamerId || !streamerName || gapDays === null) return null;
  return { streamerId, streamerName, gapDays };
}

export function parseStartHistogram(payload: unknown): StartHistogramFact | null {
  if (!isRecord(payload)) return null;
  const { cells } = payload;
  if (!Array.isArray(cells) || cells.length !== HEATMAP_CELLS) return null;
  if (!cells.every((c) => typeof c === 'number' && Number.isFinite(c) && c >= 0)) {
    return null;
  }
  // Trust the array, not the reported total: they can only disagree if the
  // payload is malformed, and every card cites `total` as its sample size.
  const total = (cells as number[]).reduce((sum, c) => sum + c, 0);
  if (total < MIN_HISTOGRAM_SESSIONS) return null;
  return { cells: cells as number[], total };
}

export function parseTopCategory(payload: unknown): TopCategoryFact | null {
  if (!isRecord(payload)) return null;
  const category = str(payload.category);
  const sessions = posInt(payload.sessions);
  const streamers = posInt(payload.streamers);
  if (!category || sessions === null || streamers === null) return null;
  return { category, sessions, streamers };
}

// ---------------------------------------------------------------------------
// Histogram derivations (timezone-shifted)
// ---------------------------------------------------------------------------

export interface PeakHour {
  /** 0-23 in the shifted frame. */
  hour: number;
  sessions: number;
}

export interface BusiestDay {
  /** 0-6 in the shifted frame, 0 = Monday. */
  dow: number;
  sessions: number;
  /** Share of all sessions, 0-100, rounded. */
  sharePct: number;
}

/**
 * Hour of day that starts the most streams. Ties resolve to the earlier hour so
 * the value never flickers between two equal peaks across re-renders.
 */
export function peakStartHour(
  cells: number[],
  shiftHours: number,
): PeakHour | null {
  const shifted = shiftHistogram(cells, shiftHours);
  const perHour = new Array<number>(24).fill(0);
  for (let i = 0; i < HEATMAP_CELLS; i++) perHour[i % 24] += shifted[i];
  let hour = 0;
  for (let h = 1; h < 24; h++) if (perHour[h] > perHour[hour]) hour = h;
  if (perHour[hour] <= 0) return null;
  return { hour, sessions: perHour[hour] };
}

/** Weekday with the most stream starts, plus its share of the week. */
export function busiestWeekday(
  cells: number[],
  shiftHours: number,
): BusiestDay | null {
  const shifted = shiftHistogram(cells, shiftHours);
  const perDay = new Array<number>(7).fill(0);
  let total = 0;
  for (let i = 0; i < HEATMAP_CELLS; i++) {
    perDay[Math.floor(i / 24)] += shifted[i];
    total += shifted[i];
  }
  if (total <= 0) return null;
  let dow = 0;
  for (let d = 1; d < 7; d++) if (perDay[d] > perDay[dow]) dow = d;
  if (perDay[dow] <= 0) return null;
  return {
    dow,
    sessions: perDay[dow],
    sharePct: Math.round((perDay[dow] / total) * 100),
  };
}

// ---------------------------------------------------------------------------
// Partner API (M24 best-to-stream) derivations
// ---------------------------------------------------------------------------

export interface CompetitionFact {
  category: string;
  slug: string;
  /** Only link when the category has a hub page — never emit an internal 404. */
  hasHub: boolean;
  avgStreamers: number;
  avgViewers: number | null;
  score: number | null;
  trackedStreamers: number;
}

export interface RoomToGrowFact {
  category: string;
  slug: string;
  hasHub: boolean;
  score: number;
  avgStreamers: number;
  trackedStreamers: number;
  /** UTC frame, dow 0 = Monday. Null when the category has no scored cell. */
  bestSlot: TimingBestSlot | null;
}

function finitePositive(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function hubSlug(category: string, hubCategories: ReadonlySet<string>) {
  const slug = gameSlug(category);
  return { slug, hasHub: slug.length > 0 && hubCategories.has(category) };
}

/**
 * "Competition level": the category running the most tracked channels side by
 * side. Deliberately NOT the lowest opportunity score — that would surface a
 * category nobody watches (few viewers, few channels) and call it crowded.
 */
export function pickCompetitionFact(
  entries: BestGameEntry[],
  hubCategories: ReadonlySet<string>,
): CompetitionFact | null {
  let best: CompetitionFact | null = null;
  for (const entry of entries) {
    const category = str(entry.category);
    const avgStreamers = finitePositive(entry.avg_streamers);
    const tracked = entry.tracked_streamers ?? 0;
    if (!category || avgStreamers === null || tracked < COMPETITION_MIN_TRACKED) continue;
    if (
      best === null ||
      avgStreamers > best.avgStreamers ||
      // Deterministic tiebreak so equal leaders never alternate between renders.
      (avgStreamers === best.avgStreamers && category.localeCompare(best.category) < 0)
    ) {
      best = {
        category,
        ...hubSlug(category, hubCategories),
        avgStreamers,
        avgViewers: finitePositive(entry.avg_viewers),
        score: finitePositive(entry.overall_score),
        trackedStreamers: tracked,
      };
    }
  }
  return best;
}

/**
 * "Room to grow": the best viewers-per-channel score among categories that are
 * genuinely uncontested. Both gates matter — without ROOM_MIN_TRACKED the
 * winner is a one-off event category, without ROOM_MAX_AVG_STREAMERS it is
 * simply the biggest category on the platform.
 */
export function pickRoomToGrowFact(
  entries: BestGameEntry[],
  hubCategories: ReadonlySet<string>,
): RoomToGrowFact | null {
  let best: RoomToGrowFact | null = null;
  for (const entry of entries) {
    const category = str(entry.category);
    const score = finitePositive(entry.overall_score);
    const avgStreamers = finitePositive(entry.avg_streamers);
    const tracked = entry.tracked_streamers ?? 0;
    if (!category || score === null || avgStreamers === null) continue;
    if (tracked < ROOM_MIN_TRACKED || avgStreamers > ROOM_MAX_AVG_STREAMERS) continue;
    if (
      best === null ||
      score > best.score ||
      (score === best.score && category.localeCompare(best.category) < 0)
    ) {
      best = {
        category,
        ...hubSlug(category, hubCategories),
        score,
        avgStreamers,
        trackedStreamers: tracked,
        bestSlot: entry.best_slot ?? null,
      };
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Pre-rendered label tables
// ---------------------------------------------------------------------------
//
// The prime-time / busiest-day / best-slot values are only known after
// hydration (they depend on the viewer's UTC offset), but they must not be
// formatted in the browser: that would need the locale's Intl data on the
// client and could disagree with the server's rendering. Instead the server
// ships the full label table and the island indexes into it.

/** 7 weekday names, Monday first (ISO index), in `locale`. */
export function weekdayLabels(locale: string): string[] {
  return Array.from({ length: 7 }, (_, d) => weekdayLong(d, locale));
}

/** 24 clock readings ("8:00 PM" / "20:00"), hour 0-23, in `locale`. */
export function hourLabels(locale: string): string[] {
  return Array.from({ length: 24 }, (_, h) => formatLineupHour(h, locale));
}

// ---------------------------------------------------------------------------
// Rotation
// ---------------------------------------------------------------------------

/** Whole hours since the epoch — the rotation clock. */
export function hourStamp(now: Date): number {
  return Math.floor(now.getTime() / 3_600_000);
}

/**
 * Picks the `visible` cards of this hour out of the pool, cycling forward by
 * one card per hour. Server-side only: the served HTML carries one hour's
 * selection, so nothing recomputes on the client and no hydration can mismatch
 * (an ISR-stale page simply shows the previous hour's four, which is fine).
 *
 * A shrinking pool changes which cards a given hour yields — deliberate. The
 * alternative (a stable per-card schedule) would leave holes in the grid
 * whenever a fact goes null.
 */
export function rotateFacts<T>(
  pool: T[],
  stamp: number,
  visible = QUICK_FACTS_VISIBLE,
): T[] {
  if (pool.length === 0) return [];
  if (pool.length <= visible) return pool.slice();
  const offset = ((stamp % pool.length) + pool.length) % pool.length;
  return Array.from({ length: visible }, (_, i) => pool[(offset + i) % pool.length]);
}
