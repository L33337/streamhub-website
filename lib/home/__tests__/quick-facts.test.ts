import { describe, expect, it } from 'vitest';
import { formatStatValue } from '@/lib/format/number';
import type { BestGameEntry } from '@/lib/server/partner-api';
import {
  busiestWeekday,
  hourLabels,
  hourStamp,
  parseComeback,
  parseMarathon,
  parseStartHistogram,
  parseTopCategory,
  peakStartHour,
  pickCompetitionFact,
  pickRoomToGrowFact,
  rotateFacts,
  weekdayLabels,
  COMPETITION_MIN_TRACKED,
  MIN_HISTOGRAM_SESSIONS,
  ROOM_MAX_AVG_STREAMERS,
  ROOM_MIN_TRACKED,
} from '../quick-facts';

const CELLS = 168;

/** 168 zeros with the given (dow, hour) cells filled. */
function histogram(filled: Array<[number, number, number]>): number[] {
  const cells = new Array<number>(CELLS).fill(0);
  for (const [dow, hour, value] of filled) cells[dow * 24 + hour] = value;
  return cells;
}

/** Enough background noise to clear MIN_HISTOGRAM_SESSIONS. */
function withFloor(cells: number[], perCell = 2): number[] {
  return cells.map((c) => c + perCell);
}

describe('RPC payload parsing', () => {
  it('reads a well-formed marathon payload', () => {
    expect(
      parseMarathon({
        streamer_id: 'handofblood',
        streamer_name: 'HandOfBlood',
        category: 'League of Legends',
        minutes: 3245,
      }),
    ).toEqual({
      streamerId: 'handofblood',
      streamerName: 'HandOfBlood',
      category: 'League of Legends',
      minutes: 3245,
    });
  });

  it('keeps a marathon without a category (YouTube-only session)', () => {
    const fact = parseMarathon({
      streamer_id: 'a',
      streamer_name: 'A',
      category: null,
      minutes: 600,
    });
    expect(fact?.category).toBeNull();
  });

  it.each([
    ['null payload', null],
    ['array payload', []],
    ['missing name', { streamer_id: 'a', minutes: 600 }],
    ['zero minutes', { streamer_id: 'a', streamer_name: 'A', minutes: 0 }],
    ['string minutes', { streamer_id: 'a', streamer_name: 'A', minutes: '600' }],
  ])('rejects a marathon payload: %s', (_label, payload) => {
    expect(parseMarathon(payload)).toBeNull();
  });

  it('reads a comeback payload', () => {
    expect(
      parseComeback({ streamer_id: 'x', streamer_name: 'X', gap_days: 16 }),
    ).toEqual({ streamerId: 'x', streamerName: 'X', gapDays: 16 });
  });

  it('rejects a comeback without a gap', () => {
    expect(parseComeback({ streamer_id: 'x', streamer_name: 'X' })).toBeNull();
  });

  it('recomputes the histogram total from the cells, not the reported one', () => {
    const cells = withFloor(histogram([]), 3);
    const fact = parseStartHistogram({ cells, total: 999999 });
    expect(fact?.total).toBe(3 * CELLS);
  });

  it('rejects a histogram below the sample floor', () => {
    const cells = new Array<number>(CELLS).fill(0);
    cells[0] = MIN_HISTOGRAM_SESSIONS - 1;
    expect(parseStartHistogram({ cells, total: MIN_HISTOGRAM_SESSIONS - 1 })).toBeNull();
  });

  it.each([
    ['wrong length', new Array<number>(24).fill(50)],
    ['negative cell', withFloor(histogram([]), 3).map((c, i) => (i === 5 ? -1 : c))],
    ['non-numeric cell', withFloor(histogram([]), 3).map((c, i) => (i === 5 ? 'x' : c))],
  ])('rejects a malformed histogram: %s', (_label, cells) => {
    expect(parseStartHistogram({ cells, total: 500 })).toBeNull();
  });

  it('reads a top-category payload', () => {
    expect(
      parseTopCategory({ category: 'Just Chatting', sessions: 280, streamers: 146 }),
    ).toEqual({ category: 'Just Chatting', sessions: 280, streamers: 146 });
  });
});

