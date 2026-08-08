import { describe, it, expect } from 'vitest';
import type { PublicStreamSlot } from '@/lib/server/partner-api';
import {
  GAME_LIVE_POOL_MAX,
  GAME_LIVE_SSR_COUNT,
  GAME_LIVE_VISIBLE_CAP,
  hasLanguageChoice,
  rankGameLiveSlots,
  splitGameLiveSlots,
  toGameLiveCardSlot,
} from '../game-live';
import {
  buildLiveFilterItems,
  computeVisibleLiveIds,
  countLiveFilterOptions,
} from '@/lib/home/live-rail';

function slot(overrides: Partial<PublicStreamSlot> = {}): PublicStreamSlot {
  return {
    id: 'slot-1',
    streamer_id: 'streamer-1',
    streamer_name: 'Streamer One',
    platforms: ['twitch'],
    title: 'A stream',
    category: 'Minecraft',
    thumbnail_url: null,
    avatar_url: null,
    start_time: '2026-08-08T09:00:00Z',
    duration_minutes: 240,
    status: 'live',
    is_predicted: false,
    confidence: 'high',
    is_always_on: false,
    twitch_login: 'streamerone',
    youtube_channel_id: null,
    streamer_timezone: null,
    streamer_language: 'en',
    viewer_count: 100,
    ...overrides,
  };
}

const name = (code: string) => code.toUpperCase();

describe('rankGameLiveSlots', () => {
  it('ranks by current viewers, unsampled slots last', () => {
    const ranked = rankGameLiveSlots([
      slot({ id: 'a', viewer_count: 10 }),
      slot({ id: 'b', viewer_count: null }),
      slot({ id: 'c', viewer_count: 900 }),
    ]);
    expect(ranked.map((s) => s.id)).toEqual(['c', 'a', 'b']);
  });

  it('keeps simulcast twins — the fetch is category-scoped, unlike the rail', () => {
    const ranked = rankGameLiveSlots([
      slot({ id: 'a', streamer_id: 's1', viewer_count: 10 }),
      slot({ id: 'b', streamer_id: 's1', viewer_count: 20 }),
    ]);
    expect(ranked).toHaveLength(2);
  });

  it('caps the pool without mutating the input', () => {
    const input = Array.from({ length: GAME_LIVE_POOL_MAX + 5 }, (_, i) =>
      slot({ id: `s${i}`, viewer_count: i }),
    );
    const ranked = rankGameLiveSlots(input);
    expect(ranked).toHaveLength(GAME_LIVE_POOL_MAX);
    expect(input[0].id).toBe('s0');
  });
});

describe('splitGameLiveSlots', () => {
  it('splits at the SSR head and keeps the head a strict prefix', () => {
    const pool = Array.from({ length: 30 }, (_, i) => `s${i}`);
    const { ssr, deferred } = splitGameLiveSlots(pool);
    expect(ssr).toHaveLength(GAME_LIVE_SSR_COUNT);
    expect(deferred).toHaveLength(30 - GAME_LIVE_SSR_COUNT);
    expect([...ssr, ...deferred]).toEqual(pool);
  });

  it('never renders less than the resting cut', () => {
    const pool = Array.from({ length: 10 }, (_, i) => `s${i}`);
    const { ssr, deferred } = splitGameLiveSlots(pool, 1);
    expect(ssr).toHaveLength(GAME_LIVE_VISIBLE_CAP);
    expect(deferred).toHaveLength(10 - GAME_LIVE_VISIBLE_CAP);
  });

  it('leaves a short pool entirely server-rendered', () => {
    const { ssr, deferred } = splitGameLiveSlots(['a', 'b', 'c']);
    expect(ssr).toEqual(['a', 'b', 'c']);
    expect(deferred).toEqual([]);
  });
});

