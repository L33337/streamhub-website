import { describe, it, expect } from 'vitest';
import type {
  PublicGame,
  PublicGamePlacement,
  PublicRecapListItem,
  PublicStreamerStats,
  PublicStreamerStatsCategory,
  StreamerInsights,
  WikiFact,
  WikiHistoryEntry,
} from '../server/partner-api';
import {
  formatHistoryMonth,
  formatHours,
  formatSignedInt,
  formatTimelineDate,
  formatWholeNumber,
  formatWikiShortDate,
  groupHistoryByYear,
  historyParagraph,
  incomeFact,
  joinTitleParts,
  laterIso,
  latestHistoryIso,
  weekdayShortLabels,
  wikiGamesTable,
  wikiHistory,
  wikiLinkLabel,
  wikiLinks,
  wikiNumbers,
  wikiRecapMentions,
  wikiTimeline,
  wikiTitleParts,
} from '../wiki';

// ---- W4 (2026-09-18): monthly history helpers ----

function historyEntry(month: string, extra: Partial<WikiHistoryEntry> = {}): WikiHistoryEntry {
  return {
    month,
    eventful: false,
    streams: 10,
    hours: 60,
    active_days: 10,
    top_category: 'Marvel Rivals',
    top_share_percent: 40,
    median_ccv: 5000,
    peak_ccv: 9000,
    follower_delta: 1200,
    follower_delta_percent: 0.1,
    paragraph: null,
    paragraph_native: null,
    generated_at: '2026-09-18T18:00:00Z',
    ...extra,
  };
}

describe('wikiHistory / groupHistoryByYear', () => {
  it('drops malformed rows, dedupes months, orders newest first, groups by year', () => {
    const rows = wikiHistory({
      history: [
        historyEntry('2026-01'),
        historyEntry('2026-08'),
        historyEntry('2025-12'),
        historyEntry('2026-08'), // duplicate month
        { ...historyEntry('2026-13') }, // invalid month
        { ...historyEntry('2026-07'), streams: 'x' as unknown as number },
      ],
    });
    expect(rows.map((r) => r.month)).toEqual(['2026-08', '2026-01', '2025-12']);
    const groups = groupHistoryByYear(rows);
    expect(groups.map((g) => [g.year, g.entries.length])).toEqual([
      ['2026', 2],
      ['2025', 1],
    ]);
    expect(wikiHistory({})).toEqual([]);
  });
});

describe('historyParagraph', () => {
  it('picks the native text only when the viewer reads that language', () => {
    const entry = historyEntry('2026-08', { paragraph: 'EN text', paragraph_native: 'DE Text' });
    expect(historyParagraph(entry, 'de', 'de')).toEqual({ text: 'DE Text', lang: 'de' });
    expect(historyParagraph(entry, 'fr', 'de')).toEqual({ text: 'EN text', lang: 'en' });
    expect(historyParagraph(entry, 'de', null)).toEqual({ text: 'EN text', lang: 'en' });
    expect(historyParagraph(historyEntry('2026-07'), 'en', null)).toBeNull();
  });
});

describe('history formatting', () => {
  it('formats month, signed deltas and whole numbers per locale', () => {
    expect(formatHistoryMonth('2026-08', 'en')).toBe('Aug 2026');
    expect(formatHistoryMonth('2026-08', 'de')).toMatch(/Aug\.? 2026/);
    expect(formatHistoryMonth('nope', 'en')).toBe('nope');
    expect(formatSignedInt(3594, 'en')).toBe('+3,594');
    expect(formatSignedInt(-120, 'en')).toBe('-120');
    expect(formatSignedInt(0, 'en')).toBe('0');
    expect(formatSignedInt(null, 'en')).toBe('');
    expect(formatWholeNumber(107.4, 'en')).toBe('107');
    expect(formatWholeNumber(5101, 'de')).toBe('5.101');
  });

  it('latestHistoryIso / laterIso pick the newest timestamp', () => {
    const rows = [
      historyEntry('2026-07', { generated_at: '2026-09-01T00:00:00Z' }),
      historyEntry('2026-08', { generated_at: '2026-09-18T18:00:00Z' }),
      historyEntry('2026-06', { generated_at: 'garbage' }),
    ];
    expect(latestHistoryIso(rows)).toBe('2026-09-18T18:00:00Z');
    expect(latestHistoryIso([])).toBeNull();
    expect(laterIso('2026-09-10T00:00:00Z', '2026-09-18T18:00:00Z')).toBe('2026-09-18T18:00:00Z');
    expect(laterIso('2026-09-20T00:00:00Z', '2026-09-18T18:00:00Z')).toBe('2026-09-20T00:00:00Z');
    expect(laterIso('2026-09-20T00:00:00Z', null)).toBe('2026-09-20T00:00:00Z');
  });
});

// ---- W3 (2026-09-18): timeline + links helpers ----