describe('histogram derivations', () => {
  it('finds the peak start hour in the UTC frame', () => {
    const cells = histogram([
      [0, 18, 100],
      [3, 18, 90],
      [5, 2, 50],
    ]);
    expect(peakStartHour(cells, 0)).toEqual({ hour: 18, sessions: 190 });
  });

  it('moves the peak hour with the viewer offset', () => {
    const cells = histogram([[0, 18, 100]]);
    expect(peakStartHour(cells, 2)?.hour).toBe(20);
    expect(peakStartHour(cells, -2)?.hour).toBe(16);
  });

  it('wraps the peak hour across midnight', () => {
    const cells = histogram([[0, 23, 100]]);
    expect(peakStartHour(cells, 2)?.hour).toBe(1);
  });

  it('resolves an hour tie to the earlier hour', () => {
    const cells = histogram([
      [0, 8, 40],
      [0, 20, 40],
    ]);
    expect(peakStartHour(cells, 0)?.hour).toBe(8);
  });

  it('returns null for an all-zero histogram', () => {
    expect(peakStartHour(new Array<number>(CELLS).fill(0), 0)).toBeNull();
    expect(busiestWeekday(new Array<number>(CELLS).fill(0), 0)).toBeNull();
  });

  it('finds the busiest weekday with its share of the week', () => {
    const cells = histogram([
      [4, 20, 60], // Friday
      [0, 20, 20],
      [1, 20, 20],
    ]);
    expect(busiestWeekday(cells, 0)).toEqual({ dow: 4, sessions: 60, sharePct: 60 });
  });

  it('rolls a late-evening peak into the next weekday for eastern viewers', () => {
    // A Friday 23:00 UTC start is Saturday 01:00 in UTC+2.
    const cells = histogram([
      [4, 23, 100],
      [0, 12, 40],
    ]);
    expect(busiestWeekday(cells, 0)?.dow).toBe(4);
    expect(busiestWeekday(cells, 2)?.dow).toBe(5);
  });

  it('keeps the two cards on one histogram consistent', () => {
    // Same source array, same shift → the peak hour must sit inside the
    // busiest day when the data has a single dominant cell.
    const cells = histogram([[2, 19, 500]]);
    expect(peakStartHour(cells, 3)?.hour).toBe(22);
    expect(busiestWeekday(cells, 3)?.dow).toBe(2);
  });
});

describe('best-to-stream picks', () => {
  const entry = (over: Partial<BestGameEntry>): BestGameEntry => ({
    category: 'Test',
    overall_score: 1000,
    avg_viewers: 2000,
    avg_streamers: 2,
    tracked_streamers: 20,
    ...over,
  });

  const hubs = new Set(['Just Chatting', 'IRL']);

  it('picks the most crowded category as the competition fact', () => {
    const best = pickCompetitionFact(
      [
        entry({ category: 'Just Chatting', avg_streamers: 8, tracked_streamers: 233 }),
        entry({ category: 'IRL', avg_streamers: 2.1, tracked_streamers: 47 }),
      ],
      hubs,
    );
    expect(best?.category).toBe('Just Chatting');
    expect(best?.avgStreamers).toBe(8);
    expect(best?.hasHub).toBe(true);
  });

  it('ignores categories below the tracked-channel floor', () => {
    const best = pickCompetitionFact(
      [
        entry({
          category: 'Tiny',
          avg_streamers: 50,
          tracked_streamers: COMPETITION_MIN_TRACKED - 1,
        }),
        entry({ category: 'IRL', avg_streamers: 2.1, tracked_streamers: 47 }),
      ],
      hubs,
    );
    expect(best?.category).toBe('IRL');
  });

  it('leaves a category without a hub page unlinked', () => {
    const best = pickCompetitionFact(
      [entry({ category: 'No Hub Here', avg_streamers: 5 })],
      hubs,
    );
    expect(best?.hasHub).toBe(false);
    expect(best?.slug).not.toBe('');
  });

  it('picks the best uncontested score as room to grow', () => {
    const best = pickRoomToGrowFact(
      [
        // Highest score of all, but a crowd — must not win.
        entry({
          category: 'Just Chatting',
          overall_score: 9785,
          avg_streamers: 8,
          tracked_streamers: 233,
        }),
        entry({
          category: 'IRL',
          overall_score: 9347,
          avg_streamers: 2.1,
          tracked_streamers: 47,
        }),
        entry({
          category: 'Counter-Strike',
          overall_score: 8820,
          avg_streamers: 2.5,
          tracked_streamers: 35,
        }),
      ],
      hubs,
    );
    expect(best?.category).toBe('IRL');
  });

  it('rejects the event-category skew below the tracked floor', () => {
    // The known M24 skew: a one-off event scores enormously off 2 channels.
    const best = pickRoomToGrowFact(
      [
        entry({
          category: 'Streamer University',
          overall_score: 50018,
          avg_streamers: 2.4,
          tracked_streamers: ROOM_MIN_TRACKED - 1,
        }),
        entry({
          category: 'Dota 2',
          overall_score: 7995,
          avg_streamers: 1.9,
          tracked_streamers: 17,
        }),
      ],
      hubs,
    );
    expect(best?.category).toBe('Dota 2');
  });

  it('rejects a category above the competition ceiling', () => {
    expect(
      pickRoomToGrowFact(
        [entry({ avg_streamers: ROOM_MAX_AVG_STREAMERS + 0.1, tracked_streamers: 50 })],
        hubs,
      ),
    ).toBeNull();
  });

  it('returns null on an empty or degraded list', () => {
    expect(pickCompetitionFact([], hubs)).toBeNull();
    expect(pickRoomToGrowFact([], hubs)).toBeNull();
    expect(
      pickRoomToGrowFact([entry({ overall_score: undefined })], hubs),
    ).toBeNull();
  });

  it('breaks ties deterministically by category name', () => {
    const rows = [
      entry({ category: 'Zelda', avg_streamers: 4 }),
      entry({ category: 'Apex', avg_streamers: 4 }),
    ];
    expect(pickCompetitionFact(rows, hubs)?.category).toBe('Apex');
    expect(pickCompetitionFact([...rows].reverse(), hubs)?.category).toBe('Apex');
  });
});

