import { describe, expect, it } from 'vitest';
import type {
  PublicGamePlacement,
  PublicRankingPlacement,
  PublicStreamerRankings,
} from '@/lib/server/partner-api';
import {
  buildStreamerRankingRows,
  gameRankingHref,
  GAME_RANKING_PAGE_SIZE,
  MAX_STREAMER_RANKING_ROWS,
  MIN_POOL_SIZE,
  pageCount,
  pageForRank,
  rankingHref,
  RANKING_PAGE_SIZE,
  rankTrend,
} from '@/lib/streamer-rankings';
import { pageWindow } from '@/components/web/RankingPagination';

const LABELS = {
  metric: {
    'most-followed': 'Most followed',
    'most-watched': 'Most watched',
    'most-active': 'Most active',
    'most-reliable': 'Most punctual',
    'fastest-growing': 'Fastest growing',
  },
} as const;

function placement(
  overrides: Partial<PublicRankingPlacement> = {},
): PublicRankingPlacement {
  return {
    metric: 'most-followed',
    rank: 3,
    total: 236,
    value: 19871233,
    window_days: null,
    previous_rank: null,
    ...overrides,
  };
}

function gamePlacement(overrides: Partial<PublicGamePlacement> = {}): PublicGamePlacement {
  return {
    category: 'Minecraft',
    rank: 2,
    total: 14,
    value: 90000,
    share_percent: 30,
    previous_rank: null,
    ...overrides,
  };
}

function payload(
  rankings: PublicRankingPlacement[] = [],
  games: PublicGamePlacement[] = [],
): PublicStreamerRankings {
  return { streamer_id: 's1', rankings, games };
}

describe('pageForRank', () => {
  it('keeps the last rank of a page on that page', () => {
    expect(pageForRank(1, 100)).toBe(1);
    expect(pageForRank(100, 100)).toBe(1);
    expect(pageForRank(101, 100)).toBe(2);
    expect(pageForRank(200, 100)).toBe(2);
    expect(pageForRank(201, 100)).toBe(3);
  });

  it('falls back to page 1 for nonsense input', () => {
    expect(pageForRank(0, 100)).toBe(1);
    expect(pageForRank(-5, 100)).toBe(1);
    expect(pageForRank(Number.NaN, 100)).toBe(1);
    expect(pageForRank(50, 0)).toBe(1);
  });
});

describe('pageCount', () => {
  it('counts partial last pages', () => {
    expect(pageCount(236, 100)).toBe(3);
    expect(pageCount(100, 100)).toBe(1);
    expect(pageCount(101, 100)).toBe(2);
  });

  it('is always at least 1', () => {
    expect(pageCount(0, 100)).toBe(1);
    expect(pageCount(-1, 100)).toBe(1);
  });
});

describe('rankingHref', () => {
  it('keeps page 1 on the canonical URL — no "/1" twin', () => {
    expect(rankingHref('most-followed', 3)).toBe('/rankings/most-followed#rank-3');
    expect(rankingHref('most-followed', RANKING_PAGE_SIZE)).toBe(
      '/rankings/most-followed#rank-100',
    );
  });

  it('adds the page segment and keeps the ABSOLUTE rank anchor', () => {
    // The anchor must be the absolute rank: RankingTable ids rows by entry.rank,
    // which the API reports as offset + index + 1.
    expect(rankingHref('most-watched', 142)).toBe('/rankings/most-watched/2#rank-142');
    expect(rankingHref('most-active', 201)).toBe('/rankings/most-active/3#rank-201');
  });
});

describe('gameRankingHref', () => {
  it('slugs the category and pages like the global rankings', () => {
    expect(gameRankingHref('Just Chatting', 2)).toBe('/rankings/game/just-chatting#rank-2');
    expect(gameRankingHref('Just Chatting', GAME_RANKING_PAGE_SIZE + 1)).toBe(
      '/rankings/game/just-chatting/2#rank-101',
    );
  });

  it('returns null when the category has no usable slug', () => {
    expect(gameRankingHref('', 1)).toBeNull();
  });
});

