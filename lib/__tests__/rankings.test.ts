import { describe, expect, it } from 'vitest';
import type { PublicRankingEntry, PublicStreamer } from '@/lib/server/partner-api';
import {
  buildRankingItemListJsonLd,
  formatDeviation,
  formatDurationMinutes,
  formatHitRate,
  formatHours,
  formatRefreshedAt,
  getRankingPageSpec,
  hasMissingValues,
  isRankingIndexable,
  MIN_INDEXABLE_RANKING_ENTRIES,
  RANKING_PAGES,
  sanitizeRankingEntries,
} from '@/lib/rankings';

function streamer(overrides: Partial<PublicStreamer> = {}): PublicStreamer {
  return {
    id: 'examplestreamer',
    name: 'ExampleStreamer',
    platforms: ['twitch'],
    avatar_url: null,
    is_featured: false,
    timezone: null,
    language: 'en',
    is_always_on: false,
    avg_view_count: 1200,
    follower_count: 50_000,
    follower_count_updated_at: null,
    updated_at: '2026-07-17T00:00:00Z',
    last_status_change_at: null,
    twitch_login: 'examplestreamer',
    youtube_channel_id: null,
    description: null,
    ...overrides,
  };
}

function entry(
  rank: number,
  values: PublicRankingEntry['values'],
  s: Partial<PublicStreamer> = {},
): PublicRankingEntry {
  return { rank, values, streamer: streamer({ id: `s${rank}`, name: `S ${rank}`, ...s }) };
}

describe('value formatters', () => {
  it('formatHours: 1 decimal, trailing .0 dropped, null-safe', () => {
    expect(formatHours(182.5)).toBe('182.5 h');
    expect(formatHours(100)).toBe('100 h');
    expect(formatHours(99.96)).toBe('100 h');
    expect(formatHours(null)).toBe('—');
  });

  it('formatHitRate: integer percent', () => {
    expect(formatHitRate(0.9167)).toBe('92%');
    expect(formatHitRate(1)).toBe('100%');
    expect(formatHitRate(undefined)).toBe('—');
  });

  it('formatDeviation: signed minutes, on-time zero, null-safe', () => {
    expect(formatDeviation(16)).toBe('+16 min');
    expect(formatDeviation(-3)).toBe('−3 min');
    expect(formatDeviation(0)).toBe('on time');
    expect(formatDeviation(null)).toBe('—');
  });

  it('formatDurationMinutes: h/m split', () => {
    expect(formatDurationMinutes(456)).toBe('7 h 36 m');
    expect(formatDurationMinutes(60)).toBe('1 h');
    expect(formatDurationMinutes(45)).toBe('45 m');
    expect(formatDurationMinutes(0)).toBe('—');
    expect(formatDurationMinutes(null)).toBe('—');
  });

  it('formatRefreshedAt: fixed en-US UTC date, null/invalid-safe', () => {
    expect(formatRefreshedAt('2026-07-18T04:15:00Z')).toBe('Jul 18, 2026');
    // UTC rendering: late-evening UTC stays on the same UTC day regardless of server TZ
    expect(formatRefreshedAt('2026-12-31T23:30:00Z')).toBe('Dec 31, 2026');
    expect(formatRefreshedAt(null)).toBeNull();
    expect(formatRefreshedAt(undefined)).toBeNull();
    expect(formatRefreshedAt('not-a-date')).toBeNull();
  });
});

describe('index gating', () => {
  it('flips exactly at the threshold', () => {
    expect(isRankingIndexable(MIN_INDEXABLE_RANKING_ENTRIES - 1)).toBe(false);
    expect(isRankingIndexable(MIN_INDEXABLE_RANKING_ENTRIES)).toBe(true);
    expect(isRankingIndexable(0)).toBe(false);
  });
});

