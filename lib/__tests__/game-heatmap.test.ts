import { describe, expect, it } from 'vitest';
import {
  HEATMAP_CELLS,
  buildHeatmapView,
  heatmapIntensity,
  isUsableHistogram,
  localUtcOffsetHours,
  peakBandLabel,
  shiftHistogram,
} from '@/lib/game-heatmap';

function emptyHistogram(): number[] {
  return new Array(HEATMAP_CELLS).fill(0);
}

describe('isUsableHistogram', () => {
  it('accepts a well-formed histogram with signal', () => {
    const h = emptyHistogram();
    h[20] = 120;
    expect(isUsableHistogram(h)).toBe(true);
  });

  it('rejects null, wrong length, negatives and all-zero grids', () => {
    expect(isUsableHistogram(null)).toBe(false);
    expect(isUsableHistogram([1, 2, 3])).toBe(false);
    expect(isUsableHistogram(emptyHistogram())).toBe(false);
    const negative = emptyHistogram();
    negative[0] = -5;
    negative[1] = 10;
    expect(isUsableHistogram(negative)).toBe(false);
    const withNaN = emptyHistogram();
    withNaN[0] = Number.NaN;
    withNaN[1] = 10;
    expect(isUsableHistogram(withNaN)).toBe(false);
  });
});

describe('shiftHistogram', () => {
  it('keeps the grid identical at shift 0', () => {
    const h = emptyHistogram();
    h[30] = 42;
    expect(shiftHistogram(h, 0)).toEqual(h);
  });

  it('moves a UTC cell forward for zones ahead of UTC', () => {
    // Monday 20:00 UTC seen from UTC+2 → Monday 22:00 local.
    const h = emptyHistogram();
    h[20] = 60;
    const shifted = shiftHistogram(h, 2);
    expect(shifted[22]).toBe(60);
    expect(shifted[20]).toBe(0);
  });

  it('wraps across the week boundary in both directions', () => {
    // Sunday 23:00 UTC (index 167) seen from UTC+2 → Monday 01:00 local.
    const h = emptyHistogram();
    h[167] = 60;
    expect(shiftHistogram(h, 2)[1]).toBe(60);
    // Monday 00:00 UTC (index 0) seen from UTC-5 → Sunday 19:00 local.
    const h2 = emptyHistogram();
    h2[0] = 30;
    expect(shiftHistogram(h2, -5)[6 * 24 + 19]).toBe(30);
  });
});

describe('buildHeatmapView', () => {
  it('shapes 7x24 rows and finds the peak', () => {
    const h = emptyHistogram();
    h[5 * 24 + 20] = 240; // Saturday 20:00
    h[5 * 24 + 21] = 200;
    const view = buildHeatmapView(h, 0);
    expect(view.grid).toHaveLength(7);
    expect(view.grid[5]).toHaveLength(24);
    expect(view.max).toBe(240);
    expect(view.peak).toEqual({ day: 5, hour: 20, minutes: 240 });
  });

  it('reports no peak for an all-zero grid', () => {
    const view = buildHeatmapView(emptyHistogram(), 0);
    expect(view.peak).toBeNull();
    expect(view.max).toBe(0);
  });
});

describe('heatmapIntensity', () => {
  it('is 0 for empty cells and 1 at the max', () => {
    expect(heatmapIntensity(0, 100)).toBe(0);
    expect(heatmapIntensity(100, 100)).toBe(1);
  });

  it('uses a sqrt scale so off-peak cells stay visible', () => {
    expect(heatmapIntensity(25, 100)).toBeCloseTo(0.5);
  });

  it('never exceeds 1 even on inconsistent input', () => {
    expect(heatmapIntensity(200, 100)).toBe(1);
  });
});

describe('peakBandLabel', () => {
  it('expands the band while neighbours hold >= 50% of the peak', () => {
    const h = emptyHistogram();
    const sat = 5 * 24;
    h[sat + 19] = 130; // >= 50% of 240
    h[sat + 20] = 240;
    h[sat + 21] = 200;
    h[sat + 22] = 100; // < 50% → excluded
    const view = buildHeatmapView(h, 0);
    expect(peakBandLabel(view)).toBe('Saturdays 19:00–22:00');
  });

  it('labels a single-hour peak', () => {
    const h = emptyHistogram();
    h[2 * 24 + 14] = 90; // Wednesday 14:00
    expect(peakBandLabel(buildHeatmapView(h, 0))).toBe('Wednesdays 14:00–15:00');
  });

  it('formats a band ending at midnight as –00:00', () => {
    const h = emptyHistogram();
    h[23] = 60; // Monday 23:00
    expect(peakBandLabel(buildHeatmapView(h, 0))).toBe('Mondays 23:00–00:00');
  });

  it('returns null without a peak', () => {
    expect(peakBandLabel(buildHeatmapView(emptyHistogram(), 0))).toBeNull();
  });
});

describe('localUtcOffsetHours', () => {
  it('returns a plausible whole-hour offset', () => {
    const offset = localUtcOffsetHours();
    expect(Number.isInteger(offset)).toBe(true);
    expect(offset).toBeGreaterThanOrEqual(-12);
    expect(offset).toBeLessThanOrEqual(14);
  });
});