describe('wikiTimeline', () => {
  it('keeps valid entries, sorts chronologically, tolerates a pre-W3 article', () => {
    const entries = wikiTimeline({
      timeline: [
        { date: '2021-09-02', text: 'Moved to YouTube.', source_ids: [1] },
        { date: 'bad', text: 'x', source_ids: [] },
        { date: '2015', text: 'Started.', source_ids: [2] },
        { date: '2018-05', text: '   ', source_ids: [1] },
      ],
    });
    expect(entries.map((e) => e.date)).toEqual(['2015', '2021-09-02']);
    expect(wikiTimeline({})).toEqual([]);
  });
});

describe('formatTimelineDate', () => {
  it('formats at the precision of the input, per locale', () => {
    expect(formatTimelineDate('2015', 'en')).toBe('2015');
    expect(formatTimelineDate('2021-09', 'en')).toBe('September 2021');
    expect(formatTimelineDate('2021-09-02', 'en')).toBe('September 2, 2021');
    expect(formatTimelineDate('2021-09', 'de')).toBe('September 2021');
    expect(formatTimelineDate('2021-09-02', 'de')).toBe('2. September 2021');
    expect(formatTimelineDate('nope', 'en')).toBe('nope');
  });
});

describe('wikiLinks / wikiLinkLabel', () => {
  it('serves https links with proper-name labels, falls back to the raw platform', () => {
    const links = wikiLinks({
      links: [
        { platform: 'x', url: 'https://x.com/a' },
        { platform: 'tiktok', url: 'http://tiktok.com/@a' },
        { platform: 'newplatform', url: 'https://new.example/a' },
      ],
    });
    expect(links.map((l) => l.platform)).toEqual(['x', 'newplatform']);
    expect(wikiLinkLabel('x')).toBe('X');
    expect(wikiLinkLabel('tiktok')).toBe('TikTok');
    expect(wikiLinkLabel('newplatform')).toBe('newplatform');
    expect(wikiLinks({})).toEqual([]);
  });
});

// W1/W2 (2026-09-18): title parts, earnings fallback input, own-data section
// builders. Pure functions — the page only renders their output.

function fact(key: string, extra: Partial<WikiFact> = {}): WikiFact {
  return {
    key,
    value: 'x',
    value_num_low: null,
    value_num_high: null,
    is_estimate: false,
    as_of: null,
    source_ids: [1],
    ...extra,
  };
}

describe('wikiTitleParts', () => {
  it('names only the personal facts that exist, then career', () => {
    expect(wikiTitleParts([fact('birth_date'), fact('est_income_monthly_usd')])).toEqual([
      'age',
      'earnings',
      'career',
    ]);
  });

  it('keeps the catalog order and caps at two personal parts', () => {
    expect(
      wikiTitleParts([
        fact('real_name'),
        fact('est_income_monthly_usd'),
        fact('net_worth_usd'),
        fact('birth_date'),
      ]),
    ).toEqual(['age', 'netWorth', 'career']);
  });

  it('falls back to career + facts when no personal fact exists (Jack_Fromsoft case)', () => {
    expect(wikiTitleParts([fact('nationality'), fact('teams')])).toEqual(['career', 'facts']);
    expect(wikiTitleParts([])).toEqual(['career', 'facts']);
  });
});

describe('joinTitleParts', () => {
  it('joins with separator and conjunction', () => {
    expect(joinTitleParts(['Age', 'Net Worth', 'Career'], ', ', ' & ')).toBe(
      'Age, Net Worth & Career',
    );
    expect(joinTitleParts(['Earnings', 'Career'], ', ', ' und ')).toBe('Earnings und Career');
    expect(joinTitleParts(['Career'], ', ', ' & ')).toBe('Career');
    expect(joinTitleParts([], ', ', ' & ')).toBe('');
  });
});

describe('incomeFact', () => {
  it('returns the income fact only when it carries a numeric range', () => {
    expect(incomeFact([fact('est_income_monthly_usd')])).toBeNull();
    const income = fact('est_income_monthly_usd', { value_num_low: 1000, value_num_high: 4000 });
    expect(incomeFact([fact('real_name'), income])).toBe(income);
  });
});

const STATS: PublicStreamerStats = {
  streamer_id: 'x',
  has_stats: true,
  window_days: 28,
  sample_size: 20,
  source: 'vod',
  timezone: 'America/New_York',
  typical_start: '14:00',
  typical_end: '19:00',
  typical_duration_minutes: 312,
  streams_per_week: 4.5,
  active_days_per_week: 4,
  hours_streamed: 118.4,
  peak_viewer_count: 42000,
  weekdays: [],
  top_categories: [
    { category: 'Marvel Rivals', streams: 8, share_percent: 27 },
    { category: 'WARDOGS', streams: 6, share_percent: 20 },
    { category: 'Just Chatting', streams: 3, share_percent: 10 },
  ],
};

const INSIGHTS: StreamerInsights = {
  streamer_id: 'x',
  sample_count: 480,
  overall_median: 15200,
  follower_trend: [
    { date: '2026-08-01', count: 7_500_000 },
    { date: '2026-08-20', count: 7_560_000 },
    { date: '2026-09-15', count: 7_615_000 },
  ],
};

