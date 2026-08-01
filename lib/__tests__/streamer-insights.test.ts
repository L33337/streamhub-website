import { describe, expect, it } from 'vitest';
import type { InsightsMedianCell, StreamerInsights } from '../server/partner-api';
import {
  COLLECTING_THRESHOLD,
  bestMedianCategory,
  bestWeekday,
  buildInsightsTeaser,
  formatFollowerBand,
  isOnVacation,
  rampMedians,
  shiftHourCells,
  sizeBenchmarkTopShare,
  tzOffsetHours,
  usableCategoryRows,
  usableCells,
} from '../streamer-insights';

const cell = (median: number | null, samples = 5): InsightsMedianCell => ({ median, samples });

describe('usableCells', () => {
  it('accepts a well-formed array with signal', () => {
    const cells = [cell(100), cell(null, 0), cell(260), cell(null), cell(50), cell(null), cell(null)];
    expect(usableCells(cells, 7)).toBe(cells);
  });
  it('rejects wrong length, malformed entries and all-null series', () => {
    expect(usableCells([cell(1)], 7)).toBeNull();
    expect(usableCells(null, 7)).toBeNull();
    expect(usableCells(undefined, 7)).toBeNull();
    expect(usableCells(Array.from({ length: 7 }, () => cell(null, 0)), 7)).toBeNull();
  });
});

describe('shiftHourCells', () => {
  const cells = Array.from({ length: 24 }, (_, h) => cell(h === 18 ? 100 : null, h === 18 ? 8 : 0));
  it('rotates cells with wrap', () => {
    expect(shiftHourCells(cells, 2)[20].median).toBe(100);
    expect(shiftHourCells(cells, -19)[23].median).toBe(100);
    expect(shiftHourCells(cells, 0)[18].median).toBe(100);
  });
});

describe('tzOffsetHours', () => {
  // Fixed instant: 2026-07-15 (DST in the northern summer).
  const now = new Date('2026-07-15T12:00:00Z');
  it('resolves whole-hour offsets', () => {
    expect(tzOffsetHours('UTC', now)).toBe(0);
    expect(tzOffsetHours('Europe/Berlin', now)).toBe(2); // CEST
    expect(tzOffsetHours('America/New_York', now)).toBe(-4); // EDT
  });
  it('null on junk zones', () => {
    expect(tzOffsetHours('Not/AZone', now)).toBeNull();
    expect(tzOffsetHours('', now)).toBeNull();
  });
});

describe('bestWeekday + teaser', () => {
  const weekday = [
    cell(null, 0),
    cell(100, 8),
    cell(620, 12),
    cell(400, 2), // above threshold median but too few samples → skipped
    cell(null, 1),
    cell(500, 9),
    cell(null, 0),
  ];
  it('picks the highest median with enough samples', () => {
    expect(bestWeekday(weekday)).toEqual({ index: 2, median: 620, samples: 12 });
  });
  it('teaser renders Wednesday from the fixture', () => {
    const insights = {
      streamer_id: 'x',
      sample_count: COLLECTING_THRESHOLD,
      weekday_viewers: weekday,
    } as StreamerInsights;
    expect(buildInsightsTeaser(insights)).toEqual({ bestDay: 'Wednesday', median: 620 });
  });
  it('teaser null while collecting or without cells', () => {
    expect(
      buildInsightsTeaser({
        streamer_id: 'x',
        sample_count: COLLECTING_THRESHOLD - 1,
        weekday_viewers: weekday,
      } as StreamerInsights),
    ).toBeNull();
    expect(
      buildInsightsTeaser({ streamer_id: 'x', sample_count: 40 } as StreamerInsights),
    ).toBeNull();
    expect(buildInsightsTeaser(null)).toBeNull();
  });
});

describe('formatFollowerBand', () => {
  it('formats all bands, null-safe', () => {
    expect(formatFollowerBand('<1k')).toBe('under 1k followers');
    expect(formatFollowerBand('1k-10k')).toBe('1k–10k followers');
    expect(formatFollowerBand('100k+')).toBe('over 100k followers');
    expect(formatFollowerBand(null)).toBeNull();
    expect(formatFollowerBand(undefined)).toBeNull();
  });
});

describe('sizeBenchmarkTopShare', () => {
  it('inverts the percentile and clamps to >= 1', () => {
    expect(sizeBenchmarkTopShare(89)).toBe(11);
    expect(sizeBenchmarkTopShare(100)).toBe(1); // never "top 0%"
    expect(sizeBenchmarkTopShare(0)).toBe(100);
  });
  it('null on absent/out-of-range values', () => {
    expect(sizeBenchmarkTopShare(null)).toBeNull();
    expect(sizeBenchmarkTopShare(undefined)).toBeNull();
    expect(sizeBenchmarkTopShare(101)).toBeNull();
    expect(sizeBenchmarkTopShare(-1)).toBeNull();
  });
});