describe('hasLanguageChoice', () => {
  it('is false for a single-language category — one option is not a filter', () => {
    const items = buildLiveFilterItems(
      [slot({ id: 'a' }), slot({ id: 'b' })],
      name,
    );
    expect(hasLanguageChoice(items)).toBe(false);
  });

  it('is false when the only known language sits next to unknown ones', () => {
    const items = buildLiveFilterItems(
      [
        slot({ id: 'a', streamer_language: 'en' }),
        // YouTube-only channels never report a language — unknown, NOT English.
        slot({ id: 'b', streamer_language: null }),
      ],
      name,
    );
    expect(hasLanguageChoice(items)).toBe(false);
  });

  it('is true once two languages are live', () => {
    const items = buildLiveFilterItems(
      [
        slot({ id: 'a', streamer_language: 'en' }),
        slot({ id: 'b', streamer_language: 'de' }),
      ],
      name,
    );
    expect(hasLanguageChoice(items)).toBe(true);
  });

  it('collapses Twitch region subtags into one option', () => {
    const items = buildLiveFilterItems(
      [
        slot({ id: 'a', streamer_language: 'pt' }),
        slot({ id: 'b', streamer_language: 'pt-BR' }),
      ],
      name,
    );
    expect(hasLanguageChoice(items)).toBe(false);
    expect(countLiveFilterOptions(items, 'language')).toEqual([
      { value: 'pt', label: 'PT', count: 2 },
    ]);
  });
});

describe('the section’s visible cut', () => {
  const pool = [
    slot({ id: 'a', streamer_language: 'en', viewer_count: 900 }),
    slot({ id: 'b', streamer_language: 'en', viewer_count: 800 }),
    slot({ id: 'c', streamer_language: 'en', viewer_count: 700 }),
    slot({ id: 'd', streamer_language: 'en', viewer_count: 600 }),
    slot({ id: 'e', streamer_language: 'de', viewer_count: 500 }),
    slot({ id: 'f', streamer_language: null, viewer_count: 400 }),
  ];
  const items = buildLiveFilterItems(rankGameLiveSlots(pool), name);

  it('rests on the top cut by viewers', () => {
    const visible = computeVisibleLiveIds(items, '', '', GAME_LIVE_VISIBLE_CAP);
    expect([...visible]).toEqual(['a', 'b', 'c', 'd']);
  });

  it('reaches past the cut once a language is picked', () => {
    // 'e' ranks 5th and is invisible at rest — the whole reason the pool is
    // larger than the cut.
    const visible = computeVisibleLiveIds(items, '', 'de', GAME_LIVE_VISIBLE_CAP);
    expect([...visible]).toEqual(['e']);
  });

  it('shows unknown-language slots only under "All languages"', () => {
    const all = computeVisibleLiveIds(items, '', '', pool.length);
    expect(all.has('f')).toBe(true);
    for (const option of countLiveFilterOptions(items, 'language')) {
      expect(computeVisibleLiveIds(items, '', option.value, 99).has('f')).toBe(false);
    }
  });
});

describe('toGameLiveCardSlot', () => {
  it('keeps every field the card renders', () => {
    const pruned = toGameLiveCardSlot(slot());
    expect(pruned).toEqual({
      id: 'slot-1',
      streamer_name: 'Streamer One',
      title: 'A stream',
      category: 'Minecraft',
      platforms: ['twitch'],
      thumbnail_url: null,
      avatar_url: null,
      start_time: '2026-08-08T09:00:00Z',
      duration_minutes: 240,
      status: 'live',
      is_predicted: false,
      confidence: 'high',
      is_always_on: false,
      streamer_timezone: null,
      viewer_count: 100,
    });
  });

  it('drops the AI copy — live cards never render reasoning', () => {
    const pruned = toGameLiveCardSlot(
      slot({
        reasoning: 'a long predicted-stream explanation',
        generic_reasoning: 'the English template',
        copy_language: 'de',
      }),
    );
    expect(pruned).not.toHaveProperty('reasoning');
    expect(pruned).not.toHaveProperty('generic_reasoning');
    expect(pruned).not.toHaveProperty('copy_language');
  });

  it('omits an absent viewer sample instead of shipping null', () => {
    expect(toGameLiveCardSlot(slot({ viewer_count: null }))).not.toHaveProperty(
      'viewer_count',
    );
    expect(
      toGameLiveCardSlot(slot({ viewer_count: 0 })).viewer_count,
    ).toBe(0);
  });
});
