import { describe, it, expect } from 'vitest';
import type { PublicStreamSlot } from '@/lib/server/partner-api';
import {
  addDaysToDateKey,
  bucketSlotsIntoBlocks,
  buildTonightBlocks,
  buildTonightFilterItems,
  countTonightCategoryOptions,
  countTonightLanguageOptions,
  formatClockReading,
  formatEveningDate,
  isTonightItemExpired,
  matchingTonightIdsByBlock,
  pickHeadlineNames,
  pickPrimetimeSlots,
  rankSlotsByProminence,
  resolveTonightWindow,
  selectAlreadyLive,
  selectTonightSlots,
  tonightRevealLimit,
  TONIGHT_REFERENCE_ZONES,
  TONIGHT_VISIBLE_PER_BLOCK,
  TONIGHT_REVEAL_STEP,
  zonedDateKey,
  zonedParts,
  zonedWallTimeToMs,
  zoneOffsetMinutes,
} from '../logic';
import { UI_LANGS } from '@/lib/i18n-core';

const BERLIN = 'Europe/Berlin';
const TOKYO = 'Asia/Tokyo';
const SAO_PAULO = 'America/Sao_Paulo';

const at = (iso: string): number => Date.parse(iso);

let seq = 0;
function slot(overrides: Partial<PublicStreamSlot> = {}): PublicStreamSlot {
  seq += 1;
  return {
    id: `slot-${String(seq).padStart(3, '0')}`,
    streamer_id: `streamer-${seq}`,
    streamer_name: `Streamer ${seq}`,
    platforms: ['twitch'],
    title: 'A stream',
    category: 'Just Chatting',
    thumbnail_url: null,
    avatar_url: null,
    start_time: '2026-08-05T18:00:00Z',
    duration_minutes: 180,
    status: 'upcoming',
    is_predicted: true,
    confidence: 'medium',
    is_always_on: false,
    twitch_login: 'someone',
    youtube_channel_id: null,
    streamer_timezone: null,
    streamer_language: 'de',
    viewer_count: null,
    reasoning: null,
    ...overrides,
  } as PublicStreamSlot;
}

// ============================================
// Timezone primitives
// ============================================

