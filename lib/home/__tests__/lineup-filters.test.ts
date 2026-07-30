import { describe, it, expect } from 'vitest';
import type { PublicStreamSlot } from '@/lib/server/partner-api';
import {
  buildLineupFilterItems,
  computeVisibleLineupIds,
  countLineupCategoryOptions,
  countLineupLanguageOptions,
  countLineupTimeOptions,
  EMPTY_LINEUP_SELECTION,
  formatLineupHour,
  isLineupItemExpired,
  isLineupSelectionActive,
  lineupRevealLimit,
  LINEUP_POOL_MAX,
  LINEUP_REVEAL_STEP,
  LINEUP_SSR_COUNT,
  LINEUP_TIME_HOURS,
  LINEUP_VISIBLE_COUNT,
  localHourOf,
  matchesLineupFilters,
  matchingLineupIds,
  splitLineupSlots,
  type LineupFilterItem,
} from '../lineup-filters';

const NOW = Date.parse('2026-07-30T12:00:00Z');

function slot(overrides: Partial<PublicStreamSlot> = {}): PublicStreamSlot {
  return {
    id: 'slot-1',
    streamer_id: 'streamer-1',
    streamer_name: 'Streamer One',
    platforms: ['twitch'],
    title: 'A stream',
    category: 'Just Chatting',
    thumbnail_url: null,
    avatar_url: null,
    start_time: '2026-07-30T18:00:00Z',
    duration_minutes: 240,
    status: 'upcoming',
    is_predicted: true,
    confidence: 'high',
    is_always_on: false,
    twitch_login: 'streamerone',
    youtube_channel_id: null,
    streamer_timezone: null,
    streamer_language: 'en',
    viewer_count: null,
    ...overrides,
  };
}

/**
 * Timezone-free stand-in for the browser's local hour: the tests treat the
 * timestamps as if the viewer sat in UTC. The real resolver is
 * `localHourOf`, which is deliberately the only timezone-dependent piece.
 */
const utcHour = (startMs: number) => new Date(startMs).getUTCHours();

function item(overrides: Partial<LineupFilterItem> = {}): LineupFilterItem {
  return {
    id: 'a',
    category: 'Just Chatting',
    language: 'en',
    languageLabel: 'EN',
    startMs: Date.parse('2026-07-30T18:00:00Z'),
    ...overrides,
  };
}

describe('buildLineupFilterItems', () => {
  const upper = (code: string) => code.toUpperCase();

  it('carries the raw start timestamp, not a pre-computed bucket', () => {
    const items = buildLineupFilterItems(
      [slot({ id: '1', start_time: '2026-07-30T20:30:00Z' })],
      upper,
    );
    expect(items[0].startMs).toBe(Date.parse('2026-07-30T20:30:00Z'));
  });

  it('normalizes the language and resolves its display label', () => {
    const items = buildLineupFilterItems(
      [slot({ id: '1', category: 'VALORANT', streamer_language: 'pt-BR' })],
      upper,
    );
    expect(items[0]).toMatchObject({
      id: '1',
      category: 'VALORANT',
      language: 'pt',
      languageLabel: 'PT',
    });
  });

  it('blanks missing metadata instead of inventing a bucket', () => {
    const items = buildLineupFilterItems(
      [slot({ id: '1', category: '  ', streamer_language: null })],
      upper,
    );
    expect(items[0]).toMatchObject({ category: '', language: '', languageLabel: '' });
  });

  it('records an unparseable start as 0 rather than NaN', () => {
    const items = buildLineupFilterItems([slot({ start_time: 'nope' })], upper);
    expect(items[0].startMs).toBe(0);
  });
});

describe('isLineupItemExpired', () => {
  it('expires a start that has passed', () => {
    expect(isLineupItemExpired(item({ startMs: NOW - 1 }), NOW)).toBe(true);
    expect(isLineupItemExpired(item({ startMs: NOW }), NOW)).toBe(true);
    expect(isLineupItemExpired(item({ startMs: NOW + 1 }), NOW)).toBe(false);
  });

  it('never expires an unparseable start', () => {
    expect(isLineupItemExpired(item({ startMs: 0 }), NOW)).toBe(false);
  });
});

