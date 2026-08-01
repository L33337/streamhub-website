import { describe, it, expect } from 'vitest';
import type { PublicStreamSlot } from '@/lib/server/partner-api';
import {
  ALWAYS_ON_DURATION_SENTINEL,
  buildLiveFilterItems,
  computeVisibleLiveIds,
  countLiveFilterOptions,
  formatLiveRuntime,
  liveRuntime,
  liveWatchUrl,
  matchesLiveFilters,
  normalizeSlotLanguage,
  pickBiggestLiveSlots,
  splitLiveSlots,
  LIVE_RAIL_DEFAULT_VISIBLE,
  LIVE_RAIL_POOL_MAX,
  LIVE_RAIL_SSR_COUNT,
} from '../live-rail';
import { liveRuntimeLexFor, LIVE_RUNTIME_STRINGS } from '@/lib/i18n/live-runtime';
import { UI_LANGS } from '@/lib/i18n-core';

const NOW = new Date('2026-07-28T12:00:00Z');

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
    start_time: '2026-07-28T09:00:00Z',
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

describe('pickBiggestLiveSlots', () => {
  it('ranks by viewer count and keeps one slot per streamer', () => {
    const picked = pickBiggestLiveSlots(
      [
        slot({ id: 'a', streamer_id: 's1', viewer_count: 10 }),
        slot({ id: 'b', streamer_id: 's2', viewer_count: 500 }),
        // Simulcast twin of the winner — must not appear a second time.
        slot({ id: 'c', streamer_id: 's2', viewer_count: 40 }),
        slot({ id: 'd', streamer_id: 's3', viewer_count: 90 }),
      ],
      LIVE_RAIL_POOL_MAX,
    );
    expect(picked.map((s) => s.id)).toEqual(['b', 'd', 'a']);
  });

  // The rail renders the pool and hides the tail, so the cap must clear the
  // live roster with room to spare — a cap at the visible cut would put us
  // back where this change started.
  it('caps well above the unfiltered cut', () => {
    expect(LIVE_RAIL_POOL_MAX).toBeGreaterThan(LIVE_RAIL_DEFAULT_VISIBLE * 4);
  });

  it('drops non-live rows and applies the cap', () => {
    const picked = pickBiggestLiveSlots(
      [
        slot({ id: 'a', streamer_id: 's1', viewer_count: 10 }),
        slot({ id: 'b', streamer_id: 's2', viewer_count: 20, status: 'upcoming' }),
        slot({ id: 'c', streamer_id: 's3', viewer_count: 30 }),
        slot({ id: 'd', streamer_id: 's4', viewer_count: 40 }),
        slot({ id: 'e', streamer_id: 's5', viewer_count: 50 }),
        slot({ id: 'f', streamer_id: 's6', viewer_count: 60 }),
      ],
      2,
    );
    expect(picked.map((s) => s.id)).toEqual(['f', 'e']);
  });

  // The zombie guard: production carried two slots stuck on status='live' for
  // 6 and 12 days, never re-sampled. They must not reach a "biggest" rail.
  it('excludes never-sampled zombie slots while enough sampled ones exist', () => {
    const picked = pickBiggestLiveSlots(
      [
        slot({ id: 'zombie', streamer_id: 'z', viewer_count: null }),
        slot({ id: 'a', streamer_id: 's1', viewer_count: 10 }),
        slot({ id: 'b', streamer_id: 's2', viewer_count: 20 }),
        slot({ id: 'c', streamer_id: 's3', viewer_count: 30 }),
        slot({ id: 'd', streamer_id: 's4', viewer_count: 40 }),
      ],
      LIVE_RAIL_POOL_MAX,
    );
    expect(picked.map((s) => s.id)).toEqual(['d', 'c', 'b', 'a']);
  });

  it('falls back to unsampled slots when the viewer sampler is degraded', () => {
    const picked = pickBiggestLiveSlots(
      [
        slot({ id: 'a', streamer_id: 's1', viewer_count: null }),
        slot({ id: 'b', streamer_id: 's2', viewer_count: 5 }),
        slot({ id: 'c', streamer_id: 's3', viewer_count: null }),
      ],
      LIVE_RAIL_POOL_MAX,
    );
    // Sampled pool (1) is below the floor, so nothing is thrown away; the
    // sampled slot still sorts first.
    expect(picked.map((s) => s.id)).toEqual(['b', 'a', 'c']);
  });

  it('treats an absent viewer_count (older API deployment) like null', () => {
    const withoutField = slot({ id: 'a', streamer_id: 's1' });
    delete (withoutField as { viewer_count?: number | null }).viewer_count;
    const picked = pickBiggestLiveSlots([withoutField], LIVE_RAIL_POOL_MAX);
    expect(picked.map((s) => s.id)).toEqual(['a']);
  });
});

