import { describe, expect, it } from 'vitest';
import {
  MIN_RAMP_CELLS,
  RAMP_CELLS,
  TIMING_CELLS,
  buildOpportunityView,
  buildRampView,
  cellScore,
  cellValueForMode,
  formatSlotLabel,
  isUsableTimingSeries,
  rampBarLabel,
  shiftNullableSeries,
  shiftSlot,
  timingIntensity,
} from '../game-timing';

function series(cells: Record<number, number>): (number | null)[] {
  const out = new Array<number | null>(TIMING_CELLS).fill(null);
  for (const [idx, v] of Object.entries(cells)) out[Number(idx)] = v;
  return out;
}

describe('isUsableTimingSeries', () => {
  it('accepts a nullable series with signal', () => {
    expect(isUsableTimingSeries(series({ 18: 120 }))).toBe(true);
  });
  it('rejects wrong length, negative values and all-null series', () => {
    expect(isUsableTimingSeries(new Array(167).fill(null))).toBe(false);
    expect(isUsableTimingSeries(series({ 18: -1 }))).toBe(false);
    expect(isUsableTimingSeries(new Array(TIMING_CELLS).fill(null))).toBe(false);
    expect(isUsableTimingSeries('nope')).toBe(false);
  });
});

describe('shiftNullableSeries', () => {
  it('moves values with their hour and keeps nulls travelling', () => {
    const shifted = shiftNullableSeries(series({ 0: 100 }), 2);
    expect(shifted[2]).toBe(100);
    expect(shifted[0]).toBeNull();
  });
  it('wraps the week at both ends', () => {
    expect(shiftNullableSeries(series({ 167: 50 }), 1)[0]).toBe(50);
    expect(shiftNullableSeries(series({ 0: 50 }), -1)[167]).toBe(50);
  });
});

describe('shiftSlot', () => {
  it('shifts dow/hour together and wraps', () => {
    expect(shiftSlot({ dow: 0, hour: 23, score: 1, viewers: 1, streamers: 1 }, 2)).toEqual({
      dow: 1,
      hour: 1,
    });
    expect(shiftSlot({ dow: 6, hour: 23, score: 1, viewers: 1, streamers: 1 }, 1)).toEqual({
      dow: 0,
      hour: 0,
    });
    expect(shiftSlot({ dow: 0, hour: 0, score: 1, viewers: 1, streamers: 1 }, -1)).toEqual({
      dow: 6,
      hour: 23,
    });
  });
});

describe('cellScore (SQL contract)', () => {
  it('is viewers / streamers', () => {
    expect(cellScore(300, 1)).toBe(300);
    expect(cellScore(120, 2)).toBe(60);
  });
  it('is null when either side is unobserved or streamers is 0', () => {
    expect(cellScore(null, 2)).toBeNull();
    expect(cellScore(100, null)).toBeNull();
    expect(cellScore(100, 0)).toBeNull();
  });
});