describe('page registry', () => {
  it('exposes all four metrics with unique slugs', () => {
    expect(RANKING_PAGES).toHaveLength(4);
    const slugs = RANKING_PAGES.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(4);
    expect(getRankingPageSpec('most-followed')?.metric).toBe('most-followed');
    expect(getRankingPageSpec('bogus')).toBeNull();
  });

  it('most-followed title degrades honestly with entry count', () => {
    const spec = getRankingPageSpec('most-followed')!;
    expect(spec.buildTitle(100)).toContain('Top 100');
    expect(spec.buildTitle(150)).toContain('Top 100'); // capped at the fetch limit
    expect(spec.buildTitle(37)).toContain('Top 37');
    expect(spec.buildTitle(5)).not.toContain('Top');
  });

  it('most-active / most-reliable titles are count-free', () => {
    expect(getRankingPageSpec('most-active')!.buildTitle(100)).not.toContain('{n}');
    expect(getRankingPageSpec('most-active')!.buildTitle(3)).toContain('Most Active');
    expect(getRankingPageSpec('most-reliable')!.buildTitle(50)).toContain('Punctual');
  });

  it('descriptions embed the #1 entry when available and degrade without it', () => {
    const spec = getRankingPageSpec('most-followed')!;
    const top = entry(1, { follower_count: 24_400_000 }, { name: 'Stray Kids', platforms: ['youtube'] });
    expect(spec.buildDescription(top)).toContain('Stray Kids leads with 24.4M subscribers');
    expect(spec.buildDescription(undefined)).not.toContain('leads with');

    const watched = getRankingPageSpec('most-watched')!;
    expect(
      watched.buildDescription(entry(1, { avg_view_count: 316_371 }, { name: 'KaiCenat' })),
    ).toContain('KaiCenat leads with 316.4K average live viewers');
  });

  it('column formatters render a full most-active row', () => {
    const spec = getRankingPageSpec('most-active')!;
    const e = entry(1, {
      hours_streamed_28d: 182.5,
      streams_28d: 24,
      streams_per_week: 6,
      avg_stream_duration_minutes: 456,
    });
    expect(spec.columns.map((c) => c.format(e))).toEqual(['182.5 h', '6', '7 h 36 m']);
  });

  it('column formatters render a full most-reliable row', () => {
    const spec = getRankingPageSpec('most-reliable')!;
    const e = entry(1, {
      time_hit_rate: 0.9091,
      time_sample: 11,
      median_start_deviation_minutes: 16,
      no_show_count: 0,
      time_tier: 'reliable',
    });
    expect(spec.columns.map((c) => c.format(e))).toEqual(['91%', '+16 min', '11']);
  });

  it('every metric ships a non-empty FAQ block', () => {
    for (const spec of RANKING_PAGES) {
      expect(spec.faq.length).toBeGreaterThanOrEqual(3);
      for (const { q, a } of spec.faq) {
        expect(q.length).toBeGreaterThan(0);
        expect(a.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('hasMissingValues', () => {
  const spec = getRankingPageSpec('most-followed')!;

  it('true when any rendered cell is the em-dash placeholder', () => {
    const entries = [
      entry(1, { follower_count: 900 }),
      entry(2, { follower_count: 500 }, { avg_view_count: null }),
    ];
    expect(hasMissingValues(spec, entries)).toBe(true);
  });

  it('false when every cell has a value', () => {
    const entries = [entry(1, { follower_count: 900 })];
    expect(hasMissingValues(spec, entries)).toBe(false);
    expect(hasMissingValues(spec, [])).toBe(false);
  });
});

describe('sanitizeRankingEntries', () => {
  const spec = getRankingPageSpec('most-followed')!;

  it('drops rows without a positive primary value and re-ranks densely', () => {
    const entries = [
      entry(1, { follower_count: 900 }),
      entry(2, { follower_count: 0 }), // dropped
      entry(3, {}), // dropped (no value)
      entry(4, { follower_count: 500 }),
    ];
    const out = sanitizeRankingEntries(spec, entries);
    expect(out.map((e) => [e.rank, e.streamer.id])).toEqual([
      [1, 's1'],
      [2, 's4'],
    ]);
  });

  it('drops rows with a missing streamer', () => {
    const broken = { rank: 1, values: { follower_count: 10 }, streamer: null };
    const out = sanitizeRankingEntries(spec, [
      broken as unknown as PublicRankingEntry,
      entry(2, { follower_count: 5 }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].rank).toBe(1);
  });

  it('keeps already-clean input untouched', () => {
    const entries = [entry(1, { follower_count: 2 }), entry(2, { follower_count: 1 })];
    expect(sanitizeRankingEntries(spec, entries)).toEqual(entries);
  });
});

describe('buildRankingItemListJsonLd', () => {
  type LdItem = {
    position: number;
    item: {
      '@type': string;
      '@id': string;
      name: string;
      url: string;
      interactionStatistic?: { userInteractionCount: number };
    };
  };

  it('emits Person items positioned by rank with encoded streamer URLs', () => {
    const jsonLd = buildRankingItemListJsonLd('Most followed streamers', [
      entry(1, { follower_count: 10 }, { id: 'a b', name: 'A B' }),
      entry(2, { follower_count: 5 }),
    ]);
    expect(jsonLd['@type']).toBe('ItemList');
    expect(jsonLd.numberOfItems).toBe(2);
    const items = jsonLd.itemListElement as LdItem[];
    expect(items[0].position).toBe(1);
    expect(items[0].item['@type']).toBe('Person');
    expect(items[0].item.url).toBe('https://streamertimes.tv/streamer/a%20b');
    expect(items[1].position).toBe(2);
  });

  it('carries the streamer-page #person @id so entities merge across pages', () => {
    const jsonLd = buildRankingItemListJsonLd('Most followed streamers', [
      entry(1, { follower_count: 10 }, { id: 'a b' }),
    ]);
    const items = jsonLd.itemListElement as LdItem[];
    expect(items[0].item['@id']).toBe('https://streamertimes.tv/streamer/a%20b#person');
  });

  it('emits an InteractionCounter from values, falling back to the streamer DTO', () => {
    const jsonLd = buildRankingItemListJsonLd('x', [
      entry(1, { follower_count: 10 }),
      entry(2, { avg_view_count: 99 }, { follower_count: 7 }), // no values count → DTO fallback
      entry(3, { avg_view_count: 5 }, { follower_count: null }), // no count at all → omitted
    ]);
    const items = jsonLd.itemListElement as LdItem[];
    expect(items[0].item.interactionStatistic?.userInteractionCount).toBe(10);
    expect(items[1].item.interactionStatistic?.userInteractionCount).toBe(7);
    expect(items[2].item.interactionStatistic).toBeUndefined();
  });
});