describe('liveWatchUrl', () => {
  it('links to the Twitch channel', () => {
    expect(liveWatchUrl(slot())).toBe('https://twitch.tv/streamerone');
  });

  it('deep-links YouTube to /live so the running stream opens, not the channel', () => {
    expect(
      liveWatchUrl(
        slot({
          platforms: ['youtube'],
          twitch_login: null,
          youtube_channel_id: 'UC123',
        }),
      ),
    ).toBe('https://youtube.com/channel/UC123/live');
  });

  it('prefers Twitch on a simulcast — its viewer count is what ranked the card', () => {
    expect(
      liveWatchUrl(
        slot({ platforms: ['twitch', 'youtube'], youtube_channel_id: 'UC123' }),
      ),
    ).toBe('https://twitch.tv/streamerone');
  });

  it('ignores a channel id for a platform the slot is not live on', () => {
    expect(
      liveWatchUrl(
        slot({ platforms: ['youtube'], youtube_channel_id: null }),
      ),
    ).toBeNull();
  });

  it('returns null without any usable channel id, so the caller can fall back', () => {
    expect(liveWatchUrl(slot({ twitch_login: null }))).toBeNull();
  });
});

describe('liveRuntime', () => {
  it('reports the remaining estimate, rounded to 5 minutes below three hours', () => {
    // Started 09:00, 240 min estimate -> ends 13:00 -> 60 min left.
    expect(liveRuntime(slot(), NOW)).toEqual({
      kind: 'remaining',
      hours: 1,
      minutes: 0,
    });
    // Started 09:23, 240 min estimate -> ends 13:23 -> 83 min left -> 1 h 25 min.
    expect(
      liveRuntime(slot({ start_time: '2026-07-28T09:23:00Z' }), NOW),
    ).toEqual({ kind: 'remaining', hours: 1, minutes: 25 });
  });

  it('rounds to whole hours beyond three hours (the estimate is not that precise)', () => {
    expect(
      liveRuntime(
        slot({ start_time: '2026-07-28T11:00:00Z', duration_minutes: 463 }),
        NOW,
      ),
    ).toEqual({ kind: 'remaining', hours: 7, minutes: 0 });
  });

  it('never rounds a positive remainder down to zero', () => {
    expect(
      liveRuntime(
        slot({ start_time: '2026-07-28T11:59:00Z', duration_minutes: 2 }),
        NOW,
      ),
    ).toEqual({ kind: 'remaining', hours: 0, minutes: 5 });
  });

  it('promotes a 59-minute remainder to "1 h" instead of "60 min"', () => {
    expect(
      liveRuntime(
        slot({ start_time: '2026-07-28T11:00:00Z', duration_minutes: 118 }),
        NOW,
      ),
    ).toEqual({ kind: 'remaining', hours: 1, minutes: 0 });
  });

  it('reports overrun once the estimate has lapsed', () => {
    expect(
      liveRuntime(
        slot({ start_time: '2026-07-28T03:00:00Z', duration_minutes: 240 }),
        NOW,
      ),
    ).toEqual({ kind: 'overrun' });
  });

  it('treats the always-on flag and the duration sentinel as 24/7', () => {
    expect(liveRuntime(slot({ is_always_on: true }), NOW)).toEqual({
      kind: 'alwaysOn',
    });
    // Sentinel without the flag — an 8760-hour countdown must never render.
    expect(
      liveRuntime(
        slot({ duration_minutes: ALWAYS_ON_DURATION_SENTINEL }),
        NOW,
      ),
    ).toEqual({ kind: 'alwaysOn' });
  });

  it('falls back to elapsed time when there is no usable estimate', () => {
    expect(
      liveRuntime(
        slot({ start_time: '2026-07-28T09:00:00Z', duration_minutes: 0 }),
        NOW,
      ),
    ).toEqual({ kind: 'elapsed', hours: 3, minutes: 0 });
  });

  it('says nothing on unparseable or future starts', () => {
    expect(liveRuntime(slot({ start_time: 'not-a-date' }), NOW)).toEqual({
      kind: 'unknown',
    });
    expect(
      liveRuntime(slot({ start_time: '2026-07-28T13:00:00Z' }), NOW),
    ).toEqual({ kind: 'unknown' });
    expect(
      liveRuntime(
        slot({ start_time: '2026-07-28T11:59:40Z', duration_minutes: 0 }),
        NOW,
      ),
    ).toEqual({ kind: 'unknown' });
  });
});