describe('usableCategoryRows', () => {
  it('drops junk and keeps order', () => {
    const rows = usableCategoryRows([
      { category: 'Valorant', median: 260, samples: 40, hours: 40 },
      { category: '', median: 1, samples: 1, hours: 1 },
      { category: 'Empty', median: null, samples: 0, hours: 0 },
      { category: 'Just Chatting', median: 65, samples: 8, hours: 8 },
    ]);
    expect(rows.map((r) => r.category)).toEqual(['Valorant', 'Just Chatting']);
  });
  it('empty on absent input', () => {
    expect(usableCategoryRows(null)).toEqual([]);
    expect(usableCategoryRows(undefined)).toEqual([]);
  });
});

describe('bestMedianCategory', () => {
  const row = (category: string, median: number | null, hours: number) => ({
    category,
    median,
    samples: hours,
    hours,
  });
  it('picks the highest median among rows with enough observed hours', () => {
    const rows = [
      row('Counter-Strike', 8654, 232),
      row('DayZ', 9817, 35),
      row('Escape from Tarkov', 12332, 28),
    ];
    expect(bestMedianCategory(rows)).toBe('Escape from Tarkov');
  });
  it('a short-observed spike never wins the marker', () => {
    const rows = [
      row('Counter-Strike', 8654, 232),
      row('Warhammer 40,000: Darktide', 9488, 89),
      row('One-off event', 50000, 3), // below the 10h gate
    ];
    expect(bestMedianCategory(rows)).toBe('Warhammer 40,000: Darktide');
  });
  it('null when fewer than 2 rows qualify (superlative needs comparison)', () => {
    expect(bestMedianCategory([row('Only game', 500, 100)])).toBeNull();
    expect(
      bestMedianCategory([row('A', 500, 100), row('B', 400, 4)]),
    ).toBeNull();
    expect(bestMedianCategory([])).toBeNull();
    expect(
      bestMedianCategory([row('A', null, 100), row('B', null, 50)]),
    ).toBeNull();
  });
});

describe('rampMedians', () => {
  it('extracts the nullable series', () => {
    const cells = Array.from({ length: 12 }, (_, i) => cell(i < 4 ? 100 + i : null, i < 4 ? 8 : 0));
    expect(rampMedians(cells)?.slice(0, 5)).toEqual([100, 101, 102, 103, null]);
  });
  it('null on malformed/all-null input', () => {
    expect(rampMedians(null)).toBeNull();
    expect(rampMedians([cell(1)])).toBeNull();
  });
});

describe('isOnVacation', () => {
  const now = new Date('2026-07-31T12:00:00Z');
  it('only future dates count', () => {
    expect(isOnVacation('2026-08-15T00:00:00Z', now)).toBe(true);
    expect(isOnVacation('2026-07-01T00:00:00Z', now)).toBe(false);
    expect(isOnVacation(null, now)).toBe(false);
    expect(isOnVacation('garbage', now)).toBe(false);
  });
});

// ============================================
// 2026-08-01 expansion: trends, follower growth, market
// ============================================

import {
  followerStats,
  followersPerStreamHour,
  formatTrendMonth,
  marketByCategory,
  marketDeltaPct,
  monthlyViewerDelta,
  usableMonthlyTrend,
} from '../streamer-insights';
import type {
  InsightsCategoryMarket,
  InsightsMonthlyTrendEntry,
} from '../server/partner-api';

const month = (
  m: string,
  median: number | null,
  extra: Partial<InsightsMonthlyTrendEntry> = {},
): InsightsMonthlyTrendEntry => ({
  month: m,
  median,
  peak: median !== null ? median * 2 : null,
  samples: median !== null ? 20 : 0,
  streams: 10,
  hours: 40,
  ...extra,
});

const NOW = new Date('2026-08-01T12:00:00Z');

describe('formatTrendMonth', () => {
  it('formats YYYY-MM', () => {
    expect(formatTrendMonth('2026-07')).toEqual({ short: 'Jul', long: 'July 2026' });
    expect(formatTrendMonth('2025-12')).toEqual({ short: 'Dec', long: 'December 2025' });
  });
  it('rejects junk', () => {
    expect(formatTrendMonth('July')).toBeNull();
    expect(formatTrendMonth('2026-13')).toBeNull();
    expect(formatTrendMonth('2026-7')).toBeNull();
  });
});

