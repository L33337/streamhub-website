import { describe, it, expect } from 'vitest';
import {
  rankGameStreamers,
  topGameStreamerNames,
  formatNameList,
} from '../game-ranking';
import type { PublicStreamer } from '@/lib/server/partner-api';

function mk(over: Partial<PublicStreamer> & { id: string; name: string }): PublicStreamer {
  return {
    platforms: ['twitch'],
    avatar_url: null,
    is_featured: false,
    timezone: null,
    language: null,
    is_always_on: false,
    avg_view_count: null,
    follower_count: null,
    follower_count_updated_at: null,
    updated_at: '2026-07-12T00:00:00Z',
    last_status_change_at: null,
    twitch_login: null,
    youtube_channel_id: null,
    description: null,
    ...over,
  };
}

describe('rankGameStreamers', () => {
  it('ranks by follower_count desc with 1-based ranks', () => {
    const out = rankGameStreamers(
      [
        mk({ id: 'a', name: 'A', follower_count: 1000 }),
        mk({ id: 'c', name: 'C', follower_count: 5000 }),
        mk({ id: 'b', name: 'B', follower_count: 3000 }),
      ],
      10,
    );
    expect(out.map((r) => [r.rank, r.streamer.id])).toEqual([
      [1, 'c'],
      [2, 'b'],
      [3, 'a'],
    ]);
  });

  it('excludes streamers with null follower_count', () => {
    const out = rankGameStreamers(
      [
        mk({ id: 'a', name: 'A', follower_count: null }),
        mk({ id: 'b', name: 'B', follower_count: 200 }),
      ],
      10,
    );
    expect(out.map((r) => r.streamer.id)).toEqual(['b']);
  });

  it('excludes zero / negative follower_count (never shows "0")', () => {
    const out = rankGameStreamers(
      [
        mk({ id: 'a', name: 'A', follower_count: 0 }),
        mk({ id: 'b', name: 'B', follower_count: -5 }),
        mk({ id: 'c', name: 'C', follower_count: 10 }),
      ],
      10,
    );
    expect(out.map((r) => r.streamer.id)).toEqual(['c']);
  });

  it('tie-breaks equal followers by avg_view_count desc, then name', () => {
    const out = rankGameStreamers(
      [
        mk({ id: 'a', name: 'Alpha', follower_count: 1000, avg_view_count: 10 }),
        mk({ id: 'b', name: 'Bravo', follower_count: 1000, avg_view_count: 99 }),
        mk({ id: 'z', name: 'Zed', follower_count: 1000, avg_view_count: null }),
      ],
      10,
    );
    expect(out.map((r) => r.streamer.id)).toEqual(['b', 'a', 'z']);
  });

  it('respects the limit', () => {
    const out = rankGameStreamers(
      [
        mk({ id: 'a', name: 'A', follower_count: 1 }),
        mk({ id: 'b', name: 'B', follower_count: 2 }),
        mk({ id: 'c', name: 'C', follower_count: 3 }),
      ],
      2,
    );
    expect(out.map((r) => r.streamer.id)).toEqual(['c', 'b']);
  });

  it('returns [] for empty input or all-null followers', () => {
    expect(rankGameStreamers([], 10)).toEqual([]);
    expect(
      rankGameStreamers([mk({ id: 'a', name: 'A', follower_count: null })], 10),
    ).toEqual([]);
  });
});

// ============================================
// View-model layer (rankings-page expansion)
// ============================================

import {
  buildGameRankingRows,
  buildGameRankingFaq,
  filterGameRankingRows,
  gameRankingLanguages,
  languageKey,
  latestFollowerRefresh,
  sortGameRankingRows,
  type GameRankingRow,
} from '../game-ranking';

describe('topGameStreamerNames', () => {
  it('returns names in ranking order, capped at limit', () => {
    const out = topGameStreamerNames(
      [
        mk({ id: 'a', name: 'A', follower_count: 1000 }),
        mk({ id: 'c', name: 'C', follower_count: 5000 }),
        mk({ id: 'b', name: 'B', follower_count: 3000 }),
        mk({ id: 'd', name: 'D', follower_count: 2000 }),
      ],
      3,
    );
    expect(out).toEqual(['C', 'B', 'D']);
  });

  it('drops streamers without usable follower counts (same rule as the table)', () => {
    const out = topGameStreamerNames(
      [
        mk({ id: 'a', name: 'A', follower_count: null }),
        mk({ id: 'b', name: 'B', follower_count: 0 }),
        mk({ id: 'c', name: 'C', follower_count: 42 }),
      ],
      3,
    );
    expect(out).toEqual(['C']);
  });

  it('empty input → empty list', () => {
    expect(topGameStreamerNames([], 3)).toEqual([]);
  });
});

