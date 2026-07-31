// Pure view-model for the M24 streamer insights page
// (/streamer/[slug]/insights) and its teaser card on the streamer page.
// Median cells come from the Partner API as {median, samples} where median
// null means "below the reliability threshold" — never coerce to 0.

import type {
  InsightsCategoryEntry,
  InsightsMedianCell,
  StreamerInsights,
} from '@/lib/server/partner-api';

// Below this many samples the page renders the collecting state (mirrors the
// backend's "empty stats → sample_count 0" convention with a small buffer:
// single-digit sample counts produce junk medians).
export const COLLECTING_THRESHOLD = 10;

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export const WEEKDAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

/** Well-formed cell array of the expected length, else null. */
export function usableCells(
  value: InsightsMedianCell[] | null | undefined,
  length: number,
): InsightsMedianCell[] | null {
  if (!Array.isArray(value) || value.length !== length) return null;
  const ok = value.every(
    (c) =>
      c !== null &&
      typeof c === 'object' &&
      (c.median === null || (typeof c.median === 'number' && Number.isFinite(c.median))) &&
      typeof c.samples === 'number',
  );
  if (!ok) return null;
  return value.some((c) => c.median !== null) ? value : null;
}

/**
 * Rotates the 24 hour cells from UTC into a timezone `shiftHours` ahead of
 * UTC. Exact per-cell mapping: samples bucketed at UTC hour h are seen at
 * local hour h + shift. (Weekday cells can NOT be shifted this way — a day
 * boundary crossing would move samples between weekday buckets we no longer
 * have — so weekday bars render UTC-labelled, matching the site's "days
 * follow the UTC calendar" convention.)
 */
export function shiftHourCells(
  cells: InsightsMedianCell[],
  shiftHours: number,
): InsightsMedianCell[] {
  const out = new Array<InsightsMedianCell>(24);
  const shift = ((Math.trunc(shiftHours) % 24) + 24) % 24;
  for (let i = 0; i < 24; i++) {
    out[(i + shift) % 24] = cells[i];
  }
  return out;
}

/**
 * Whole-hour UTC offset of an IANA timezone at `now`, or null when the zone
 * is invalid. Client-safe (pure Intl), used by the streamer-TZ toggle.
 */
export function tzOffsetHours(timeZone: string, now = new Date()): number | null {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    const parts = dtf.formatToParts(now);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    const asUtc = Date.UTC(
      get('year'),
      get('month') - 1,
      get('day'),
      get('hour') % 24,
      get('minute'),
    );
    return Math.round((asUtc - now.getTime()) / 3_600_000);
  } catch {
    return null;
  }
}

/** Best weekday cell (highest median with enough samples), for bars + teaser. */
export function bestWeekday(
  cells: InsightsMedianCell[] | null,
  minSamples = 5,
): { index: number; median: number; samples: number } | null {
  if (!cells) return null;
  let best: { index: number; median: number; samples: number } | null = null;
  cells.forEach((c, index) => {
    if (c.median === null || c.samples < minSamples) return;
    if (!best || c.median > best.median) best = { index, median: c.median, samples: c.samples };
  });
  return best;
}

/** Teaser card payload for the streamer page; null = don't render the card. */
export function buildInsightsTeaser(
  insights: StreamerInsights | null,
): { bestDay: string; median: number } | null {
  if (!insights || insights.sample_count < COLLECTING_THRESHOLD) return null;
  const cells = usableCells(insights.weekday_viewers ?? null, 7);
  const best = bestWeekday(cells);
  if (!best) return null;
  return { bestDay: WEEKDAY_NAMES[best.index], median: Math.round(best.median) };
}

/** '1k-10k' → "1k–10k followers"; null-safe. */
export function formatFollowerBand(band: string | null | undefined): string | null {
  if (!band) return null;
  if (band === '<1k') return 'under 1k followers';
  if (band === '100k+') return 'over 100k followers';
  return `${band.replace('-', '–')} followers`;
}

/**
 * "Top 11% of channels your size" sentence input. percentile = % of band
 * peers with a LOWER median, so top share = 100 - percentile. Clamped to
 * >= 1 so a #1 spot reads "top 1%", never "top 0%".
 */
export function sizeBenchmarkTopShare(percentile: number | null | undefined): number | null {
  if (percentile === null || percentile === undefined) return null;
  if (!Number.isFinite(percentile) || percentile < 0 || percentile > 100) return null;
  return Math.max(1, 100 - Math.round(percentile));
}

/** Usable category rows for the performance table (drops junk, keeps order). */
export function usableCategoryRows(
  value: InsightsCategoryEntry[] | null | undefined,
): InsightsCategoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (e) =>
      e &&
      typeof e.category === 'string' &&
      e.category.length > 0 &&
      typeof e.samples === 'number' &&
      e.samples > 0,
  );
}

/**
 * Category with the highest median among rows observed for at least
 * `minHours` (a 1-hour spike must never win the "highest median" marker).
 * Null when fewer than 2 rows qualify — a superlative over one row, or over
 * a table where nothing is comparable, is noise.
 */
export function bestMedianCategory(
  rows: InsightsCategoryEntry[],
  minHours = 10,
): string | null {
  const qualified = rows.filter(
    (r) =>
      typeof r.median === 'number' &&
      Number.isFinite(r.median) &&
      (r.hours ?? 0) >= minHours,
  );
  if (qualified.length < 2) return null;
  let best: InsightsCategoryEntry | null = null;
  for (const r of qualified) {
    if (!best || (r.median as number) > (best.median as number)) best = r;
  }
  return best?.category ?? null;
}

/** Extracts a plain nullable series from {median,samples} ramp cells. */
export function rampMedians(
  cells: InsightsMedianCell[] | null | undefined,
): (number | null)[] | null {
  const usable = usableCells(cells ?? null, 12);
  if (!usable) return null;
  return usable.map((c) => c.median);
}

/** Vacation banner only for real future dates. */
export function isOnVacation(
  vacationUntil: string | null | undefined,
  now = new Date(),
): boolean {
  if (!vacationUntil) return false;
  const t = Date.parse(vacationUntil);
  return Number.isFinite(t) && t > now.getTime();
}