describe('usableMonthlyTrend', () => {
  it('needs >= 2 months with a median', () => {
    expect(usableMonthlyTrend(null, null, NOW)).toBeNull();
    expect(usableMonthlyTrend([month('2026-07', 100)], null, NOW)).toBeNull();
    expect(
      usableMonthlyTrend([month('2026-06', null), month('2026-07', 100)], null, NOW),
    ).toBeNull();
    const ok = usableMonthlyTrend(
      [month('2026-06', 90), month('2026-07', 100)],
      null,
      NOW,
    );
    expect(ok).toHaveLength(2);
    expect(ok?.[0].label).toBe('Jun');
    expect(ok?.[0].longLabel).toBe('June 2026');
  });

  it('flags the running month and pre-tracking months', () => {
    const out = usableMonthlyTrend(
      [month('2026-05', 80), month('2026-06', 90), month('2026-08', 100)],
      '2026-06-15T10:00:00Z',
      NOW,
    );
    expect(out?.map((m) => m.isCurrent)).toEqual([false, false, true]);
    expect(out?.map((m) => m.isPreTracking)).toEqual([true, false, false]);
  });

  it('drops the whole series on a malformed entry', () => {
    expect(
      usableMonthlyTrend(
        [month('2026-06', 90), { ...month('2026-07', 100), month: 'garbage' }],
        null,
        NOW,
      ),
    ).toBeNull();
  });
});

describe('monthlyViewerDelta', () => {
  it('compares the two most recent full tracked months', () => {
    const months = usableMonthlyTrend(
      [
        month('2026-05', 80),
        month('2026-06', 100),
        month('2026-07', 120),
        month('2026-08', 999),
      ],
      '2026-05-01T00:00:00Z',
      NOW,
    );
    const d = monthlyViewerDelta(months);
    expect(d?.latest.month).toBe('2026-07');
    expect(d?.previous.month).toBe('2026-06');
    expect(d?.pct).toBe(20);
  });

  it('excludes partial months and needs 2 qualifying', () => {
    // 2026-08 is current (partial), 2026-05 is pre-tracking → only 2026-06/07 qualify
    const months = usableMonthlyTrend(
      [month('2026-05', 80), month('2026-07', 120), month('2026-08', 999)],
      '2026-06-01T00:00:00Z',
      NOW,
    );
    expect(monthlyViewerDelta(months)).toBeNull();
    expect(monthlyViewerDelta(null)).toBeNull();
  });
});

describe('followerStats', () => {
  const p = (date: string, count: number) => ({ date, count });

  it('computes gains against >= 7d / >= 30d baselines', () => {
    const points = [
      p('2026-07-01', 1000),
      p('2026-07-24', 1100),
      p('2026-07-25', 1110),
      p('2026-07-31', 1200),
    ];
    const s = followerStats(points);
    expect(s?.current).toBe(1200);
    expect(s?.gain7).toBe(100); // vs 07-24 (newest snapshot >= 7 days before 07-31)
    expect(s?.gain30).toBe(200); // vs 07-01
    expect(s?.spanDays).toBe(30);
  });

  it('gains are null when the series is too short for the window', () => {
    const s = followerStats([p('2026-07-29', 100), p('2026-07-31', 110)]);
    expect(s?.gain7).toBeNull();
    expect(s?.gain30).toBeNull();
    expect(s?.spanDays).toBe(2);
  });

  it('needs 2 usable points; junk rows are skipped', () => {
    expect(followerStats(null)).toBeNull();
    expect(followerStats([p('2026-07-31', 100)])).toBeNull();
    expect(
      followerStats([p('garbage', 1), p('2026-07-30', 100), p('2026-07-31', 110)])?.points,
    ).toHaveLength(2);
  });
});

describe('followersPerStreamHour', () => {
  it('rounds to 1 decimal with enough hours', () => {
    expect(followersPerStreamHour(250, 100)).toBe(2.5);
    expect(followersPerStreamHour(0, 100)).toBe(0);
  });
  it('null on negative gain, missing hours, or thin hours', () => {
    expect(followersPerStreamHour(-5, 100)).toBeNull();
    expect(followersPerStreamHour(100, null)).toBeNull();
    expect(followersPerStreamHour(100, 9)).toBeNull();
  });
});

describe('marketByCategory + marketDeltaPct', () => {
  const entry: InsightsCategoryMarket = {
    category: 'Valorant',
    avg_viewers_per_channel: 200,
    avg_live_channels: 12,
    tracked_streamers: 20,
    is_trending: false,
  };

  it('maps valid entries, drops junk', () => {
    const map = marketByCategory([
      entry,
      { ...entry, category: '' },
      { ...entry, category: 'Zero', avg_viewers_per_channel: 0 },
    ]);
    expect(map.size).toBe(1);
    expect(map.get('Valorant')).toBe(entry);
    expect(marketByCategory(null).size).toBe(0);
  });

  it('computes the signed percent delta', () => {
    expect(marketDeltaPct(300, entry)).toBe(50);
    expect(marketDeltaPct(100, entry)).toBe(-50);
    expect(marketDeltaPct(200, entry)).toBe(0);
    expect(marketDeltaPct(null, entry)).toBeNull();
    expect(marketDeltaPct(300, undefined)).toBeNull();
  });
});
