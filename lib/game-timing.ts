// Pure view-model for the M24 "Best time to stream {game}" page and its
// hub/insights previews. The Partner API delivers nullable 168-cell series
// (index = weekday * 24 + hour, UTC, weekday 0 = Monday per ISO-8601) where a
// null cell means "observed on fewer than 2 distinct days" — NEVER "0
// viewers"; this module must preserve that distinction end-to-end.
//
// SCORE CONTRACT (shared with SQL): the opportunity score of a cell is
//   score = viewers / streamers   (viewers per concurrently live streamer)
// implemented once in refresh_timing_stats() (best_slots + overall_score) and
// once here for the heatmap coloring. Both places must agree — the
// contract-fixture test in lib/__tests__/game-timing.test.ts feeds identical
// cell inputs and asserts identical top-3 slots.
//
// Everything here is timezone-shift math + shaping so it stays unit-testable;
// rendering lives in components/web/games/BestTimeHeatmap.tsx.

import type { GameTiming, TimingBestSlot } from '@/lib/server/partner-api';

export const TIMING_CELLS = 168;
export const RAMP_CELLS = 12;
export const TIMING_DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export const TIMING_DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

// Same gate as the API's best-to-stream list and the backend games_to_try
// filter: below this many tracked streamers the page renders its warming
// state and stays out of the index.
export const MIN_INDEXABLE_TIMING_STREAMERS = 5;

// The ramp section needs at least this many populated cells to say anything
// ("your viewers peak in hour n" from 1-2 cells is noise).
export const MIN_RAMP_CELLS = 3;

/** Finite non-negative number, else null. */
function cellOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

/**
 * Usable = well-formed nullable series with at least one populated cell.
 * (An all-null series renders as an empty page — treat it as absent.)
 */
export function isUsableTimingSeries(
  value: unknown,
  length: number = TIMING_CELLS,
): value is (number | null)[] {
  return (
    Array.isArray(value) &&
    value.length === length &&
    value.every((v) => v === null || (typeof v === 'number' && Number.isFinite(v) && v >= 0)) &&
    value.some((v) => typeof v === 'number')
  );
}

/**
 * Shifts a nullable UTC series into a viewer timezone `shiftHours` ahead of
 * UTC (negative = behind) — null cells travel with their hour. Same wrap
 * semantics as lib/game-heatmap.ts shiftHistogram.
 */
export function shiftNullableSeries(
  series: (number | null)[],
  shiftHours: number,
): (number | null)[] {
  const shifted = new Array<number | null>(TIMING_CELLS).fill(null);
  const shift = ((Math.trunc(shiftHours) % TIMING_CELLS) + TIMING_CELLS) % TIMING_CELLS;
  for (let i = 0; i < TIMING_CELLS; i++) {
    shifted[(i + shift) % TIMING_CELLS] = series[i];
  }
  return shifted;
}

/** Shifts a best-slot's UTC dow/hour into the viewer frame (same wrap math). */
export function shiftSlot(
  slot: TimingBestSlot,
  shiftHours: number,
): { dow: number; hour: number } {
  const idx = slot.dow * 24 + slot.hour;
  const shift = ((Math.trunc(shiftHours) % TIMING_CELLS) + TIMING_CELLS) % TIMING_CELLS;
  const shifted = (idx + shift) % TIMING_CELLS;
  return { dow: Math.floor(shifted / 24), hour: shifted % 24 };
}

/** THE score contract (see header). Null when either side is unobserved or streamers is 0. */
export function cellScore(viewers: number | null, streamers: number | null): number | null {
  if (viewers === null || streamers === null || streamers <= 0) return null;
  return viewers / streamers;
}

export type TimingMode = 'opportunity' | 'viewers' | 'streamers';

export interface TimingCell {
  /** null = not enough observation days ("no data", visually distinct from low). */
  viewers: number | null;
  streamers: number | null;
  days: number;
  score: number | null;
}

/** Winsorized color band of a mode: p10 → worst end, p90 → best end. */
export interface TimingScale {
  lo: number;
  hi: number;
}

export interface OpportunityView {
  /** 7 rows (Mon..Sun) × 24 hour columns, in the shifted frame. */
  grid: TimingCell[][];
  /** Per-mode maxima (0 when the mode has no data). */
  max: { opportunity: number; viewers: number; streamers: number };
  /**
   * Per-mode color bands (null = mode has no data). Percentile-winsorized so
   * one outlier cell can't push every other cell to the red end.
   */
  scale: { opportunity: TimingScale | null; viewers: TimingScale | null; streamers: TimingScale | null };
  /** Top-3 cells by score recomputed from the grid (contract fixture target). */
  topSlots: { dow: number; hour: number; score: number; viewers: number; streamers: number }[];
}