describe('matchesLineupFilters', () => {
  const evening = item({ startMs: Date.parse('2026-07-30T21:00:00Z') });

  it('matches everything with an empty selection', () => {
    expect(matchesLineupFilters(evening, EMPTY_LINEUP_SELECTION, utcHour)).toBe(true);
  });

  it('requires every selected dimension', () => {
    expect(
      matchesLineupFilters(
        evening,
        { category: 'Just Chatting', language: 'en', fromHour: 20 },
        utcHour,
      ),
    ).toBe(true);
    expect(
      matchesLineupFilters(
        evening,
        { category: 'VALORANT', language: 'en', fromHour: 20 },
        utcHour,
      ),
    ).toBe(false);
    expect(
      matchesLineupFilters(
        evening,
        { category: 'Just Chatting', language: 'de', fromHour: 20 },
        utcHour,
      ),
    ).toBe(false);
  });

  // The cumulative contract: "from 8 PM" is every start at or after that hour
  // of the local day, not a two-hour block.
  it('treats the time filter as "from this hour onwards"', () => {
    const at21 = item({ startMs: Date.parse('2026-07-30T21:00:00Z') });
    for (const hour of [14, 16, 18, 20]) {
      expect(
        matchesLineupFilters(at21, { ...EMPTY_LINEUP_SELECTION, fromHour: hour }, utcHour),
      ).toBe(true);
    }
    expect(
      matchesLineupFilters(at21, { ...EMPTY_LINEUP_SELECTION, fromHour: 22 }, utcHour),
    ).toBe(false);
  });

  // Hour OF THE DAY, not "after tonight 8 PM": a slot at 09:00 tomorrow must
  // not answer an evening filter just because it is chronologically later.
  it('compares the hour of the day, so tomorrow morning fails an evening filter', () => {
    const tomorrowMorning = item({ startMs: Date.parse('2026-07-31T09:00:00Z') });
    expect(
      matchesLineupFilters(
        tomorrowMorning,
        { ...EMPTY_LINEUP_SELECTION, fromHour: 20 },
        utcHour,
      ),
    ).toBe(false);
  });

  it('never matches a blank-metadata item through a filter', () => {
    const blank = item({ category: '', language: '', languageLabel: '' });
    expect(matchesLineupFilters(blank, EMPTY_LINEUP_SELECTION, utcHour)).toBe(true);
    expect(
      matchesLineupFilters(
        blank,
        { ...EMPTY_LINEUP_SELECTION, category: 'Just Chatting' },
        utcHour,
      ),
    ).toBe(false);
    expect(
      matchesLineupFilters(blank, { ...EMPTY_LINEUP_SELECTION, language: 'en' }, utcHour),
    ).toBe(false);
  });

  it('drops an unparseable start from any time filter', () => {
    expect(
      matchesLineupFilters(
        item({ startMs: 0 }),
        { ...EMPTY_LINEUP_SELECTION, fromHour: 14 },
        utcHour,
      ),
    ).toBe(false);
    // …but keeps it reachable with no time selected.
    expect(
      matchesLineupFilters(item({ startMs: 0 }), EMPTY_LINEUP_SELECTION, utcHour),
    ).toBe(true);
  });
});

describe('isLineupSelectionActive', () => {
  it('is false only for the empty selection', () => {
    expect(isLineupSelectionActive(EMPTY_LINEUP_SELECTION)).toBe(false);
    expect(
      isLineupSelectionActive({ ...EMPTY_LINEUP_SELECTION, fromHour: 22 }),
    ).toBe(true);
    expect(
      isLineupSelectionActive({ ...EMPTY_LINEUP_SELECTION, category: 'x' }),
    ).toBe(true);
    expect(
      isLineupSelectionActive({ ...EMPTY_LINEUP_SELECTION, language: 'de' }),
    ).toBe(true);
  });
});

describe('computeVisibleLineupIds', () => {
  const items = [
    item({ id: 'past', startMs: NOW - 60_000 }),
    item({ id: 'afternoon', startMs: Date.parse('2026-07-30T15:00:00Z') }),
    item({
      id: 'evening-de',
      language: 'de',
      languageLabel: 'DE',
      startMs: Date.parse('2026-07-30T20:30:00Z'),
    }),
    item({
      id: 'late-valorant',
      category: 'VALORANT',
      startMs: Date.parse('2026-07-30T23:00:00Z'),
    }),
  ];

  it('shows every unexpired card with no selection', () => {
    expect(computeVisibleLineupIds(items, EMPTY_LINEUP_SELECTION, utcHour, NOW)).toEqual(
      new Set(['afternoon', 'evening-de', 'late-valorant']),
    );
  });

  it('hides expired cards regardless of the selection', () => {
    const visible = computeVisibleLineupIds(
      items,
      { ...EMPTY_LINEUP_SELECTION, category: 'Just Chatting' },
      utcHour,
      NOW,
    );
    expect(visible.has('past')).toBe(false);
  });

  it('combines all three dimensions', () => {
    expect(
      computeVisibleLineupIds(
        items,
        { category: 'Just Chatting', language: 'de', fromHour: 20 },
        utcHour,
        NOW,
      ),
    ).toEqual(new Set(['evening-de']));
  });

  it('returns nothing when a selection matches nothing', () => {
    expect(
      computeVisibleLineupIds(
        items,
        { ...EMPTY_LINEUP_SELECTION, category: 'Dota 2' },
        utcHour,
        NOW,
      ),
    ).toEqual(new Set());
  });
});