describe('timezone primitives', () => {
  it('reads wall-clock parts in the target zone', () => {
    const p = zonedParts(at('2026-08-05T12:34:00Z'), BERLIN);
    expect(p).toEqual({ year: 2026, month: 8, day: 5, hour: 14, minute: 34 });
  });

  it('renders midnight as hour 0, never 24', () => {
    // The ICU "24:00" quirk would put the broadcast-day check on the wrong
    // side of its boundary.
    expect(zonedParts(at('2026-08-05T22:00:00Z'), BERLIN).hour).toBe(0);
    expect(zonedParts(at('2026-08-05T15:00:00Z'), TOKYO).hour).toBe(0);
  });

  it('rolls the calendar date over with the zone, not with UTC', () => {
    // 23:30 UTC is already tomorrow in Berlin and Tokyo, still today in Brazil.
    const instant = at('2026-08-05T23:30:00Z');
    expect(zonedDateKey(instant, BERLIN)).toBe('2026-08-06');
    expect(zonedDateKey(instant, TOKYO)).toBe('2026-08-06');
    expect(zonedDateKey(instant, SAO_PAULO)).toBe('2026-08-05');
  });

  it('knows summer and winter offsets', () => {
    expect(zoneOffsetMinutes(at('2026-08-05T12:00:00Z'), BERLIN)).toBe(120);
    expect(zoneOffsetMinutes(at('2026-01-15T12:00:00Z'), BERLIN)).toBe(60);
    expect(zoneOffsetMinutes(at('2026-08-05T12:00:00Z'), TOKYO)).toBe(540);
    expect(zoneOffsetMinutes(at('2026-08-05T12:00:00Z'), SAO_PAULO)).toBe(-180);
  });

  it('shifts date keys across month ends', () => {
    expect(addDaysToDateKey('2026-08-01', -1)).toBe('2026-07-31');
    expect(addDaysToDateKey('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysToDateKey('2026-02-28', 1)).toBe('2026-03-01');
  });

  it('solves a wall-clock reading back to its instant', () => {
    expect(zonedWallTimeToMs('2026-08-05', 18 * 60, BERLIN)).toBe(
      at('2026-08-05T16:00:00Z'),
    );
    // Minutes beyond 1440 roll into the following day — how 24:00/30:00 are
    // expressed for the night block.
    expect(zonedWallTimeToMs('2026-08-05', 30 * 60, BERLIN)).toBe(
      at('2026-08-06T04:00:00Z'),
    );
    expect(zonedWallTimeToMs('2026-08-05', 18 * 60, TOKYO)).toBe(
      at('2026-08-05T09:00:00Z'),
    );
  });

  it('round-trips every reference zone', () => {
    for (const zone of Object.values(TONIGHT_REFERENCE_ZONES)) {
      const ms = zonedWallTimeToMs('2026-08-05', 20 * 60, zone);
      const parts = zonedParts(ms, zone);
      expect({ zone, hour: parts.hour, minute: parts.minute, day: parts.day }).toEqual({
        zone,
        hour: 20,
        minute: 0,
        day: 5,
      });
    }
  });

  it('survives the spring-forward night (window is 11 h, not 12)', () => {
    // Berlin 2026-03-29: 02:00 CET → 03:00 CEST.
    const start = zonedWallTimeToMs('2026-03-28', 18 * 60, BERLIN);
    const end = zonedWallTimeToMs('2026-03-28', 30 * 60, BERLIN);
    expect(start).toBe(at('2026-03-28T17:00:00Z'));
    expect(end).toBe(at('2026-03-29T04:00:00Z'));
    expect((end - start) / 3_600_000).toBe(11);
  });

  it('survives the fall-back night (window is 13 h)', () => {
    // Berlin 2026-10-25: 03:00 CEST → 02:00 CET.
    const start = zonedWallTimeToMs('2026-10-24', 18 * 60, BERLIN);
    const end = zonedWallTimeToMs('2026-10-24', 30 * 60, BERLIN);
    expect((end - start) / 3_600_000).toBe(13);
  });

  it('covers every UI locale with a reference zone', () => {
    for (const lang of UI_LANGS) {
      expect(TONIGHT_REFERENCE_ZONES[lang]).toBeTruthy();
    }
  });
});

// ============================================
// The window
// ============================================

describe('resolveTonightWindow', () => {
  it('previews the coming evening during the day', () => {
    const w = resolveTonightWindow(at('2026-08-05T12:00:00Z'), BERLIN); // 14:00 Berlin
    expect(w.mode).toBe('evening');
    expect(w.dateKey).toBe('2026-08-05');
    expect(w.startMs).toBe(at('2026-08-05T16:00:00Z'));
    expect(w.endMs).toBe(at('2026-08-06T04:00:00Z'));
    expect(w.offsetMinutes).toBe(120);
  });

  it('stays on the running night after midnight', () => {
    // 01:30 Berlin on Aug 6 — "tonight" is still the evening that started
    // Aug 5, not one 17 hours away.
    const w = resolveTonightWindow(at('2026-08-05T23:30:00Z'), BERLIN);
    expect(w.mode).toBe('night');
    expect(w.dateKey).toBe('2026-08-05');
    expect(w.endMs).toBe(at('2026-08-06T04:00:00Z'));
  });

  it('flips to the new evening exactly at the broadcast-day boundary', () => {
    const before = resolveTonightWindow(at('2026-08-06T03:59:00Z'), BERLIN); // 05:59
    const after = resolveTonightWindow(at('2026-08-06T04:00:00Z'), BERLIN); // 06:00
    expect(before.mode).toBe('night');
    expect(before.dateKey).toBe('2026-08-05');
    expect(after.mode).toBe('evening');
    expect(after.dateKey).toBe('2026-08-06');
  });

  it('anchors to the reference zone, not to UTC', () => {
    // One instant, three locales: Tokyo is already past midnight.
    const instant = at('2026-08-05T16:00:00Z');
    expect(resolveTonightWindow(instant, BERLIN).dateKey).toBe('2026-08-05'); // 18:00
    expect(resolveTonightWindow(instant, TOKYO)).toMatchObject({
      mode: 'night', // 01:00 next day
      dateKey: '2026-08-05',
    });
    expect(resolveTonightWindow(instant, SAO_PAULO).dateKey).toBe('2026-08-05'); // 13:00
  });

  it('never ends more than 24 h ahead (bounds the fetch window)', () => {
    for (const zone of Object.values(TONIGHT_REFERENCE_ZONES)) {
      for (let hour = 0; hour < 24; hour++) {
        const now = at(`2026-08-05T${String(hour).padStart(2, '0')}:00:00Z`);
        const w = resolveTonightWindow(now, zone);
        const aheadHours = (w.endMs - now) / 3_600_000;
        expect(aheadHours).toBeLessThanOrEqual(24);
        expect(aheadHours).toBeGreaterThan(0);
      }
    }
  });
});

describe('buildTonightBlocks', () => {
  const window = resolveTonightWindow(at('2026-08-05T12:00:00Z'), BERLIN);
  const blocks = buildTonightBlocks(window);

  it('produces four contiguous blocks covering the whole window', () => {
    expect(blocks).toHaveLength(4);
    expect(blocks[0].startMs).toBe(window.startMs);
    expect(blocks[blocks.length - 1].endMs).toBe(window.endMs);
    for (let i = 1; i < blocks.length; i++) {
      expect(blocks[i].startMs).toBe(blocks[i - 1].endMs);
    }
  });

  it('marks only the post-midnight block as night', () => {
    expect(blocks.map((b) => b.isNight)).toEqual([false, false, false, true]);
  });

  it('gives every block a stable, unique anchor id', () => {
    expect(blocks.map((b) => b.id)).toEqual([
      'tonight-18',
      'tonight-20',
      'tonight-22',
      'tonight-24',
    ]);
  });
});

// ============================================
// Slot selection
// ============================================

describe('selectTonightSlots', () => {
  const window = resolveTonightWindow(at('2026-08-05T12:00:00Z'), BERLIN);
  const now = at('2026-08-05T12:00:00Z');

  it('keeps only upcoming starts inside the window', () => {
    const inside = slot({ start_time: '2026-08-05T19:00:00Z' });
    const beforeWindow = slot({ start_time: '2026-08-05T14:00:00Z' }); // 16:00 Berlin
    const afterWindow = slot({ start_time: '2026-08-06T05:00:00Z' }); // 07:00 Berlin
    const picked = selectTonightSlots(
      [inside, beforeWindow, afterWindow],
      window,
      now,
    );
    expect(picked.map((s) => s.id)).toEqual([inside.id]);
  });

  it('drops live and always-on slots (they have their own sections)', () => {
    const live = slot({ start_time: '2026-08-05T19:00:00Z', status: 'live' });
    const alwaysOn = slot({
      start_time: '2026-08-05T19:00:00Z',
      is_always_on: true,
      duration_minutes: 525_600,
    });
    const normal = slot({ start_time: '2026-08-05T19:00:00Z' });
    expect(
      selectTonightSlots([live, alwaysOn, normal], window, now).map((s) => s.id),
    ).toEqual([normal.id]);
  });

  it('drops starts that already passed', () => {
    const later = at('2026-08-05T20:00:00Z');
    const expired = slot({ start_time: '2026-08-05T19:00:00Z' });
    const upcoming = slot({ start_time: '2026-08-05T21:00:00Z' });
    expect(
      selectTonightSlots([expired, upcoming], window, later).map((s) => s.id),
    ).toEqual([upcoming.id]);
  });

  it('keeps cancelled slots — a cancellation is listings information', () => {
    const cancelled = slot({
      start_time: '2026-08-05T19:00:00Z',
      slot_kind: 'cancelled',
    });
    expect(selectTonightSlots([cancelled], window, now)).toHaveLength(1);
  });

  it('sorts chronologically and breaks ties deterministically', () => {
    const b = slot({ id: 'b', start_time: '2026-08-05T19:00:00Z' });
    const a = slot({ id: 'a', start_time: '2026-08-05T19:00:00Z' });
    const early = slot({ id: 'z', start_time: '2026-08-05T18:30:00Z' });
    expect(selectTonightSlots([b, a, early], window, now).map((s) => s.id)).toEqual([
      'z',
      'a',
      'b',
    ]);
  });

  it('caps the pool', () => {
    const many = Array.from({ length: 20 }, () =>
      slot({ start_time: '2026-08-05T19:00:00Z' }),
    );
    expect(selectTonightSlots(many, window, now, 5)).toHaveLength(5);
  });
});

describe('bucketSlotsIntoBlocks', () => {
  const window = resolveTonightWindow(at('2026-08-05T12:00:00Z'), BERLIN);
  const blocks = buildTonightBlocks(window);

  it('files each slot under the block containing its start', () => {
    const early = slot({ start_time: '2026-08-05T17:00:00Z' }); // 19:00 Berlin
    const prime = slot({ start_time: '2026-08-05T18:30:00Z' }); // 20:30
    const late = slot({ start_time: '2026-08-05T20:30:00Z' }); // 22:30
    const night = slot({ start_time: '2026-08-06T01:00:00Z' }); // 03:00
    const buckets = bucketSlotsIntoBlocks([early, prime, late, night], blocks);
    expect(buckets.map((b) => b.map((s) => s.id))).toEqual([
      [early.id],
      [prime.id],
      [late.id],
      [night.id],
    ]);
  });

  it('puts a boundary start in the later block (ranges are half-open)', () => {
    const onBoundary = slot({ start_time: '2026-08-05T18:00:00Z' }); // exactly 20:00
    const buckets = bucketSlotsIntoBlocks([onBoundary], blocks);
    expect(buckets[0]).toHaveLength(0);
    expect(buckets[1].map((s) => s.id)).toEqual([onBoundary.id]);
  });

  it('drops a slot outside every block rather than misfiling it', () => {
    const outside = slot({ start_time: '2026-08-07T12:00:00Z' });
    expect(bucketSlotsIntoBlocks([outside], blocks).flat()).toHaveLength(0);
  });
});

describe('selectAlreadyLive', () => {
  it('requires a fresh viewer sample (zombie-slot guard)', () => {
    const sampled = slot({ status: 'live', viewer_count: 120 });
    const zombie = slot({ status: 'live', viewer_count: null });
    expect(selectAlreadyLive([sampled, zombie]).map((s) => s.id)).toEqual([
      sampled.id,
    ]);
  });

  it('ranks by current viewers and keeps one row per streamer', () => {
    const big = slot({ streamer_id: 'a', status: 'live', viewer_count: 900 });
    const small = slot({ streamer_id: 'b', status: 'live', viewer_count: 100 });
    const simulcast = slot({ streamer_id: 'a', status: 'live', viewer_count: 400 });
    const picked = selectAlreadyLive([small, simulcast, big]);
    expect(picked.map((s) => s.streamer_id)).toEqual(['a', 'b']);
    expect(picked[0].id).toBe(big.id);
  });

  it('caps the section', () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      slot({ streamer_id: `s${i}`, status: 'live', viewer_count: 100 - i }),
    );
    expect(selectAlreadyLive(many, 3)).toHaveLength(3);
  });
});