describe('formatLiveRuntime', () => {
  const en = liveRuntimeLexFor('en');

  it('renders each kind, and nothing for always-on / unknown', () => {
    expect(formatLiveRuntime({ kind: 'remaining', hours: 2, minutes: 15 }, en)).toBe(
      '~2 h 15 min left',
    );
    expect(formatLiveRuntime({ kind: 'remaining', hours: 3, minutes: 0 }, en)).toBe(
      '~3 h left',
    );
    expect(formatLiveRuntime({ kind: 'remaining', hours: 0, minutes: 45 }, en)).toBe(
      '~45 min left',
    );
    expect(formatLiveRuntime({ kind: 'overrun' }, en)).toBe('Longer than expected');
    expect(formatLiveRuntime({ kind: 'elapsed', hours: 3, minutes: 0 }, en)).toBe(
      'Live for 3 h',
    );
    expect(formatLiveRuntime({ kind: 'alwaysOn' }, en)).toBeNull();
    expect(formatLiveRuntime({ kind: 'unknown' }, en)).toBeNull();
  });

  it('has a non-empty, number-carrying label in every UI language', () => {
    for (const lang of UI_LANGS) {
      const lex = liveRuntimeLexFor(lang);
      expect(lex.remaining(2, 15), lang).toContain('2');
      expect(lex.remaining(2, 15), lang).toContain('15');
      expect(lex.remaining(0, 45), lang).toContain('45');
      // "3 h" must not leak a stray "0 min" when minutes round away.
      expect(lex.remaining(3, 0), lang).not.toMatch(/\b0\b/);
      expect(lex.elapsed(3, 0), lang).not.toMatch(/\b0\b/);
      expect(lex.overrun.length, lang).toBeGreaterThan(0);
      expect(lex.estimateNote.length, lang).toBeGreaterThan(0);
    }
  });

  it('covers exactly the UI languages', () => {
    expect(Object.keys(LIVE_RUNTIME_STRINGS).sort()).toEqual([...UI_LANGS].sort());
  });
});

describe('normalizeSlotLanguage', () => {
  it('lowercases and drops the region subtag', () => {
    expect(normalizeSlotLanguage({ streamer_language: 'DE' })).toBe('de');
    expect(normalizeSlotLanguage({ streamer_language: 'pt-BR' })).toBe('pt');
  });

  it('returns null for unknown languages (YouTube-only channels)', () => {
    expect(normalizeSlotLanguage({ streamer_language: null })).toBeNull();
    expect(normalizeSlotLanguage({ streamer_language: undefined })).toBeNull();
    expect(normalizeSlotLanguage({ streamer_language: '  ' })).toBeNull();
  });

  it('keeps Twitch specials as their own bucket', () => {
    expect(normalizeSlotLanguage({ streamer_language: 'other' })).toBe('other');
    expect(normalizeSlotLanguage({ streamer_language: 'asl' })).toBe('asl');
  });
});