describe('countLineupCategoryOptions / countLineupLanguageOptions', () => {
  const items = [
    item({ id: '1', category: 'Just Chatting', language: 'en', languageLabel: 'EN' }),
    item({ id: '2', category: 'Just Chatting', language: 'de', languageLabel: 'DE' }),
    item({ id: '3', category: 'VALORANT', language: 'de', languageLabel: 'DE' }),
    item({ id: '4', category: '', language: '', languageLabel: '' }),
  ];

  it('counts by count desc then label, ignoring blank metadata', () => {
    expect(countLineupCategoryOptions(items)).toEqual([
      { value: 'Just Chatting', label: 'Just Chatting', count: 2 },
      { value: 'VALORANT', label: 'VALORANT', count: 1 },
    ]);
    expect(countLineupLanguageOptions(items)).toEqual([
      { value: 'de', label: 'DE', count: 2 },
      { value: 'en', label: 'EN', count: 1 },
    ]);
  });
});

describe('countLineupTimeOptions', () => {
  const label = (hour: number) => `From ${hour}`;
  const items = [
    item({ id: 'morning', startMs: Date.parse('2026-07-30T09:00:00Z') }),
    item({ id: 'a', startMs: Date.parse('2026-07-30T15:00:00Z') }),
    item({ id: 'b', startMs: Date.parse('2026-07-30T19:00:00Z') }),
    item({ id: 'c', startMs: Date.parse('2026-07-30T21:00:00Z') }),
  ];

  // Cumulative by construction, and chronological — NOT count-sorted like the
  // other two dimensions, which would render the list backwards.
  it('counts cumulatively in chronological order', () => {
    expect(countLineupTimeOptions(items, utcHour, label, NOW)).toEqual([
      { value: '14', label: 'From 14', count: 3 },
      { value: '16', label: 'From 16', count: 2 },
      { value: '18', label: 'From 18', count: 2 },
      { value: '20', label: 'From 20', count: 1 },
    ]);
  });

  it('drops options that would yield nothing', () => {
    const options = countLineupTimeOptions(items, utcHour, label, NOW);
    expect(options.map((option) => option.value)).not.toContain('22');
    for (const option of options) expect(option.count).toBeGreaterThan(0);
  });

  it('excludes expired and unparseable starts', () => {
    const withNoise = [
      ...items,
      item({ id: 'expired', startMs: NOW - 60_000 }),
      item({ id: 'broken', startMs: 0 }),
    ];
    expect(countLineupTimeOptions(withNoise, utcHour, label, NOW)[0].count).toBe(3);
  });

  it('offers no option at all when the window holds only morning slots', () => {
    expect(
      countLineupTimeOptions([items[0]], utcHour, label, NOW),
    ).toEqual([]);
  });
});

describe('formatLineupHour', () => {
  it('renders a locale-appropriate clock reading', () => {
    expect(formatLineupHour(20, 'en')).toMatch(/8[:.]00\s?PM/i);
    expect(formatLineupHour(20, 'de')).toContain('20:00');
  });

  it('falls back to a 24h reading for a broken locale tag', () => {
    expect(formatLineupHour(14, 'not a locale')).toBe('14:00');
  });

  it('covers every offered hour without repeating a label', () => {
    const labels = LINEUP_TIME_HOURS.map((hour) => formatLineupHour(hour, 'en'));
    expect(new Set(labels).size).toBe(LINEUP_TIME_HOURS.length);
  });
});

describe('constants', () => {
  it('offers the agreed common times, ascending', () => {
    expect([...LINEUP_TIME_HOURS]).toEqual([14, 16, 18, 20, 22]);
  });

  // The pool must clear production's 24 h window (~440 predictions) — it is a
  // payload guard now, not a DOM guard: only LINEUP_SSR_COUNT cards are HTML.
  it('covers the whole window and defers most of it', () => {
    expect(LINEUP_POOL_MAX).toBeGreaterThanOrEqual(500);
    expect(LINEUP_SSR_COUNT).toBeLessThan(LINEUP_POOL_MAX / 10);
  });
});