// ============================================
// Editorial ranking
// ============================================

describe('rankSlotsByProminence', () => {
  it('orders by follower count, biggest first', () => {
    const small = slot({ streamer_id: 'small' });
    const huge = slot({ streamer_id: 'huge' });
    const mid = slot({ streamer_id: 'mid' });
    const followers = new Map([
      ['small', 1_000],
      ['huge', 9_000_000],
      ['mid', 50_000],
    ]);
    expect(
      rankSlotsByProminence([small, huge, mid], followers).map((s) => s.streamer_id),
    ).toEqual(['huge', 'mid', 'small']);
  });

  it('ranks unknown streamers below every known one, never dropping them', () => {
    const known = slot({ streamer_id: 'known' });
    const unknown = slot({ streamer_id: 'unknown' });
    const ranked = rankSlotsByProminence(
      [unknown, known],
      new Map([['known', 10]]),
    );
    expect(ranked.map((s) => s.streamer_id)).toEqual(['known', 'unknown']);
  });

  it('degrades to confidence then time without any follower data', () => {
    const lowConf = slot({ confidence: 'medium', start_time: '2026-08-05T18:00:00Z' });
    const highConf = slot({ confidence: 'high', start_time: '2026-08-05T19:00:00Z' });
    expect(
      rankSlotsByProminence([lowConf, highConf], new Map()).map((s) => s.id),
    ).toEqual([highConf.id, lowConf.id]);
  });

  it('excludes cancelled and low-confidence slots from the editorial picks', () => {
    const cancelled = slot({ slot_kind: 'cancelled' });
    const low = slot({ confidence: 'low' });
    const ok = slot({ confidence: 'high' });
    expect(rankSlotsByProminence([cancelled, low, ok], new Map())).toHaveLength(1);
  });

  it('shows one slot per streamer', () => {
    const first = slot({ streamer_id: 'a', start_time: '2026-08-05T18:00:00Z' });
    const second = slot({ streamer_id: 'a', start_time: '2026-08-05T22:00:00Z' });
    expect(rankSlotsByProminence([first, second], new Map())).toHaveLength(1);
  });

  it('is deterministic for identical data (ISR byte-stability)', () => {
    const a = slot({ id: 'aaa', streamer_id: 'x', start_time: '2026-08-05T18:00:00Z' });
    const b = slot({ id: 'bbb', streamer_id: 'y', start_time: '2026-08-05T18:00:00Z' });
    const first = rankSlotsByProminence([a, b], new Map()).map((s) => s.id);
    const second = rankSlotsByProminence([b, a], new Map()).map((s) => s.id);
    expect(first).toEqual(second);
    expect(first).toEqual(['aaa', 'bbb']);
  });
});