describe('formatNameList', () => {
  it('joins as English prose', () => {
    expect(formatNameList([])).toBe('');
    expect(formatNameList(['Ninja'])).toBe('Ninja');
    expect(formatNameList(['Ninja', 'Clix'])).toBe('Ninja and Clix');
    expect(formatNameList(['Ninja', 'Jynxzi', 'Clix'])).toBe('Ninja, Jynxzi and Clix');
  });
});

function ranked(
  id: string,
  rank: number,
  over: Partial<PublicStreamer> = {},
): { rank: number; streamer: PublicStreamer } {
  return {
    rank,
    streamer: mk({ id, name: id.toUpperCase(), follower_count: 1000 - rank, ...over }),
  };
}

describe('buildGameRankingRows', () => {
  it('merges live slots, next slots and category stats into rows', () => {
    const rows = buildGameRankingRows(
      [
        ranked('a', 1, {
          category_stats: {
            streams_28d: 10,
            hours_28d: 42.5,
            peak_viewer_28d: 900,
            share_percent: 80,
            rank_7d_ago: 3,
          },
        }),
        ranked('b', 2),
      ],
      [{ streamer_id: 'a', viewer_count: 1200 }],
      [
        { streamer_id: 'b', start_time: '2026-07-21T18:00:00Z', is_predicted: true },
        { streamer_id: 'b', start_time: '2026-07-20T18:00:00Z', is_predicted: false },
      ],
    );
    expect(rows[0]).toMatchObject({
      id: 'a',
      rank: 1,
      hours28d: 42.5,
      sharePercent: 80,
      rankDelta: 2, // was 3, now 1 → climbed 2
      isNew: false,
      isLive: true,
      liveViewerCount: 1200,
      nextStreamAt: null,
    });
    // Earliest upcoming slot wins; baseline exists → b (no stats) is "new".
    expect(rows[1]).toMatchObject({
      id: 'b',
      isLive: false,
      nextStreamAt: '2026-07-20T18:00:00Z',
      nextIsPredicted: false,
      rankDelta: null,
      isNew: true,
      hours28d: null,
    });
  });

  it('no baseline anywhere → nobody is "new", all deltas null', () => {
    const rows = buildGameRankingRows(
      [
        ranked('a', 1, {
          category_stats: {
            streams_28d: 1,
            hours_28d: 2,
            peak_viewer_28d: null,
            share_percent: 50,
            rank_7d_ago: null,
          },
        }),
        ranked('b', 2),
      ],
      [],
      [],
    );
    expect(rows.every((r) => r.rankDelta === null && !r.isNew)).toBe(true);
  });

  it('live slot without fresh viewers → isLive true, viewers null', () => {
    const rows = buildGameRankingRows(
      [ranked('a', 1)],
      [{ streamer_id: 'a', viewer_count: null }],
      [],
    );
    expect(rows[0].isLive).toBe(true);
    expect(rows[0].liveViewerCount).toBeNull();
  });

  it('ignores upcoming slots with unparseable start times', () => {
    const rows = buildGameRankingRows(
      [ranked('a', 1)],
      [],
      [{ streamer_id: 'a', start_time: 'not-a-date', is_predicted: false }],
    );
    expect(rows[0].nextStreamAt).toBeNull();
  });
});

function row(over: Partial<GameRankingRow> & { id: string; rank: number }): GameRankingRow {
  return {
    name: over.id.toUpperCase(),
    avatarUrl: null,
    platforms: ['twitch'],
    language: null,
    followerCount: 1000 - over.rank,
    avgViewCount: null,
    hours28d: null,
    streams28d: null,
    sharePercent: null,
    rankDelta: null,
    isNew: false,
    isLive: false,
    liveViewerCount: null,
    nextStreamAt: null,
    nextIsPredicted: false,
    ...over,
  };
}

