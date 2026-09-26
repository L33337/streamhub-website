// Pure view-model for the "When is {game} streamed?" heatmap (game-hub UX
// round 2026-07-23). The Partner API delivers a 168-int histogram of minutes
// streamed per UTC weekday-hour cell (index = weekday * 24 + hour, weekday 0 =
// Monday per ISO-8601). Everything here is timezone-shift math + shaping so it
// stays unit-testable (lib/__tests__/game-heatmap.test.ts); rendering lives in
// components/web/games/StreamTimesHeatmap.tsx.

export const HEATMAP_CELLS = 168;
export const HEATMAP_DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const DAY_NAMES = [
  'Mondays',
  'Tuesdays',
  'Wednesdays',
  'Thursdays',
  'Fridays',
  'Saturdays',
  'Sundays',
] as const;

/** Usable = well-formed AND carries any signal (an all-zero grid is noise). */
export function isUsableHistogram(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === HEATMAP_CELLS &&
    value.every((v) => typeof v === 'number' && Number.isFinite(v) && v >= 0) &&
    value.some((v) => v > 0)
  );
}

/**
 * Shifts the UTC histogram into a viewer timezone that is `shiftHours` ahead
 * of UTC (negative = behind). A stream in UTC cell i is SEEN at local cell
 * i + shift; the week wraps at both ends. Fractional-hour zones (India +5:30)
 * are rounded by the caller — a 30-minute skew is invisible at 1-hour cell
 * resolution.
 */
export function shiftHistogram(histogram: number[], shiftHours: number): number[] {
  const shifted = new Array<number>(HEATMAP_CELLS).fill(0);
  const shift = ((Math.trunc(shiftHours) % HEATMAP_CELLS) + HEATMAP_CELLS) % HEATMAP_CELLS;
  for (let i = 0; i < HEATMAP_CELLS; i++) {
    shifted[(i + shift) % HEATMAP_CELLS] = histogram[i];
  }
  return shifted;
}

export interface HeatmapView {
  /** 7 rows (Mon..Sun) × 24 hour columns of minutes, in the shifted frame. */
  grid: number[][];
  max: number;
  /** Smallest NON-zero cell (0 when the grid is empty). */
  min: number;
  peak: { day: number; hour: number; minutes: number } | null;
}

export function buildHeatmapView(histogram: number[], shiftHours: number): HeatmapView {
  const shifted = shiftHistogram(histogram, shiftHours);
  const grid: number[][] = [];
  let max = 0;
  let min = Infinity;
  let peak: HeatmapView['peak'] = null;
  for (let day = 0; day < 7; day++) {
    const row: number[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const v = shifted[day * 24 + hour];
      row.push(v);
      if (v > 0 && v < min) min = v;
      if (v > max) {
        max = v;
        peak = { day, hour, minutes: v };
      }
    }
    grid.push(row);
  }
  return { grid, max, min: Number.isFinite(min) ? min : 0, peak };
}

/**
 * Intensity of the quietest non-empty cell. Keeps it visibly tinted, so "a
 * little streaming" never reads as "no streaming" (empty cells stay neutral).
 */
export const HEATMAP_MIN_VISIBLE = 0.06;

/**
 * 0..1 color intensity for a cell: LINEAR between the quietest non-empty
 * cell (`min`) and the peak (`max`), lifted by HEATMAP_MIN_VISIBLE.
 *
 * Game-hub UX round (2026-09-24): this used to be sqrt(minutes / max) from 0.
 * Big categories are streamed around the clock, so every cell sat between
 * 40 % and 100 % of the peak and the grid rendered as one flat cyan block
 * (measured on /game/valorant: 151 of 168 cells above alpha 0.5). Stretching
 * from the quietest hour instead of from zero spends the colour range on the
 * differences that actually exist.
 */
export function heatmapIntensity(minutes: number, max: number, min = 0): number {
  if (minutes <= 0 || max <= 0) return 0;
  if (max <= min) return 1;
  const linear = (Math.min(Math.max(minutes, min), max) - min) / (max - min);
  return HEATMAP_MIN_VISIBLE + (1 - HEATMAP_MIN_VISIBLE) * linear;
}

/**
 * Minutes per weekday (7, Mon..Sun) and per hour of day (24) of a view's
 * grid — the phone layout's two bar charts. Built from the SHIFTED grid, so
 * both are in the viewer's timezone like the grid itself.
 */
export function histogramTotals(grid: number[][]): { byDay: number[]; byHour: number[] } {
  const byDay = grid.map((row) => row.reduce((a, v) => a + v, 0));
  const byHour = Array.from({ length: 24 }, (_, h) =>
    grid.reduce((a, row) => a + (row[h] ?? 0), 0),
  );
  return { byDay, byHour };
}

/**
 * Human summary of the peak window, e.g. "Saturdays 19:00–23:00". Expands
 * from the peak cell across its day while neighbours hold ≥ 50% of the peak,
 * so the label names the prime-time band rather than a single hour.
 */
export function peakBandLabel(
  view: HeatmapView,
  dayNames: readonly string[] = DAY_NAMES,
): string | null {
  const { peak, grid } = view;
  if (!peak) return null;
  const row = grid[peak.day];
  const threshold = peak.minutes * 0.5;
  let start = peak.hour;
  let end = peak.hour;
  while (start > 0 && row[start - 1] >= threshold) start--;
  while (end < 23 && row[end + 1] >= threshold) end++;
  const fmt = (h: number) => `${String(h).padStart(2, '0')}:00`;
  return `${dayNames[peak.day]} ${fmt(start)}–${fmt((end + 1) % 24)}`;
}

/** Rounded whole-hour UTC offset of the runtime's timezone (browser only). */
export function localUtcOffsetHours(now = new Date()): number {
  return Math.round(-now.getTimezoneOffset() / 60);
}