describe('buildLiveFilterItems', () => {
  const upper = (code: string) => code.toUpperCase();

  it('normalizes the language and resolves its display label', () => {
    const items = buildLiveFilterItems(
      [slot({ id: '1', category: 'VALORANT', streamer_language: 'pt-BR' })],
      upper,
    );
    expect(items).toEqual([
      { id: '1', category: 'VALORANT', language: 'pt', languageLabel: 'PT' },
    ]);
  });

  it('blanks a missing category/language instead of inventing a bucket', () => {
    const items = buildLiveFilterItems(
      [slot({ id: '1', category: '   ', streamer_language: null })],
      upper,
    );
    expect(items).toEqual([
      { id: '1', category: '', language: '', languageLabel: '' },
    ]);
  });
});

describe('matchesLiveFilters', () => {
  const item = {
    id: '1',
    category: 'VALORANT',
    language: 'de',
    languageLabel: 'German',
  };

  it('matches everything with an empty selection', () => {
    expect(matchesLiveFilters(item, '', '')).toBe(true);
  });

  it('requires both dimensions when both are selected', () => {
    expect(matchesLiveFilters(item, 'VALORANT', 'de')).toBe(true);
    expect(matchesLiveFilters(item, 'VALORANT', 'en')).toBe(false);
    expect(matchesLiveFilters(item, 'Dota 2', 'de')).toBe(false);
  });

  it('never matches a blank-metadata item through a filter', () => {
    const blank = { id: '2', category: '', language: '', languageLabel: '' };
    expect(matchesLiveFilters(blank, '', '')).toBe(true);
    expect(matchesLiveFilters(blank, 'VALORANT', '')).toBe(false);
    expect(matchesLiveFilters(blank, '', 'de')).toBe(false);
  });
});

describe('countLiveFilterOptions', () => {
  const items = buildLiveFilterItems(
    [
      slot({ id: '1', category: 'Just Chatting', streamer_language: 'en' }),
      slot({ id: '2', category: 'Just Chatting', streamer_language: 'de' }),
      slot({ id: '3', category: 'VALORANT', streamer_language: 'de' }),
      slot({ id: '4', category: 'VALORANT', streamer_language: 'DE' }),
      slot({ id: '5', category: 'Dota 2', streamer_language: 'ja' }),
      slot({ id: '6', category: null, streamer_language: null }),
    ],
    (code) => code.toUpperCase(),
  );

  it('counts by count desc then label, ignoring blank metadata', () => {
    expect(countLiveFilterOptions(items, 'category')).toEqual([
      { value: 'Just Chatting', label: 'Just Chatting', count: 2 },
      { value: 'VALORANT', label: 'VALORANT', count: 2 },
      { value: 'Dota 2', label: 'Dota 2', count: 1 },
    ]);
    expect(countLiveFilterOptions(items, 'language')).toEqual([
      { value: 'de', label: 'DE', count: 3 },
      { value: 'en', label: 'EN', count: 1 },
      { value: 'ja', label: 'JA', count: 1 },
    ]);
  });

  // The cross-filtering contract: counts describe the pool the OTHER dropdown
  // already narrowed, so no option can ever lead to an empty rail.
  it('never offers an option with a zero result over a narrowed pool', () => {
    const german = items.filter((item) => matchesLiveFilters(item, '', 'de'));
    const options = countLiveFilterOptions(german, 'category');
    expect(options).toEqual([
      { value: 'VALORANT', label: 'VALORANT', count: 2 },
      { value: 'Just Chatting', label: 'Just Chatting', count: 1 },
    ]);
    for (const option of options) {
      expect(
        german.filter((item) => matchesLiveFilters(item, option.value, 'de')),
      ).toHaveLength(option.count);
    }
  });

  // Options are counted over the whole rendered pool, not over the visible
  // cut — that is what gives the smaller languages an entry at all. Before
  // 2026-07-29 a language whose streams all ranked below the cut simply had
  // no option (pt/it/pl in production).
  it('offers a language that exists only below the default cut', () => {
    const deep = buildLiveFilterItems(
      Array.from({ length: 35 }, (_, index) =>
        slot({
          id: `s${index}`,
          streamer_id: `streamer-${index}`,
          streamer_language: index === 33 ? 'pl' : 'en',
        }),
      ),
      (code) => code.toUpperCase(),
    );
    expect(countLiveFilterOptions(deep, 'language')).toContainEqual({
      value: 'pl',
      label: 'PL',
      count: 1,
    });
  });
});