/**
 * Linearly interpolated quantile of an unsorted sample (p in 0..1). MUST be
 * interpolated, not lower-index: the bar charts feed as few as 2 qualified
 * values, where floor(0.9 * (n-1)) = 0 would collapse the band to lo == hi
 * ("every bar equally good") even though the values clearly differ.
 */
function quantile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const pos = p * (sorted.length - 1);
  const base = Math.floor(pos);
  const next = sorted[base + 1];
  if (next === undefined) return sorted[base];
  return sorted[base] + (pos - base) * (next - sorted[base]);
}

/**
 * Winsorized p10..p90 color band over a plain value sample. Shared by the
 * heatmap (168 cells) and the insights bar charts (7/24 bars) so every
 * heat-scaled surface normalizes the same way. Null for an empty sample.
 */
export function timingScaleOf(values: number[]): TimingScale | null {
  if (values.length === 0) return null;
  return { lo: quantile(values, 0.1), hi: quantile(values, 0.9) };
}

/**
 * Builds the full heatmap view in the viewer's frame. `days` defaults to 0
 * when the days series is absent (older API) — cells then rely on the
 * viewers-null convention alone.
 */
export function buildOpportunityView(
  viewers: (number | null)[],
  streamers: (number | null)[],
  days: (number | null)[] | null,
  shiftHours: number,
): OpportunityView {
  const v = shiftNullableSeries(viewers, shiftHours);
  const s = shiftNullableSeries(streamers, shiftHours);
  const d = days ? shiftNullableSeries(days, shiftHours) : null;

  const grid: TimingCell[][] = [];
  const max = { opportunity: 0, viewers: 0, streamers: 0 };
  const flat: (TimingCell & { dow: number; hour: number })[] = [];
  const samples = { opportunity: [] as number[], viewers: [] as number[], streamers: [] as number[] };
  for (let dow = 0; dow < 7; dow++) {
    const row: TimingCell[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const i = dow * 24 + hour;
      const cell: TimingCell = {
        viewers: cellOrNull(v[i]),
        streamers: cellOrNull(s[i]),
        days: cellOrNull(d?.[i]) ?? 0,
        score: cellScore(cellOrNull(v[i]), cellOrNull(s[i])),
      };
      if (cell.score !== null && cell.score > max.opportunity) max.opportunity = cell.score;
      if (cell.viewers !== null && cell.viewers > max.viewers) max.viewers = cell.viewers;
      if (cell.streamers !== null && cell.streamers > max.streamers) max.streamers = cell.streamers;
      if (cell.score !== null) samples.opportunity.push(cell.score);
      if (cell.viewers !== null) samples.viewers.push(cell.viewers);
      if (cell.streamers !== null) samples.streamers.push(cell.streamers);
      row.push(cell);
      flat.push({ ...cell, dow, hour });
    }
    grid.push(row);
  }
  const scale = {
    opportunity: timingScaleOf(samples.opportunity),
    viewers: timingScaleOf(samples.viewers),
    streamers: timingScaleOf(samples.streamers),
  };

  const topSlots = flat
    .filter((c): c is typeof c & { score: number; viewers: number; streamers: number } =>
      c.score !== null && c.viewers !== null && c.streamers !== null,
    )
    .sort((a, b) => b.score - a.score || a.dow * 24 + a.hour - (b.dow * 24 + b.hour))
    .slice(0, 3)
    .map((c) => ({ dow: c.dow, hour: c.hour, score: c.score, viewers: c.viewers, streamers: c.streamers }));

  return { grid, max, scale, topSlots };
}

/** Value of a cell under the active mode (null = no data in that mode). */
export function cellValueForMode(cell: TimingCell, mode: TimingMode): number | null {
  if (mode === 'opportunity') return cell.score;
  if (mode === 'viewers') return cell.viewers;
  return cell.streamers;
}

/**
 * Semantic "how good is this hour for a streamer" 0..1 (1 = best), linear
 * within the winsorized band (values at/below scale.lo → 0, at/above
 * scale.hi → 1). Relative-to-this-game on purpose: an opportunity score has
 * no absolute meaning across games, so the map answers "which hours of MY
 * game's week are better/worse". The Competition mode inverts — FEWER live
 * channels is the favorable end — so the hot end always means "good for you".
 * Flat band (hi <= lo, e.g. all observed cells identical) → every observed
 * hour is equally fine → 1 (glowing), never an arbitrary cold/neutral split.
 * Null when the cell or the whole mode has no data.
 */
