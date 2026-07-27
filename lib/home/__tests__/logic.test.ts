import { describe, it, expect } from 'vitest';
import type { PublicGame, PublicStreamSlot } from '@/lib/server/partner-api';
import {
  buildPredictionAccuracy,
  countStartingSoon,
  floorToBucket,
  floorToHourIso,
  pickLiveRailSlots,
  preferWithNextSlot,
  rankWeekStreamed,
  reliabilityHits,
  sampleRandom,
  topCategoriesByHours,
} from '../logic';

function slot(overrides: Partial<PublicStreamSlot>): PublicStreamSlot {
  return {
    id: 'slot-1',
    streamer_id: 'streamer-1',
    streamer_name: 'Streamer One',
    platforms: ['twitch'],
    title: 'Test stream',
    category: null,
    thumbnail_url: null,
    avatar_url: null,
    start_time: '2026-07-27T12:00:00.000Z',
    duration_minutes: 120,
    status: 'live',
    is_predicted: false,
    confidence: 'high',
    is_always_on: false,
    twitch_login: null,
    youtube_channel_id: null,
    streamer_timezone: null,
    ...overrides,
  } as PublicStreamSlot;
}

function game(category: string, hours28d: number | undefined): PublicGame {
  return { category, streamer_count: 3, hours_28d: hours28d } as PublicGame;
}

describe('pickLiveRailSlots', () => {
  it('sorts by viewer count desc with null viewers last and dedupes streamers', () => {
    const picked = pickLiveRailSlots([
      slot({ id: 'a', streamer_id: 's1', viewer_count: 100 }),
      slot({ id: 'b', streamer_id: 's2', viewer_count: null }),
      slot({ id: 'c', streamer_id: 's3', viewer_count: 900 }),
      // Same streamer with a lower-viewer duplicate slot: dropped.
      slot({ id: 'd', streamer_id: 's3', viewer_count: 10 }),
    ]);
    expect(picked.map((s) => s.id)).toEqual(['c', 'a', 'b']);
  });

  it('drops non-live rows and applies the cap', () => {
    const picked = pickLiveRailSlots(
      [
        slot({ id: 'a', streamer_id: 's1', viewer_count: 3 }),
        slot({ id: 'b', streamer_id: 's2', viewer_count: 2 }),
        slot({ id: 'up', streamer_id: 's4', status: 'upcoming', viewer_count: 999 }),
        slot({ id: 'c', streamer_id: 's3', viewer_count: 1 }),
      ],
      2,
    );
    expect(picked.map((s) => s.id)).toEqual(['a', 'b']);
  });
});

describe('countStartingSoon', () => {
  const now = new Date('2026-07-27T12:00:00.000Z');

  it('counts distinct streamers inside the window, upcoming only', () => {
    const count = countStartingSoon(
      [
        slot({ streamer_id: 's1', status: 'upcoming', start_time: '2026-07-27T13:00:00.000Z' }),
        // Second slot of the same streamer → still one.
        slot({ streamer_id: 's1', status: 'upcoming', start_time: '2026-07-27T15:00:00.000Z' }),
        slot({ streamer_id: 's2', status: 'upcoming', start_time: '2026-07-27T17:59:00.000Z' }),
        // Outside the 6h window.
        slot({ streamer_id: 's3', status: 'upcoming', start_time: '2026-07-27T19:00:00.000Z' }),
        // Already started / live → not "starting soon".
        slot({ streamer_id: 's4', status: 'upcoming', start_time: '2026-07-27T11:00:00.000Z' }),
        slot({ streamer_id: 's5', status: 'live', start_time: '2026-07-27T13:00:00.000Z' }),
      ],
      now,
      6,
    );
    expect(count).toBe(2);
  });

  it('treats the exact window end as inside and unparseable dates as outside', () => {
    expect(
      countStartingSoon(
        [
          slot({ streamer_id: 's1', status: 'upcoming', start_time: '2026-07-27T18:00:00.000Z' }),
          slot({ streamer_id: 's2', status: 'upcoming', start_time: 'not-a-date' }),
        ],
        now,
        6,
      ),
    ).toBe(1);
  });
});

describe('topCategoriesByHours', () => {
  it('sorts by hours_28d desc, drops empty/undefined hours, caps the list', () => {
    const top = topCategoriesByHours(
      [
        game('Minecraft', 40),
        game('Just Chatting', 120),
        game('Empty', 0),
        game('Unknown', undefined),
        game('CS2', 90),
        game('LoL', 50),
      ],
      3,
    );
    expect(top.map((g) => g.category)).toEqual(['Just Chatting', 'CS2', 'LoL']);
  });
});

describe('floorToBucket', () => {
  it('floors to the 5-minute bucket so fetch URLs dedupe across renders', () => {
    expect(floorToBucket(new Date('2026-07-27T12:07:59.999Z')).toISOString()).toBe(
      '2026-07-27T12:05:00.000Z',
    );
    expect(floorToBucket(new Date('2026-07-27T12:05:00.000Z')).toISOString()).toBe(
      '2026-07-27T12:05:00.000Z',
    );
  });
});