describe('pickPrimetimeSlots', () => {
  const window = resolveTonightWindow(at('2026-08-05T12:00:00Z'), BERLIN);

  it('only considers starts inside the 19:30–21:30 reference window', () => {
    const tooEarly = slot({ start_time: '2026-08-05T17:00:00Z' }); // 19:00
    const inside = slot({ start_time: '2026-08-05T18:15:00Z' }); // 20:15
    const tooLate = slot({ start_time: '2026-08-05T19:45:00Z' }); // 21:45
    expect(
      pickPrimetimeSlots([tooEarly, inside, tooLate], window, new Map()).map(
        (s) => s.id,
      ),
    ).toEqual([inside.id]);
  });

  it('includes the window edges half-open', () => {
    const atStart = slot({ start_time: '2026-08-05T17:30:00Z' }); // 19:30
    const atEnd = slot({ start_time: '2026-08-05T19:30:00Z' }); // 21:30
    const picked = pickPrimetimeSlots([atStart, atEnd], window, new Map());
    expect(picked.map((s) => s.id)).toEqual([atStart.id]);
  });

  it('caps the highlight box', () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      slot({ streamer_id: `s${i}`, start_time: '2026-08-05T18:15:00Z' }),
    );
    expect(pickPrimetimeSlots(many, window, new Map(), 4)).toHaveLength(4);
  });
});

