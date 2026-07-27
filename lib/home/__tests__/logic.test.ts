import { describe, it, expect } from 'vitest';
import type { PublicGame, PublicStreamSlot } from '@/lib/server/partner-api';
import {
  buildPredictionAccuracy,
  countStartingSoon,
  floorToHourIso,
  pickLiveRailSlots,
  reliabilityHits,
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

describe('reliabilityHits', () => {
  it('rounds the rate into a hit count and clamps to the sample', () => {
    expect(reliabilityHits(1, 5)).toBe(5);
    expect(reliabilityHits(0.75, 20)).toBe(15);
    expect(reliabilityHits(0.999, 5)).toBe(5);
    expect(reliabilityHits(0, 5)).toBe(0);
  });
});