describe('computeVisibleLiveIds', () => {
  const items = buildLiveFilterItems(
    [
      slot({ id: 'a', category: 'VALORANT', streamer_language: 'en' }),
      slot({ id: 'b', category: 'Just Chatting', streamer_language: 'de' }),
      slot({ id: 'c', category: null, streamer_language: null }),
      // Ranked below a cut of 3 — unreachable in the old DOM-toggling rail.
      slot({ id: 'd', category: 'VALORANT', streamer_language: 'de' }),
      slot({ id: 'e', category: 'VALORANT', streamer_language: 'ja' }),
    ],
    (code) => code.toUpperCase(),
  );

  it('shows the top cut when nothing is selected', () => {
    expect(computeVisibleLiveIds(items, '', '', 3)).toEqual(
      new Set(['a', 'b', 'c']),
    );
  });

  it('shows everything when the pool is smaller than the cut', () => {
    expect(computeVisibleLiveIds(items, '', '', 30)).toEqual(
      new Set(['a', 'b', 'c', 'd', 'e']),
    );
  });

  // The whole point of the change: a filter reaches past the cut, and drops
  // non-matching cards that were inside it.
  it('reaches below the cut and drops non-matches above it', () => {
    const visible = computeVisibleLiveIds(items, '', 'de', 3);
    expect(visible).toEqual(new Set(['b', 'd']));
  });

  it('intersects both dimensions, uncapped', () => {
    expect(computeVisibleLiveIds(items, 'VALORANT', 'de', 1)).toEqual(
      new Set(['d']),
    );
  });

  it('returns nothing when a selection matches nothing', () => {
    expect(computeVisibleLiveIds(items, 'Dota 2', '', 3)).toEqual(new Set());
  });

  it('keeps a blank-metadata card in the cut but never in a filter', () => {
    expect(computeVisibleLiveIds(items, '', '', 3)).toContain('c');
    expect(computeVisibleLiveIds(items, '', 'de', 3)).not.toContain('c');
    expect(computeVisibleLiveIds(items, 'VALORANT', '', 5)).not.toContain('c');
  });
});

describe('splitLiveSlots', () => {
  const pool = Array.from({ length: 90 }, (_, i) => ({ id: `s${i}` }));

  it('splits the pool into a head and a tail without losing or reordering', () => {
    const { ssr, deferred } = splitLiveSlots(pool);
    expect(ssr).toHaveLength(LIVE_RAIL_SSR_COUNT);
    expect([...ssr, ...deferred]).toEqual(pool);
  });

  // Load-bearing: the unfiltered rail is `computeVisibleLiveIds` over an empty
  // selection, i.e. the first LIVE_RAIL_DEFAULT_VISIBLE ids. If the SSR head
  // were shorter, part of the resting state would depend on client rendering —
  // a gap for crawlers and JS-less browsers.
  it('server-renders at least the whole unfiltered cut', () => {
    expect(LIVE_RAIL_SSR_COUNT).toBeGreaterThanOrEqual(LIVE_RAIL_DEFAULT_VISIBLE);
    const { ssr } = splitLiveSlots(pool);
    const items = ssr.map((s) => ({
      id: s.id,
      category: '',
      language: '',
      languageLabel: '',
    }));
    const restingIds = computeVisibleLiveIds(
      pool.map((s) => ({ id: s.id, category: '', language: '', languageLabel: '' })),
      '',
      '',
      LIVE_RAIL_DEFAULT_VISIBLE,
    );
    // Every card visible at rest is one the SERVER rendered.
    const ssrIds = new Set(items.map((i) => i.id));
    for (const id of restingIds) expect(ssrIds).toContain(id);
  });

  it('never lets a caller undercut the visible cut', () => {
    const { ssr } = splitLiveSlots(pool, 3);
    expect(ssr).toHaveLength(LIVE_RAIL_DEFAULT_VISIBLE);
  });

  it('leaves nothing deferred when the sweep fits in the head', () => {
    const { ssr, deferred } = splitLiveSlots(pool.slice(0, 5));
    expect(ssr).toHaveLength(5);
    expect(deferred).toEqual([]);
  });
});