export function timingGoodness(
  value: number | null,
  scale: TimingScale | null,
  mode: TimingMode,
): number | null {
  if (value === null || scale === null) return null;
  if (scale.hi <= scale.lo) return 1;
  const t = Math.max(0, Math.min(1, (value - scale.lo) / (scale.hi - scale.lo)));
  return mode === 'streamers' ? 1 - t : t;
}

/**
 * Cell color for a semantic goodness value: the HEAT scale (2026-08-01
 * redesign, replacing the red→green traffic light). Deep violet (cold, weak
 * hour) → magenta → orange → gold (glowing, prime time) — "where it glows is
 * the best time". Lightness rises strictly monotonically (OKLab L 0.29 →
 * 0.90), so the scale stays correctly ordered in grayscale and under every
 * kind of color blindness; no red/green axis involved. The cold end sits
 * deliberately close to the page background: a cold CELL receding is the
 * message, and dashed "no data" cells stay visually distinct.
 *
 * The 33 steps below are OKLab-interpolated between five anchors
 * (#3A1878 · #7E22CE · #C026D3 · #F97316 · #FDE047, anchors on index
 * 0/8/16/24/32) and PRECOMPUTED as literals: Math.cbrt/Math.pow are not
 * guaranteed bit-identical across JS engines, and this string must match
 * byte-for-byte between SSR and client.
 */
const HEAT_TABLE = [
  '#3a1878', '#421a82', '#4a1b8d', '#531d97',
  '#5b1ea2', '#641fad', '#6c20b8', '#7521c3',
  '#7e22ce', '#8624cf', '#8e25cf', '#9627d0',
  '#9f27d1', '#a728d1', '#af28d2', '#b827d2',
  '#c026d3', '#c63bc3', '#cc49b3', '#d354a2',
  '#da5c90', '#e1637c', '#e96966', '#f16f49',
  '#f97316', '#fb821d', '#fc9024', '#fe9e2a',
  '#feac30', '#ffb936', '#ffc63c', '#fed341',
  '#fde047',
] as const;

export function timingCellColor(goodness: number): string {
  const g = Math.max(0, Math.min(1, goodness));
  return HEAT_TABLE[Math.round(g * (HEAT_TABLE.length - 1))];
}

/**
 * Heat color for BARS (insights weekday/hour charts). Bars are marks, not
 * cells: the darkest heat step may recede on the heatmap, but a bar that
 * vanishes into the background reads as "no data" instead of "weak hour".
 * The floor lifts the cold end to ~2:1 against #0A0A0F (index 7, #7521c3)
 * while keeping the identical hue path, so bar and heatmap colors never
 * contradict each other.
 */
const BAR_FLOOR = 0.22;

export function timingBarColor(goodness: number): string {
  const g = Math.max(0, Math.min(1, goodness));
  return timingCellColor(BAR_FLOOR + (1 - BAR_FLOOR) * g);
}

/** "Tuesday 20:00" (already-shifted dow/hour). */
export function formatSlotLabel(
  dow: number,
  hour: number,
  dayNames: readonly string[] = TIMING_DAY_NAMES,
): string {
  return `${dayNames[((dow % 7) + 7) % 7]} ${String(hour).padStart(2, '0')}:00`;
}

// ============================================
// Ramp curve ("How long should you stream?")
// ============================================

export interface RampView {
  /** 12 bars; null = below the sample threshold. */
  cells: (number | null)[];
  /** 1-based hour-into-stream with the highest median, null when unusable. */
  peakHour: number | null;
  populated: number;
  max: number;
}

/**
 * Ramp view for the plain nullable series (category level). Returns null when
 * fewer than MIN_RAMP_CELLS cells are populated — the section then hides.
 */
export function buildRampView(curve: (number | null)[] | null | undefined): RampView | null {
  if (!Array.isArray(curve) || curve.length !== RAMP_CELLS) return null;
  const cells = curve.map(cellOrNull);
  const populated = cells.filter((c) => c !== null).length;
  if (populated < MIN_RAMP_CELLS) return null;
  let peakHour: number | null = null;
  let max = 0;
  let best = -1;
  cells.forEach((c, i) => {
    if (c !== null && c > best) {
      best = c;
      peakHour = i + 1;
    }
    if (c !== null && c > max) max = c;
  });
  return { cells, peakHour, populated, max };
}

/** Label for ramp bar i (0-based): "h1".."h11", last bar is open-ended. */
export function rampBarLabel(index: number): string {
  return index === RAMP_CELLS - 1 ? `${RAMP_CELLS}h+` : `h${index + 1}`;
}
