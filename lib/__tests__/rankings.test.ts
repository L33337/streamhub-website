import { describe, expect, it } from 'vitest';
import type { PublicRankingEntry, PublicStreamer } from '@/lib/server/partner-api';
import {
  buildRankingItemListJsonLd,
  filterPlatformEntries,
  formatDeviation,
  formatDurationMinutes,
  formatHitRate,
  formatHours,
  formatRefreshedAt,
  getPlatformVariant,
  getRankingPageSpec,
  hasMissingValues,
  isGameHubIndexable,
  isRankingIndexable,
  MIN_INDEXABLE_GAME_STREAMERS,
  MIN_INDEXABLE_RANKING_ENTRIES,
  monthYearLabel,
  PLATFORM_VARIANT_SLUGS,
  RANKING_PAGES,
  RANKING_PLATFORMS,
  rankTrend,
  sanitizeRankingEntries,
  formatGrowthPercent,
  formatSignedCompact,
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

describe('game hub index gating', () => {
  it('indexes at the streamer-count threshold without activity', () => {
    expect(
      isGameHubIndexable({
        streamerCount: MIN_INDEXABLE_GAME_STREAMERS,
        liveCount: 0,
        upcomingCount: 0,
      }),
    ).toBe(true);
    expect(
      isGameHubIndexable({
        streamerCount: MIN_INDEXABLE_GAME_STREAMERS - 1,
        liveCount: 0,
        upcomingCount: 0,
      }),
    ).toBe(false);
  });

  it('live or upcoming activity overrides a thin streamer count', () => {
    expect(
      isGameHubIndexable({ streamerCount: 3, liveCount: 1, upcomingCount: 0 }),
    ).toBe(true);
    expect(
      isGameHubIndexable({ streamerCount: 3, liveCount: 0, upcomingCount: 2 }),
    ).toBe(true);
    expect(
      isGameHubIndexable({ streamerCount: 0, liveCount: 0, upcomingCount: 0 }),
    ).toBe(false);
  });
});

describe('page registry', () => {
  it('exposes all five metrics with unique slugs', () => {
    expect(RANKING_PAGES).toHaveLength(5);
    const slugs = RANKING_PAGES.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(5);
    expect(getRankingPageSpec('most-followed')?.metric).toBe('most-followed');
    expect(getRankingPageSpec('fastest-growing')?.metric).toBe('fastest-growing');
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

  it('numbers a deeper page from startRank, not from 1', () => {
    // Regression: re-ranking page 2 to 1..n made RankingTable emit #rank-1…
    // while the streamer pages deep-link #rank-101…, so every deep link on a
    // page-2 rank pointed at a row that did not exist.
    const entries = [entry(101, { follower_count: 900 }), entry(102, { follower_count: 800 })];
    const out = sanitizeRankingEntries(spec, entries, 101);
    expect(out.map((e) => e.rank)).toEqual([101, 102]);
  });

  it('stays dense from startRank when a row in the middle is dropped', () => {
    const entries = [
      entry(101, { follower_count: 900 }),
      entry(102, { follower_count: 0 }), // dropped
      entry(103, { follower_count: 700 }),
    ];
    const out = sanitizeRankingEntries(spec, entries, 101);
    expect(out.map((e) => [e.rank, e.streamer.id])).toEqual([
      [101, 's101'],
      [102, 's103'],
    ]);
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

describe('rankTrend', () => {
  it('none while the API omits previous_rank (snapshot cold start)', () => {
    expect(rankTrend(entry(5, { follower_count: 10 }))).toEqual({ kind: 'none' });
  });

  it('new when previous_rank is explicitly null', () => {
    expect(rankTrend(entry(5, { follower_count: 10, previous_rank: null }))).toEqual({
      kind: 'new',
    });
  });

  it('up/down deltas from previous_rank vs rank', () => {
    expect(rankTrend(entry(3, { follower_count: 10, previous_rank: 7 }))).toEqual({
      kind: 'up',
      delta: 4,
    });
    expect(rankTrend(entry(7, { follower_count: 10, previous_rank: 3 }))).toEqual({
      kind: 'down',
      delta: 4,
    });
    expect(rankTrend(entry(3, { follower_count: 10, previous_rank: 3 }))).toEqual({
      kind: 'none',
    });
  });
});

describe('formatSignedCompact', () => {
  it('prefixes positive gains, compacted', () => {
    expect(formatSignedCompact(12400)).toBe('+12.4K');
    expect(formatSignedCompact(500)).toBe('+500');
  });

  it('renders a minus for defensive negative input', () => {
    expect(formatSignedCompact(-1200)).toBe('−1.2K');
  });

  it('dashes zero and missing values', () => {
    expect(formatSignedCompact(0)).toBe('—');
    expect(formatSignedCompact(null)).toBe('—');
    expect(formatSignedCompact(undefined)).toBe('—');
    expect(formatSignedCompact(NaN)).toBe('—');
  });
});

describe('formatGrowthPercent', () => {
  it('one decimal below 100, trailing .0 dropped', () => {
    expect(formatGrowthPercent(3.25)).toBe('+3.3%');
    expect(formatGrowthPercent(3)).toBe('+3%');
    expect(formatGrowthPercent(0.04)).toBe('+0%');
  });

  it('whole percent from 100 up', () => {
    expect(formatGrowthPercent(2900)).toBe('+2900%');
    expect(formatGrowthPercent(100.4)).toBe('+100%');
  });

  it('dashes missing values and signs negatives', () => {
    expect(formatGrowthPercent(null)).toBe('—');
    expect(formatGrowthPercent(undefined)).toBe('—');
    expect(formatGrowthPercent(-12.34)).toBe('−12.3%');
  });
});

describe('fastest-growing spec', () => {
  const spec = getRankingPageSpec('fastest-growing')!;

  const growthEntry = (id: string, gain: number | undefined): PublicRankingEntry => ({
    rank: 1,
    values: {
      follower_gain_7d: gain,
      follower_growth_percent_7d: gain != null ? 5 : undefined,
      follower_count: 100000,
    },
    streamer: streamer({ id, name: id }),
  });

  it('title degrades honestly with entry count', () => {
    expect(spec.buildTitle(100)).toContain('Top 100');
    expect(spec.buildTitle(12)).toContain('Top 12');
    expect(spec.buildTitle(3)).not.toContain('Top');
  });

  it('columns format gain, percent and current followers', () => {
    const entry = growthEntry('a', 5000);
    expect(spec.columns[0].format(entry)).toBe('+5K');
    expect(spec.columns[1].format(entry)).toBe('+5%');
    expect(spec.columns[2].format(entry)).toBe('100K');
  });

  it('sanitize drops entries without a positive gain', () => {
    const out = sanitizeRankingEntries(spec, [
      growthEntry('a', 5000),
      growthEntry('b', 0),
      growthEntry('c', undefined),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].streamer.id).toBe('a');
    expect(out[0].rank).toBe(1);
  });

  it('description embeds the leader gain when available', () => {
    expect(spec.buildDescription(growthEntry('kai', 250000))).toContain('gained 250K');
    expect(spec.buildDescription(undefined)).toContain('fastest growing livestreamers');
  });
});

describe('monthYearLabel', () => {
  const AUG = new Date('2026-08-11T12:00:00Z');

  it('renders localized month + year in UTC', () => {
    expect(monthYearLabel('en', AUG)).toBe('August 2026');
    expect(monthYearLabel('de', AUG)).toBe('August 2026');
    expect(monthYearLabel('es', AUG)).toBe('agosto de 2026');
    expect(monthYearLabel('ja', AUG)).toBe('2026年8月');
  });

  it('stays on the UTC month at the boundary regardless of server TZ', () => {
    expect(monthYearLabel('en', new Date('2026-08-31T23:30:00Z'))).toBe('August 2026');
    expect(monthYearLabel('en', new Date('2026-09-01T00:30:00Z'))).toBe('September 2026');
  });

  it('falls back to en-US for a broken locale tag', () => {
    expect(monthYearLabel('no-such-locale-!!', AUG)).toBe('August 2026');
  });
});

describe('platform variants', () => {
  it('exist for exactly the four mixed-platform metrics', () => {
    expect(PLATFORM_VARIANT_SLUGS).toEqual([
      'most-followed',
      'fastest-growing',
      'most-watched',
      'most-active',
    ]);
    for (const slug of PLATFORM_VARIANT_SLUGS) {
      for (const platform of RANKING_PLATFORMS) {
        expect(getPlatformVariant(slug, platform), `${slug}/${platform}`).not.toBeNull();
      }
    }
  });

  it('rejects most-reliable, unknown metrics and unknown platforms', () => {
    expect(getPlatformVariant('most-reliable', 'twitch')).toBeNull();
    expect(getPlatformVariant('most-reliable', 'youtube')).toBeNull();
    expect(getPlatformVariant('bogus', 'twitch')).toBeNull();
    expect(getPlatformVariant('most-followed', 'kick')).toBeNull();
    expect(getPlatformVariant('most-followed', '2')).toBeNull();
  });

  it('twitch membership includes simulcasters, youtube is YouTube-first only', () => {
    const twitch = getPlatformVariant('most-followed', 'twitch')!;
    const youtube = getPlatformVariant('most-followed', 'youtube')!;
    const dual = entry(1, { follower_count: 10 }, { platforms: ['twitch', 'youtube'] });
    const twitchOnly = entry(2, { follower_count: 9 }, { platforms: ['twitch'] });
    const youtubeOnly = entry(3, { follower_count: 8 }, { platforms: ['youtube'] });
    expect(twitch.matches(dual)).toBe(true);
    expect(twitch.matches(twitchOnly)).toBe(true);
    expect(twitch.matches(youtubeOnly)).toBe(false);
    // follower_count is the Twitch count for dual-platform streamers — they
    // must NOT appear under a "Subscribers" header.
    expect(youtube.matches(dual)).toBe(false);
    expect(youtube.matches(youtubeOnly)).toBe(true);
  });

  it('relabels follower headers to subscribers on the YouTube variants', () => {
    expect(
      getPlatformVariant('most-followed', 'youtube')!.columns.map((c) => c.header),
    ).toEqual(['Subscribers', 'Avg viewers']);
    expect(
      getPlatformVariant('fastest-growing', 'youtube')!.columns.map((c) => c.header),
    ).toEqual(['Gained (7d)', 'Growth', 'Subscribers now']);
    // Twitch variants keep the registry columns untouched.
    expect(getPlatformVariant('most-followed', 'twitch')!.columns).toBe(
      getRankingPageSpec('most-followed')!.columns,
    );
  });

  it('titles carry the platform and degrade honestly with entry count', () => {
    const v = getPlatformVariant('most-followed', 'twitch')!;
    expect(v.buildTitle(100)).toBe('Top 100 Most Followed Twitch Streamers');
    expect(v.buildTitle(37)).toBe('Top 37 Most Followed Twitch Streamers');
    expect(v.buildTitle(5)).toBe('Most Followed Twitch Streamers — Follower Stats');
  });

  it('descriptions use the platform noun for the leader clause', () => {
    const yt = getPlatformVariant('most-followed', 'youtube')!;
    expect(
      yt.buildDescription(entry(1, { follower_count: 24_400_000 }, { name: 'Stray Kids' })),
    ).toContain('Stray Kids leads with 24.4M subscribers');
    expect(yt.buildDescription(undefined)).toContain('most subscribed live streamers');
  });

  it('every variant ships intro, methodology and a platform-inclusion FAQ', () => {
    for (const slug of PLATFORM_VARIANT_SLUGS) {
      for (const platform of RANKING_PLATFORMS) {
        const v = getPlatformVariant(slug, platform)!;
        expect(v.h1.toLowerCase()).toContain(platform === 'twitch' ? 'twitch' : 'youtube');
        expect(v.buildIntro(42).length).toBeGreaterThan(0);
        expect(v.methodologyNote.length).toBeGreaterThan(0);
        expect(v.faq.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('filterPlatformEntries re-ranks densely from 1 and caps at the limit', () => {
    const v = getPlatformVariant('most-followed', 'twitch')!;
    const pool = [
      entry(1, { follower_count: 100 }, { platforms: ['youtube'] }), // filtered out
      entry(2, { follower_count: 90 }, { platforms: ['twitch'] }),
      entry(3, { follower_count: 80 }, { platforms: ['twitch', 'youtube'] }),
      entry(4, { follower_count: 70 }, { platforms: ['twitch'] }),
    ];
    const out = filterPlatformEntries(v, pool);
    expect(out.map((e) => [e.rank, e.streamer.id])).toEqual([
      [1, 's2'],
      [2, 's3'],
      [3, 's4'],
    ]);
    expect(filterPlatformEntries(v, pool, 2)).toHaveLength(2);
  });
});