describe('lineupRevealLimit', () => {
  // Step 0 is the resting state. Whole cards only — a clamped half-card peek
  // is what cut the first visible card in half once the matches no longer
  // started at the top of the list.
  it('starts at the visible card count', () => {
    expect(lineupRevealLimit(0)).toBe(LINEUP_VISIBLE_COUNT);
    expect(lineupRevealLimit(-1)).toBe(LINEUP_VISIBLE_COUNT);
  });

  it('adds one flat batch per click', () => {
    expect(lineupRevealLimit(1)).toBe(LINEUP_REVEAL_STEP);
    expect(lineupRevealLimit(2)).toBe(LINEUP_REVEAL_STEP * 2);
    expect(lineupRevealLimit(3)).toBe(LINEUP_REVEAL_STEP * 3);
  });

  it('never shrinks as steps grow', () => {
    const limits = [0, 1, 2, 3, 4].map(lineupRevealLimit);
    expect(limits).toEqual([...limits].sort((a, b) => a - b));
  });
});

describe('matchingLineupIds', () => {
  const items = [
    item({ id: 'a', startMs: Date.parse('2026-07-30T15:00:00Z') }),
    item({ id: 'expired', startMs: NOW - 1000 }),
    item({
      id: 'b',
      language: 'de',
      languageLabel: 'DE',
      startMs: Date.parse('2026-07-30T19:00:00Z'),
    }),
    item({ id: 'c', startMs: Date.parse('2026-07-30T21:00:00Z') }),
  ];

  // Order is load-bearing: the reveal window is a PREFIX of this list, so
  // "the next 24" only means anything if the list stays chronological.
  it('keeps pool order and drops expired rows', () => {
    expect(matchingLineupIds(items, EMPTY_LINEUP_SELECTION, utcHour, NOW)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('narrows to the selection, order intact', () => {
    expect(
      matchingLineupIds(items, { ...EMPTY_LINEUP_SELECTION, fromHour: 18 }, utcHour, NOW),
    ).toEqual(['b', 'c']);
  });

  it('agrees with computeVisibleLineupIds', () => {
    const ordered = matchingLineupIds(items, EMPTY_LINEUP_SELECTION, utcHour, NOW);
    expect(computeVisibleLineupIds(items, EMPTY_LINEUP_SELECTION, utcHour, NOW)).toEqual(
      new Set(ordered),
    );
  });

  // The behaviour the reveal window exists for: a filter narrows the list but
  // must not open it, so the first click still only reaches its own batch.
  it('lets a prefix stand in for "the next batch" of a filtered list', () => {
    const many = Array.from({ length: 100 }, (_, i) =>
      item({ id: `s${i}`, startMs: Date.parse('2026-07-30T21:00:00Z') + i * 60_000 }),
    );
    const matches = matchingLineupIds(many, EMPTY_LINEUP_SELECTION, utcHour, NOW);
    expect(matches.slice(0, lineupRevealLimit(0))).toHaveLength(LINEUP_VISIBLE_COUNT);
    expect(matches.slice(0, lineupRevealLimit(1))).toHaveLength(24);
    expect(matches.slice(0, lineupRevealLimit(2))).toHaveLength(48);
    expect(matches.slice(0, lineupRevealLimit(1))[0]).toBe('s0');
  });
});

describe('splitLineupSlots', () => {
  const pool = Array.from({ length: 30 }, (_, i) => `s${i}`);

  it('keeps the head in the DOM and defers the rest, order intact', () => {
    const { ssr, deferred } = splitLineupSlots(pool, 4);
    expect(ssr).toEqual(['s0', 's1', 's2', 's3']);
    expect(deferred[0]).toBe('s4');
    expect(deferred).toHaveLength(26);
    // Concatenating them must reproduce the pool — the client appends its
    // matches after the server's, so any reordering would scramble the list.
    expect([...ssr, ...deferred]).toEqual(pool);
  });

  it('defers nothing when the pool fits the head', () => {
    const { ssr, deferred } = splitLineupSlots(['a', 'b'], 4);
    expect(ssr).toEqual(['a', 'b']);
    expect(deferred).toEqual([]);
  });

  it('defaults to LINEUP_SSR_COUNT', () => {
    expect(splitLineupSlots(pool).ssr).toHaveLength(LINEUP_SSR_COUNT);
  });
});

describe('localHourOf', () => {
  // The one timezone-dependent function: it must read the LOCAL hour, which is
  // what makes "from 8 PM" mean 8 PM where the visitor is.
  it('agrees with Date#getHours for the running timezone', () => {
    const ms = Date.parse('2026-07-30T20:30:00Z');
    expect(localHourOf(ms)).toBe(new Date(ms).getHours());
  });
});
