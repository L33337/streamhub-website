// Pure view-model for the M24 streamer insights page
// (/streamer/[slug]/insights) and its teaser card on the streamer page.
// Median cells come from the Partner API as {median, samples} where median
// null means "below the reliability threshold" — never coerce to 0.

import type {
  InsightsCategoryEntry,
  InsightsCategoryMarket,
  InsightsFollowerPoint,
  InsightsMedianCell,
  InsightsMonthlyTrendEntry,
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

// ============================================
// Monthly viewer/activity trend (2026-08-01)
// ============================================

const MONTH_RE = /^\d{4}-\d{2}$/;
const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;
const MONTH_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export interface MonthlyTrendView extends InsightsMonthlyTrendEntry {
  /** Short axis label ("Jul"). */
  label: string;
  /** Full label for tooltips ("July 2026"). */
  longLabel: string;
  /** The still-running calendar month — numbers are not final. */
  isCurrent: boolean;
  /**
   * Month began before we started tracking this streamer — history/samples
   * for it are partial by construction (onboarding backfill), so a low bar
   * here is a coverage artifact, not a quiet month.
   */
  isPreTracking: boolean;
}

/** "2026-07" → { short: "Jul", long: "July 2026" }; null on junk. */
export function formatTrendMonth(month: string): { short: string; long: string } | null {
  if (!MONTH_RE.test(month)) return null;
  const m = Number(month.slice(5, 7));
  if (m < 1 || m > 12) return null;
  return { short: MONTH_SHORT[m - 1], long: `${MONTH_LONG[m - 1]} ${month.slice(0, 4)}` };
}

/**
 * Monthly trend view model. Returns null unless at least 2 months carry a
 * real median (a one-point "trend" is not a chart) — activity-only months
 * still render once that gate passes.
 */
export function usableMonthlyTrend(
  trend: InsightsMonthlyTrendEntry[] | null | undefined,
  trackedSince: string | null | undefined,
  now = new Date(),
): MonthlyTrendView[] | null {
  if (!Array.isArray(trend) || trend.length < 2) return null;
  const currentMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const trackedMonth = (() => {
    if (!trackedSince) return null;
    const t = new Date(trackedSince);
    if (Number.isNaN(t.getTime())) return null;
    return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}`;
  })();

  const out: MonthlyTrendView[] = [];
  for (const e of trend) {
    if (!e || typeof e.month !== 'string') return null;
    const labels = formatTrendMonth(e.month);
    if (!labels) return null;
    if (
      (e.median !== null && !Number.isFinite(e.median)) ||
      (e.peak !== null && !Number.isFinite(e.peak)) ||
      !Number.isFinite(e.samples) ||
      !Number.isFinite(e.streams) ||
      !Number.isFinite(e.hours)
    ) {
      return null;
    }
    out.push({
      ...e,
      label: labels.short,
      longLabel: labels.long,
      isCurrent: e.month === currentMonth,
      isPreTracking: trackedMonth !== null && e.month < trackedMonth,
    });
  }
  const withMedian = out.filter((m) => m.median !== null).length;
  return withMedian >= 2 ? out : null;
}

/**
 * Median-viewers delta between the two most recent FULL months that carry a
 * median (the running month would compare a partial against a whole). Null
 * when fewer than 2 qualify.
 */
export function monthlyViewerDelta(
  months: MonthlyTrendView[] | null,
): { latest: MonthlyTrendView; previous: MonthlyTrendView; pct: number } | null {
  if (!months) return null;
  const full = months.filter((m) => !m.isCurrent && !m.isPreTracking && m.median !== null);
  if (full.length < 2) return null;
  const latest = full[full.length - 1];
  const previous = full[full.length - 2];
  const prev = previous.median as number;
  if (prev <= 0) return null;
  return {
    latest,
    previous,
    pct: Math.round((((latest.median as number) - prev) / prev) * 100),
  };
}

// ============================================
// Follower growth (2026-08-01)
// ============================================

export interface FollowerStats {
  points: InsightsFollowerPoint[];
  current: number;
  /** Gain vs the newest snapshot >= 7 days before the last one; null when the series is too short. */
  gain7: number | null;
  /** Gain vs the newest snapshot >= 30 days before the last one. */
  gain30: number | null;
  /** Days covered by the series (last - first). */
  spanDays: number;
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** Follower series → stats; null below 2 usable points. */
export function followerStats(
  trend: InsightsFollowerPoint[] | null | undefined,
): FollowerStats | null {
  if (!Array.isArray(trend)) return null;
  const points = trend.filter(
    (p) =>
      p &&
      typeof p.date === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(p.date) &&
      typeof p.count === 'number' &&
      Number.isFinite(p.count),
  );
  if (points.length < 2) return null;
  const last = points[points.length - 1];
  const baseline = (minDays: number): InsightsFollowerPoint | null => {
    for (let i = points.length - 1; i >= 0; i--) {
      if (daysBetween(points[i].date, last.date) >= minDays) return points[i];
    }
    return null;
  };
  const b7 = baseline(7);
  const b30 = baseline(30);
  return {
    points,
    current: last.count,
    gain7: b7 ? last.count - b7.count : null,
    gain30: b30 ? last.count - b30.count : null,
    spanDays: daysBetween(points[0].date, last.date),
  };
}

/**
 * "≈ N new followers per streamed hour" proxy: 30d follower gain over 30d
 * observed streamed hours. Needs >= 10 observed hours (a 2-hour month makes
 * the ratio scream) and a non-negative gain — a decline per hour is noise,
 * not a conversion rate.
 */
export function followersPerStreamHour(
  gain30: number | null,
  observedHours30d: number | null | undefined,
): number | null {
  if (gain30 === null || gain30 < 0) return null;
  if (typeof observedHours30d !== 'number' || observedHours30d < 10) return null;
  return Math.round((gain30 / observedHours30d) * 10) / 10;
}

// ============================================
// Category market context (2026-08-01)
// ============================================

/** Category → market entry map (defensive; empty map on junk). */
export function marketByCategory(
  market: InsightsCategoryMarket[] | null | undefined,
): Map<string, InsightsCategoryMarket> {
  const map = new Map<string, InsightsCategoryMarket>();
  if (!Array.isArray(market)) return map;
  for (const m of market) {
    if (
      m &&
      typeof m.category === 'string' &&
      m.category.length > 0 &&
      typeof m.avg_viewers_per_channel === 'number' &&
      Number.isFinite(m.avg_viewers_per_channel) &&
      m.avg_viewers_per_channel > 0
    ) {
      map.set(m.category, m);
    }
  }
  return map;
}

/**
 * Signed percent of the streamer's median vs the category's average viewers
 * per live channel ("vs. typical channel"). Null when either side is unusable.
 */
export function marketDeltaPct(
  median: number | null,
  market: InsightsCategoryMarket | undefined,
): number | null {
  if (median === null || !Number.isFinite(median) || !market) return null;
  return Math.round((median / market.avg_viewers_per_channel - 1) * 100);
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