describe('rotation', () => {
  const pool = ['a', 'b', 'c', 'd', 'e', 'f'];

  it('returns the whole pool when it fits', () => {
    expect(rotateFacts(['a', 'b'], 5, 4)).toEqual(['a', 'b']);
    expect(rotateFacts(pool.slice(0, 4), 5, 4)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('advances by one card per hour and wraps', () => {
    expect(rotateFacts(pool, 0, 4)).toEqual(['a', 'b', 'c', 'd']);
    expect(rotateFacts(pool, 1, 4)).toEqual(['b', 'c', 'd', 'e']);
    expect(rotateFacts(pool, 5, 4)).toEqual(['f', 'a', 'b', 'c']);
    expect(rotateFacts(pool, 6, 4)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('shows every card over a full cycle', () => {
    const seen = new Set<string>();
    for (let h = 0; h < pool.length; h++) {
      for (const card of rotateFacts(pool, h, 4)) seen.add(card);
    }
    expect(seen.size).toBe(pool.length);
  });

  it('never repeats a card inside one render', () => {
    for (let h = 0; h < 24; h++) {
      const cards = rotateFacts(pool, h, 4);
      expect(new Set(cards).size).toBe(cards.length);
    }
  });

  it('handles an empty pool', () => {
    expect(rotateFacts([], 3, 4)).toEqual([]);
  });

  it('derives a whole-hour stamp that increments hourly', () => {
    const base = new Date('2026-08-01T12:00:00Z');
    const later = new Date('2026-08-01T12:59:59Z');
    const next = new Date('2026-08-01T13:00:00Z');
    expect(hourStamp(later)).toBe(hourStamp(base));
    expect(hourStamp(next)).toBe(hourStamp(base) + 1);
  });
});

describe('label tables', () => {
  it('starts the weekday table on Monday', () => {
    expect(weekdayLabels('en')[0]).toBe('Monday');
    expect(weekdayLabels('en')[6]).toBe('Sunday');
    expect(weekdayLabels('de')[0]).toBe('Montag');
  });

  it('covers all 24 hours with non-empty labels', () => {
    const labels = hourLabels('de');
    expect(labels).toHaveLength(24);
    expect(new Set(labels).size).toBe(24);
    expect(labels.every((l) => l.trim().length > 0)).toBe(true);
  });

  it('indexes safely for every shifted hour and weekday', () => {
    // The client island indexes these tables by the shifted value, so every
    // possible index must resolve — an out-of-range shift must not yield
    // `undefined` in the DOM.
    const cells = histogram([[0, 12, 300]]);
    const hours = hourLabels('en');
    const days = weekdayLabels('en');
    for (let shift = -14; shift <= 14; shift++) {
      expect(hours[peakStartHour(cells, shift)!.hour]).toBeTruthy();
      expect(days[busiestWeekday(cells, shift)!.dow]).toBeTruthy();
    }
  });
});

describe('formatStatValue localization (quick facts are its first localized caller)', () => {
  it('keeps English output byte-identical', () => {
    expect(formatStatValue(2.1)).toBe('2.1');
    expect(formatStatValue(2)).toBe('2');
    expect(formatStatValue(7.75)).toBe('7.8');
    expect(formatStatValue(499)).toBe('499');
    expect(formatStatValue(999.6)).toBe('1000');
    expect(formatStatValue(9347.2)).toBe('9.3K');
    expect(formatStatValue(null)).toBe('');
  });

  it('uses the locale decimal separator', () => {
    // "2.1" would read as a THOUSANDS separator to a German reader.
    expect(formatStatValue(2.1, 'de')).toBe('2,1');
    expect(formatStatValue(2.1, 'fr')).toBe('2,1');
    expect(formatStatValue(499, 'de')).toBe('499');
  });

  // de/ja have no compact short form below 10,000, so the value falls back to
  // its plain form and any fraction digit becomes visible noise.
  it('never shows a decimal on a compacted value', () => {
    expect(formatStatValue(9347.2, 'de')).toBe('9347');
    expect(formatStatValue(9347.2, 'ja')).toBe('9347');
    // Intl joins value and unit with a NON-BREAKING space — assert the parts,
    // not a literal that would depend on an invisible character.
    expect(formatStatValue(9347.2, 'pl').replace(/ /g, ' ')).toBe('9,3 tys.');
  });

  // Only a STRUCTURALLY invalid tag throws. A well-formed but unknown tag
  // ("xx", "not-a-locale") resolves to the runtime default instead — which is
  // why the catch is a crash guard, not a correctness guarantee. Callers pass
  // a UiLang, so the unknown-tag path never runs in production.
  it('falls back to en-US for a malformed tag instead of throwing', () => {
    expect(formatStatValue(2.1, 'en_US')).toBe('2.1');
    expect(formatStatValue(2.1, '!!')).toBe('2.1');
  });
});
