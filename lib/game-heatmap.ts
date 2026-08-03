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
  peak: { day: number; hour: number; minutes: number } | null;
}

export function buildHeatmapView(histogram: number[], shiftHours: number): HeatmapView {
  const shifted = shiftHistogram(histogram, shiftHours);
  const grid: number[][] = [];
  let max = 0;
  let peak: HeatmapView['peak'] = null;
  for (let day = 0; day < 7; day++) {
    const row: number[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const v = shifted[day * 24 + hour];
      row.push(v);
      if (v > max) {
        max = v;
        peak = { day, hour, minutes: v };
      }
    }
    grid.push(row);
  }
  return { grid, max, peak };
}

/**
 * 0..1 color intensity for a cell. Square-root scale on purpose: streaming
 * histograms are long-tailed (one prime-time cell dominates), and a linear
 * scale would wash every off-peak cell into near-invisibility.
 */
export function heatmapIntensity(minutes: number, max: number): number {
  if (minutes <= 0 || max <= 0) return 0;
  return Math.sqrt(Math.min(minutes, max) / max);
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