describe('floorToHourIso', () => {
  it('floors to the full UTC hour', () => {
    expect(floorToHourIso(new Date('2026-07-27T12:34:56.789Z'))).toBe(
      '2026-07-27T12:00:00.000Z',
    );
    expect(floorToHourIso(new Date('2026-07-27T12:00:00.000Z'))).toBe(
      '2026-07-27T12:00:00.000Z',
    );
  });
});

describe('buildPredictionAccuracy', () => {
  it('counts hits/total ignoring unevaluated rows and rounds the percentage', () => {
    const rows = [
      ...Array.from({ length: 7 }, () => ({ was_accurate: true })),
      ...Array.from({ length: 3 }, () => ({ was_accurate: false })),
      { was_accurate: null },
    ];
    expect(buildPredictionAccuracy(rows, 10)).toEqual({ hits: 7, total: 10, pct: 70 });
  });

  it('returns null below the minimum sample', () => {
    expect(buildPredictionAccuracy([{ was_accurate: true }], 10)).toBeNull();
    expect(buildPredictionAccuracy([], 10)).toBeNull();
  });
});

describe('sampleRandom', () => {
  it('is a uniform-shuffle sample under an injected RNG, capped at pool size', () => {
    const items = ['a', 'b', 'c', 'd'];
    // random() = 0 → every swap picks the current index → original order.
    expect(sampleRandom(items, 2, () => 0)).toEqual(['a', 'b']);
    // random() close to 1 → always swaps with the current end of the pool:
    // first pick 'd' (end), which parks 'a' at the end for the second pick.
    expect(sampleRandom(items, 2, () => 0.999)).toEqual(['d', 'a']);
    expect(sampleRandom(items, 10, () => 0)).toEqual(['a', 'b', 'c', 'd']);
    // Input stays untouched.
    expect(items).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('preferWithNextSlot', () => {
  it('moves candidates with a known next slot to the front, keeps order, caps', () => {
    const candidates = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
    expect(
      preferWithNextSlot(candidates, new Set(['b', 'd']), 3).map((c) => c.id),
    ).toEqual(['b', 'd', 'a']);
    expect(preferWithNextSlot(candidates, new Set(), 2).map((c) => c.id)).toEqual([
      'a',
      'b',
    ]);
  });
});

describe('rankWeekStreamed', () => {
  const since = new Date('2026-07-20T00:00:00.000Z');
  const now = new Date('2026-07-27T00:00:00.000Z');
  const row = (streamerId: string, start: string, end: string | null) => ({
    streamer_id: streamerId,
    started_at: start,
    ended_at: end,
  });

  it('merges simulcast/split-VOD rows into sessions and ranks by hours', () => {
    const ranked = rankWeekStreamed(
      [
        // s1: a simulcast (two identical rows) + a split VOD 10 min later —
        // ONE session of 3h10m, not three.
        row('s1', '2026-07-21T18:00:00.000Z', '2026-07-21T20:00:00.000Z'),
        row('s1', '2026-07-21T18:00:00.000Z', '2026-07-21T20:00:00.000Z'),
        row('s1', '2026-07-21T20:10:00.000Z', '2026-07-21T21:10:00.000Z'),
        // s2: two separate evenings, 2h each = 4h total, 2 sessions.
        row('s2', '2026-07-22T18:00:00.000Z', '2026-07-22T20:00:00.000Z'),
        row('s2', '2026-07-23T18:00:00.000Z', '2026-07-23T20:00:00.000Z'),
      ],
      since,
      now,
    );
    expect(ranked).toEqual([
      { streamerId: 's2', hours: 4, sessions: 2 },
      { streamerId: 's1', hours: 3 + 10 / 60, sessions: 1 },
    ]);
  });

  it('clamps to the window, drops broken rows, applies the top cap', () => {
    const ranked = rankWeekStreamed(
      [
        // Started before the window: only the in-window half counts.
        row('s1', '2026-07-19T22:00:00.000Z', '2026-07-20T02:00:00.000Z'),
        row('s2', '2026-07-21T18:00:00.000Z', '2026-07-21T19:00:00.000Z'),
        row('s3', '2026-07-21T18:00:00.000Z', '2026-07-21T18:30:00.000Z'),
        // Broken rows never rank.
        row('s4', '2026-07-21T18:00:00.000Z', null),
        row('s5', 'not-a-date', '2026-07-21T19:00:00.000Z'),
        row('s6', '2026-07-21T19:00:00.000Z', '2026-07-21T18:00:00.000Z'),
      ],
      since,
      now,
      2,
    );
    expect(ranked).toEqual([
      { streamerId: 's1', hours: 2, sessions: 1 },
      { streamerId: 's2', hours: 1, sessions: 1 },
    ]);
  });
});

describe('reliabilityHits', () => {
  it('rounds the rate into a hit count and clamps to the sample', () => {
    expect(reliabilityHits(1, 5)).toBe(5);
    expect(reliabilityHits(0.75, 20)).toBe(15);
    expect(reliabilityHits(0.999, 5)).toBe(5);
    expect(reliabilityHits(0, 5)).toBe(0);
  });
});