describe('rankTrend', () => {
  it('reports movement relative to the baseline', () => {
    expect(rankTrend(3, 7)).toEqual({ kind: 'up', delta: 4 });
    expect(rankTrend(7, 3)).toEqual({ kind: 'down', delta: 4 });
    expect(rankTrend(5, 5)).toEqual({ kind: 'none' });
  });

  it('treats a missing baseline as unknown, NOT as a new entry', () => {
    // Ranks here are unbounded while snapshots only cover the top 100/60, so a
    // missing baseline says nothing about direction. Claiming "NEW" would be a
    // rise we cannot evidence.
    expect(rankTrend(312, null)).toEqual({ kind: 'none' });
  });
});

describe('buildStreamerRankingRows', () => {
  it('returns [] for a failed lookup', () => {
    expect(buildStreamerRankingRows(null, LABELS)).toEqual([]);
  });

  it('labels and links global placements', () => {
    const rows = buildStreamerRankingRows(payload([placement()]), LABELS);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      label: 'Most followed',
      rank: 3,
      total: 236,
      href: '/rankings/most-followed#rank-3',
      isGame: false,
    });
  });

  it('keeps global placements before category placements', () => {
    const rows = buildStreamerRankingRows(
      payload([placement()], [gamePlacement()]),
      LABELS,
    );
    expect(rows.map((r) => r.isGame)).toEqual([false, true]);
  });

  it('preserves the API order within each group', () => {
    const rows = buildStreamerRankingRows(
      payload(
        [placement({ metric: 'most-followed' }), placement({ metric: 'most-active' })],
        [
          gamePlacement({ category: 'League of Legends' }),
          gamePlacement({ category: 'Minecraft' }),
        ],
      ),
      LABELS,
    );
    expect(rows.map((r) => r.label)).toEqual([
      'Most followed',
      'Most active',
      'League of Legends',
      'Minecraft',
    ]);
  });

  it(`drops pools smaller than MIN_POOL_SIZE (${MIN_POOL_SIZE})`, () => {
    // "#1 of 2" reads like an achievement but isn't one.
    const rows = buildStreamerRankingRows(
      payload([placement({ rank: 1, total: 2 })], [gamePlacement({ rank: 1, total: 1 })]),
      LABELS,
    );
    expect(rows).toEqual([]);
  });

  it('drops impossible placements (rank past the pool, non-integers)', () => {
    const rows = buildStreamerRankingRows(
      payload([
        placement({ rank: 50, total: 10 }),
        placement({ metric: 'most-watched', rank: 1.5, total: 100 }),
        placement({ metric: 'most-active', rank: 4, total: 100 }),
      ]),
      LABELS,
    );
    expect(rows.map((r) => r.label)).toEqual(['Most active']);
  });

  it(`caps at MAX_STREAMER_RANKING_ROWS (${MAX_STREAMER_RANKING_ROWS})`, () => {
    const rows = buildStreamerRankingRows(
      payload(
        [
          placement({ metric: 'most-followed' }),
          placement({ metric: 'most-watched' }),
          placement({ metric: 'most-active' }),
          placement({ metric: 'most-reliable' }),
          placement({ metric: 'fastest-growing' }),
        ],
        Array.from({ length: 8 }, (_, i) => gamePlacement({ category: `Game ${i}` })),
      ),
      LABELS,
    );
    expect(rows).toHaveLength(MAX_STREAMER_RANKING_ROWS);
    // Global placements survive the cap — they are the headline numbers.
    expect(rows.filter((r) => !r.isGame)).toHaveLength(5);
  });

  it('carries the trend through', () => {
    const rows = buildStreamerRankingRows(
      payload([placement({ rank: 3, previous_rank: 8 })]),
      LABELS,
    );
    expect(rows[0].trend).toEqual({ kind: 'up', delta: 5 });
  });
});

describe('pageWindow', () => {
  it('lists every page when they all fit', () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
    expect(pageWindow(2, 3)).toEqual([1, 2, 3]);
  });

  it('elides long runs but always keeps first and last', () => {
    expect(pageWindow(5, 10)).toEqual([1, null, 4, 5, 6, null, 10]);
  });

  it('shows a single skipped page instead of an ellipsis of the same width', () => {
    expect(pageWindow(4, 6)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('handles the edges', () => {
    expect(pageWindow(1, 10)).toEqual([1, 2, null, 10]);
    expect(pageWindow(10, 10)).toEqual([1, null, 9, 10]);
    expect(pageWindow(1, 1)).toEqual([1]);
  });
});