describe('wikiNumbers', () => {
  it('collects every known headline number', () => {
    const n = wikiNumbers({ follower_count: 7_615_377 }, STATS, INSIGHTS);
    expect(n).toEqual({
      followers: 7_615_377,
      medianViewers: 15200,
      peakViewers: 42000,
      streamsPerWeek: 4.5,
      activeDays: 4,
      typicalMinutes: 312,
      hoursStreamed: 118.4,
      windowDays: 28,
      followerGain30: 7_615_000 - 7_500_000,
    });
  });

  it('hides the median while viewer data is still collecting', () => {
    const n = wikiNumbers(null, null, { ...INSIGHTS, sample_count: 3 });
    expect(n?.medianViewers).toBeNull();
    expect(n?.followerGain30).toBe(115_000);
  });

  it('returns null when nothing at all is known', () => {
    expect(wikiNumbers(null, null, null)).toBeNull();
    expect(wikiNumbers({ follower_count: null }, null, { streamer_id: 'x', sample_count: 0 })).toBeNull();
  });
});

const GAMES: PublicGame[] = [
  { category: 'Marvel Rivals', box_art_url: 'https://static-cdn.jtvnw.net/ttv-boxart/1-285x380.jpg' } as PublicGame,
  { category: 'Just Chatting', box_art_url: null } as PublicGame,
];

const PLACEMENTS: PublicGamePlacement[] = [
  { category: 'Marvel Rivals', rank: 3, total: 120, value: null, share_percent: 27, previous_rank: null },
  // Pool of 2 is noise (MIN_POOL_SIZE) — must not surface as a rank.
  { category: 'WARDOGS', rank: 1, total: 2, value: null, share_percent: 20, previous_rank: null },
];

describe('wikiGamesTable', () => {
  it('keeps every category (not only hub games) and joins links + ranks', () => {
    const rows = wikiGamesTable(STATS.top_categories, GAMES, PLACEMENTS);
    expect(rows.map((r) => r.category)).toEqual(['Marvel Rivals', 'WARDOGS', 'Just Chatting']);
    expect(rows[0]).toMatchObject({
      slug: 'marvel-rivals',
      boxArtUrl: GAMES[0].box_art_url,
      streams: 8,
      sharePercent: 27,
      rank: 3,
      total: 120,
      rankHref: '/rankings/game/marvel-rivals#rank-3',
    });
    // Not in the catalog → no hub link, no box art; noise placement → no rank.
    expect(rows[1]).toMatchObject({ slug: null, boxArtUrl: null, rank: null, rankHref: null });
    // In the catalog without box art → link but no image.
    expect(rows[2]).toMatchObject({ slug: 'just-chatting', boxArtUrl: null });
  });

  it('respects the limit and empty input', () => {
    expect(wikiGamesTable(STATS.top_categories, GAMES, PLACEMENTS, 2)).toHaveLength(2);
    expect(wikiGamesTable([] as PublicStreamerStatsCategory[], GAMES, PLACEMENTS)).toEqual([]);
  });
});

function recap(slug: string, heroIds: string[]): PublicRecapListItem {
  return {
    slug,
    kind: 'weekly',
    period_start: '2026-09-07',
    period_end: '2026-09-13',
    published_at: '2026-09-14T06:30:00Z',
    language: 'en',
    requested_language: 'en',
    available_languages: ['en'],
    title: `Recap ${slug}`,
    teaser: 't',
    hero: { clip: null, streamers: heroIds.map((id) => ({ id, name: id, avatar_url: null })) },
  };
}

describe('wikiRecapMentions', () => {
  it('keeps editions with the streamer among the hero protagonists, in order, capped', () => {
    const items = [
      recap('a', ['x', 'y']),
      recap('b', ['z']),
      recap('c', ['x']),
      recap('d', ['x']),
    ];
    expect(wikiRecapMentions(items, 'x').map((r) => r.slug)).toEqual(['a', 'c', 'd']);
    expect(wikiRecapMentions(items, 'x', 2).map((r) => r.slug)).toEqual(['a', 'c']);
    expect(wikiRecapMentions(items, 'nobody')).toEqual([]);
  });
});

describe('locale formatters', () => {
  it('weekdayShortLabels is Monday-first per locale', () => {
    expect(weekdayShortLabels('en')).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(weekdayShortLabels('de')[0]).toMatch(/^Mo/);
    expect(weekdayShortLabels('de')).toHaveLength(7);
  });

  it('formatWikiShortDate accepts dates and timestamps (UTC calendar)', () => {
    expect(formatWikiShortDate('2026-08-10', 'en')).toBe('Aug 10');
    expect(formatWikiShortDate('2026-08-10T23:51:49+00:00', 'en')).toBe('Aug 10');
    expect(formatWikiShortDate('garbage', 'en')).toBe('');
  });

  it('formatHours renders one trimmed decimal per locale', () => {
    expect(formatHours(312, 'en')).toBe('5.2 h');
    expect(formatHours(120, 'en')).toBe('2 h');
    expect(formatHours(312, 'de')).toBe('5,2 h');
  });
});