describe('sortGameRankingRows', () => {
  const rows = [
    row({ id: 'a', rank: 1, hours28d: 5, avgViewCount: null }),
    row({ id: 'b', rank: 2, hours28d: 50, avgViewCount: 10 }),
    row({ id: 'c', rank: 3, hours28d: null, avgViewCount: 99 }),
  ];

  it('followers = canonical rank order', () => {
    expect(sortGameRankingRows([rows[1], rows[2], rows[0]], 'followers').map((r) => r.id)).toEqual(
      ['a', 'b', 'c'],
    );
  });

  it('hours sorts desc with nulls last', () => {
    expect(sortGameRankingRows(rows, 'hours').map((r) => r.id)).toEqual(['b', 'a', 'c']);
  });

  it('viewers sorts desc with nulls last', () => {
    expect(sortGameRankingRows(rows, 'viewers').map((r) => r.id)).toEqual(['c', 'b', 'a']);
  });

  it('does not mutate the input array', () => {
    const input = [rows[1], rows[0]];
    sortGameRankingRows(input, 'followers');
    expect(input.map((r) => r.id)).toEqual(['b', 'a']);
  });
});

describe('language helpers', () => {
  it('languageKey normalizes to the primary subtag', () => {
    expect(languageKey('de-DE')).toBe('de');
    expect(languageKey('EN')).toBe('en');
    expect(languageKey(null)).toBeNull();
    expect(languageKey('  ')).toBeNull();
  });

  it('gameRankingLanguages needs >= 2 distinct languages', () => {
    expect(gameRankingLanguages([row({ id: 'a', rank: 1, language: 'en' })])).toEqual([]);
    const chips = gameRankingLanguages([
      row({ id: 'a', rank: 1, language: 'en' }),
      row({ id: 'b', rank: 2, language: 'en-US' }),
      row({ id: 'c', rank: 3, language: 'de' }),
      row({ id: 'd', rank: 4, language: null }),
    ]);
    expect(chips).toEqual([
      { code: 'en', count: 2 },
      { code: 'de', count: 1 },
    ]);
  });

  it('filterGameRankingRows matches on the primary subtag', () => {
    const rows = [
      row({ id: 'a', rank: 1, language: 'en-US' }),
      row({ id: 'b', rank: 2, language: 'de' }),
    ];
    expect(filterGameRankingRows(rows, 'en').map((r) => r.id)).toEqual(['a']);
    expect(filterGameRankingRows(rows, null)).toHaveLength(2);
  });
});

describe('latestFollowerRefresh', () => {
  it('returns the max timestamp, null when none', () => {
    expect(
      latestFollowerRefresh([
        { follower_count_updated_at: '2026-07-18T00:00:00Z' },
        { follower_count_updated_at: '2026-07-19T06:00:00Z' },
        { follower_count_updated_at: null },
      ]),
    ).toBe('2026-07-19T06:00:00Z');
    expect(latestFollowerRefresh([{ follower_count_updated_at: null }])).toBeNull();
  });
});

describe('buildGameRankingFaq', () => {
  it('emits data-driven questions when data exists', () => {
    const faq = buildGameRankingFaq({
      category: 'Valorant',
      rows: [
        row({ id: 'a', rank: 1, followerCount: 500000, sharePercent: 80 }),
        row({ id: 'b', rank: 2, followerCount: 300000 }),
      ],
      streamerCount: 14,
      hours28d: 220.5,
      streams28d: 60,
    });
    const questions = faq.map((f) => f.q);
    expect(questions).toEqual([
      'Who is the most followed Valorant streamer?',
      'How many streamers stream Valorant?',
      'How is this ranking measured?',
      'What does "Game share" mean?',
    ]);
    expect(faq[0].a).toContain('A is currently the most followed Valorant streamer');
    expect(faq[0].a).toContain('ahead of B');
    expect(faq[1].a).toContain('14 streamers');
    expect(faq[1].a).toContain('221 hours');
  });

  it('degrades: no rows → no top question, no share → no share question', () => {
    const faq = buildGameRankingFaq({
      category: 'Chess',
      rows: [],
      streamerCount: null,
      hours28d: null,
      streams28d: null,
    });
    expect(faq.map((f) => f.q)).toEqual(['How is this ranking measured?']);
  });
});