describe('pickHeadlineNames', () => {
  it('names the biggest streamers of the evening', () => {
    const a = slot({ streamer_id: 'a', streamer_name: 'Alpha' });
    const b = slot({ streamer_id: 'b', streamer_name: 'Bravo' });
    const c = slot({ streamer_id: 'c', streamer_name: 'Charlie' });
    const followers = new Map([
      ['a', 10],
      ['b', 900],
      ['c', 500],
    ]);
    expect(pickHeadlineNames([a, b, c], followers, 2)).toEqual(['Bravo', 'Charlie']);
  });

  it('returns an empty list when nothing qualifies', () => {
    expect(pickHeadlineNames([slot({ confidence: 'low' })], new Map())).toEqual([]);
  });
});

// ============================================
// Filters
// ============================================

describe('tonight filters', () => {
  const window = resolveTonightWindow(at('2026-08-05T12:00:00Z'), BERLIN);
  const blocks = buildTonightBlocks(window);
  const nameOf = (code: string) => code.toUpperCase();

  const early = slot({
    start_time: '2026-08-05T17:00:00Z',
    category: 'Minecraft',
    streamer_language: 'de',
  });
  const prime = slot({
    start_time: '2026-08-05T18:30:00Z',
    category: 'Just Chatting',
    streamer_language: 'en',
  });
  const primeTwo = slot({
    start_time: '2026-08-05T18:45:00Z',
    category: 'Minecraft',
    streamer_language: 'en',
  });
  const unknownLang = slot({
    start_time: '2026-08-05T19:00:00Z',
    category: null,
    streamer_language: null,
  });

  const buckets = bucketSlotsIntoBlocks(
    [early, prime, primeTwo, unknownLang],
    blocks,
  );
  const items = buildTonightFilterItems(buckets, blocks, nameOf);

  it('carries the block each card belongs to', () => {
    expect(items.find((i) => i.id === early.id)?.blockId).toBe('tonight-18');
    expect(items.find((i) => i.id === prime.id)?.blockId).toBe('tonight-20');
  });

  it('normalizes the language and leaves unknown ones blank', () => {
    expect(items.find((i) => i.id === prime.id)?.language).toBe('en');
    expect(items.find((i) => i.id === unknownLang.id)?.language).toBe('');
  });

  it('offers no option for missing categories or languages', () => {
    expect(countTonightCategoryOptions(items).map((o) => o.value)).toEqual([
      'Minecraft',
      'Just Chatting',
    ]);
    // Counted over the pool, most common first: en has two cards, de one.
    expect(countTonightLanguageOptions(items).map((o) => o.value)).toEqual([
      'en',
      'de',
    ]);
  });

  it('groups matches per block, in chronological order', () => {
    const matches = matchingTonightIdsByBlock(
      items,
      { category: 'Minecraft', language: '' },
      at('2026-08-05T12:00:00Z'),
    );
    expect(matches.get('tonight-18')).toEqual([early.id]);
    expect(matches.get('tonight-20')).toEqual([primeTwo.id]);
    expect(matches.has('tonight-22')).toBe(false);
  });

  it('drops expired cards from every match set', () => {
    const matches = matchingTonightIdsByBlock(
      items,
      { category: '', language: '' },
      at('2026-08-05T18:40:00Z'),
    );
    // 20:30 Berlin has passed, 20:45 and 21:00 have not — and the whole
    // 18:00 block is gone, so it no longer appears as a key at all.
    expect(matches.has('tonight-18')).toBe(false);
    expect(matches.get('tonight-20')).toEqual([primeTwo.id, unknownLang.id]);
  });

  it('never treats an unparseable start as expired', () => {
    expect(
      isTonightItemExpired(
        { id: 'x', blockId: 'b', category: '', language: '', languageLabel: '', startMs: 0 },
        Date.now(),
      ),
    ).toBe(false);
  });

  it('reveals a first window and then flat batches', () => {
    expect(tonightRevealLimit(0)).toBe(TONIGHT_VISIBLE_PER_BLOCK);
    expect(tonightRevealLimit(1)).toBe(
      TONIGHT_VISIBLE_PER_BLOCK + TONIGHT_REVEAL_STEP,
    );
    expect(tonightRevealLimit(2)).toBe(
      TONIGHT_VISIBLE_PER_BLOCK + 2 * TONIGHT_REVEAL_STEP,
    );
  });
});

// ============================================
// Labels
// ============================================

describe('labels', () => {
  it('formats a clock reading in the reference zone on the server', () => {
    const ms = at('2026-08-05T18:00:00Z');
    expect(formatClockReading(ms, 'de', BERLIN)).toBe('20:00');
    // Unpadded below 10, exactly like the homepage's `formatLineupHour` —
    // the two surfaces must agree on how a start time looks. Reference-zone
    // block bounds are 18/20/22 and never single-digit; a single digit only
    // appears after the client relabels into a distant viewer zone.
    expect(formatClockReading(ms, 'de', TOKYO)).toBe('3:00');
  });

  it('uses the locale hour cycle, like the homepage lineup', () => {
    const ms = at('2026-08-05T18:00:00Z');
    expect(formatClockReading(ms, 'en', BERLIN)).toMatch(/8:00\s?PM/);
  });

  it('renders the evening date from the window, not from a runtime clock', () => {
    const window = resolveTonightWindow(at('2026-08-05T12:00:00Z'), BERLIN);
    expect(formatEveningDate(window, 'de')).toBe('Mittwoch, 5. August');
    expect(formatEveningDate(window, 'en')).toMatch(/Wednesday/);
  });
});