describe('buildOpportunityView — score contract fixture', () => {
  // EXACTLY the seed fixture the backend asserts in
  // scripts/verify-timing-stats.sql (StreamHub repo): weekday group 1 = dow 0
  // hours 18-22 with a second streamer (sums 120..280, 2 channels), group 2 =
  // dow 2 hours 18-22 solo (100..260, 1 channel). SQL best_slots =
  // [dow2 20:00 score 300, dow2 21:00 280, dow2 22:00 260] — this view model
  // MUST produce the same top-3 from the same cells.
  const viewers = series({
    [0 * 24 + 18]: 120,
    [0 * 24 + 19]: 220,
    [0 * 24 + 20]: 320,
    [0 * 24 + 21]: 300,
    [0 * 24 + 22]: 280,
    [2 * 24 + 18]: 100,
    [2 * 24 + 19]: 200,
    [2 * 24 + 20]: 300,
    [2 * 24 + 21]: 280,
    [2 * 24 + 22]: 260,
  });
  const streamers = series({
    [0 * 24 + 18]: 2,
    [0 * 24 + 19]: 2,
    [0 * 24 + 20]: 2,
    [0 * 24 + 21]: 2,
    [0 * 24 + 22]: 2,
    [2 * 24 + 18]: 1,
    [2 * 24 + 19]: 1,
    [2 * 24 + 20]: 1,
    [2 * 24 + 21]: 1,
    [2 * 24 + 22]: 1,
  });

  it('reproduces the SQL best_slots top-3 at shift 0', () => {
    const view = buildOpportunityView(viewers, streamers, null, 0);
    expect(view.topSlots).toEqual([
      { dow: 2, hour: 20, score: 300, viewers: 300, streamers: 1 },
      { dow: 2, hour: 21, score: 280, viewers: 280, streamers: 1 },
      { dow: 2, hour: 22, score: 260, viewers: 260, streamers: 1 },
    ]);
    expect(view.max.opportunity).toBe(300);
    expect(view.max.viewers).toBe(320);
    expect(view.max.streamers).toBe(2);
  });

  it('unobserved cells stay null in every mode (never 0)', () => {
    const view = buildOpportunityView(viewers, streamers, null, 0);
    const emptyCell = view.grid[5][3];
    expect(emptyCell.viewers).toBeNull();
    expect(emptyCell.score).toBeNull();
    expect(cellValueForMode(emptyCell, 'opportunity')).toBeNull();
    expect(cellValueForMode(emptyCell, 'viewers')).toBeNull();
    expect(cellValueForMode(emptyCell, 'streamers')).toBeNull();
  });

  it('timezone shift moves the top slot with the grid', () => {
    const view = buildOpportunityView(viewers, streamers, null, 2);
    expect(view.topSlots[0]).toMatchObject({ dow: 2, hour: 22, score: 300 });
  });

  it('carries observed days through the shift', () => {
    const days = series({ [2 * 24 + 20]: 4 });
    const view = buildOpportunityView(viewers, streamers, days, 2);
    expect(view.grid[2][22].days).toBe(4);
  });
});

describe('timingIntensity', () => {
  it('sqrt-scales and clamps', () => {
    expect(timingIntensity(null, 100)).toBe(0);
    expect(timingIntensity(0, 100)).toBe(0);
    expect(timingIntensity(25, 100)).toBeCloseTo(0.5);
    expect(timingIntensity(100, 100)).toBe(1);
    expect(timingIntensity(200, 100)).toBe(1);
  });
});

describe('buildRampView', () => {
  it('null below MIN_RAMP_CELLS populated cells and on malformed input', () => {
    const thin = new Array<number | null>(RAMP_CELLS).fill(null);
    thin[0] = 50;
    thin[1] = 60;
    expect(MIN_RAMP_CELLS).toBe(3);
    expect(buildRampView(thin)).toBeNull();
    expect(buildRampView(null)).toBeNull();
    expect(buildRampView([1, 2, 3])).toBeNull();
  });

  it('finds the 1-based peak hour', () => {
    const cells = new Array<number | null>(RAMP_CELLS).fill(null);
    cells[0] = 100;
    cells[1] = 200;
    cells[2] = 300;
    cells[3] = 280;
    cells[4] = 260;
    const view = buildRampView(cells);
    expect(view).not.toBeNull();
    expect(view?.peakHour).toBe(3);
    expect(view?.populated).toBe(5);
    expect(view?.max).toBe(300);
  });
});

describe('labels', () => {
  it('formatSlotLabel', () => {
    expect(formatSlotLabel(1, 20)).toBe('Tuesday 20:00');
    expect(formatSlotLabel(0, 5)).toBe('Monday 05:00');
  });
  it('rampBarLabel: open-ended last bar', () => {
    expect(rampBarLabel(0)).toBe('h1');
    expect(rampBarLabel(10)).toBe('h11');
    expect(rampBarLabel(11)).toBe('12h+');
  });
});
