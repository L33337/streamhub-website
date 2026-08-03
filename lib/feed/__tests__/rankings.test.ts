import { describe, it, expect } from 'vitest';
import {
  buildFeedRankingsBlocks,
  pickResidualFavorites,
  RANKINGS_FAV_ROWS,
  RESIDUAL_RANKINGS_CAP,
} from '../rankings';
import type {
  PublicRankingEntry,
  PublicStreamer,
  PublicStreamerRankings,
  RankingMetric,
  RankingsResponse,
  RankingValues,
} from '@/lib/server/partner-api';

function streamer(id: string, name = id.toUpperCase()): PublicStreamer {
  return {
    id,
    name,
    platforms: ['twitch'],
    avatar_url: `https://cdn.test/${id}.png`,
    is_featured: false,
    timezone: null,
    language: 'en',
    is_always_on: false,
    avg_view_count: 100,
    follower_count: 1000,
    follower_count_updated_at: null,
    updated_at: '2026-08-01T00:00:00Z',
    last_status_change_at: null,
    twitch_login: id,
    youtube_channel_id: null,
    description: null,
  };
}

function entry(id: string, rank: number, values: RankingValues): PublicRankingEntry {
  return { rank, values, streamer: streamer(id) };
}

function response(
  metric: RankingMetric,
  entries: PublicRankingEntry[],
  total = entries.length,
): RankingsResponse {
  return {
    metric,
    window_days: 28,
    refreshed_at: '2026-08-01T04:00:00Z',
    data: entries,
    pagination: { offset: 0, limit: 100, total, has_more: total > entries.length },
  };
}

/**
 * Followers leaderboard: a, b, c on the podium, fav1 at #7, fav2 at #12.
 *
 * Ranks are CONTIGUOUS on purpose. A real top-100 page is gap-free, and
 * sanitizeRankingEntries re-numbers densely from rank 1 — a fixture with holes
 * would silently be renumbered and test nothing about the ranks we render.
 */
function followedResponse(): RankingsResponse {
  const named: Record<number, string> = { 1: 'a', 2: 'b', 3: 'c', 7: 'fav1', 12: 'fav2' };
  const previous: Record<string, number> = { fav1: 10, fav2: 11 };
  const data = Array.from({ length: 12 }, (_, i) => {
    const rank = i + 1;
    const id = named[rank] ?? `s${rank}`;
    const values: RankingValues = { follower_count: 2_200_000 - rank * 100_000 };
    if (previous[id] != null) values.previous_rank = previous[id];
    return entry(id, rank, values);
  });
  return response('most-followed', data, 236);
}

const NAMES = { fav1: 'Fav One', fav2: 'Fav Two', fav3: 'Fav Three', a: 'A' };

describe('buildFeedRankingsBlocks', () => {
  it('renders the global podium plus the viewer\'s own placements', () => {
    const { blocks } = buildFeedRankingsBlocks({
      responses: { 'most-followed': followedResponse() },
      favIds: ['fav1', 'fav2'],
      nameMap: NAMES,
    });

    expect(blocks).toHaveLength(1);
    const block = blocks[0];
    expect(block.metric).toBe('most-followed');
    expect(block.title).toBe('Most followed');
    expect(block.href).toBe('/rankings/most-followed');
    expect(block.top3.map((r) => r.streamerId)).toEqual(['a', 'b', 'c']);
    expect(block.top3.every((r) => r.isFavorite)).toBe(false);
    expect(block.favRows.map((r) => r.streamerId)).toEqual(['fav1', 'fav2']);
    expect(block.moreFavRows).toEqual([]);
  });

  it('formats the metric value and the pool denominator', () => {
    const { blocks } = buildFeedRankingsBlocks({
      responses: { 'most-followed': followedResponse() },
      favIds: ['fav1'],
      nameMap: NAMES,
    });
    const [top] = blocks[0].top3;
    expect(top.value).toBe('2.1M');
    expect(top.total).toBe(236);
    expect(blocks[0].favRows[0]).toMatchObject({ rank: 7, total: 236, value: '1.5M' });
  });

  it('deep-links each row to its own leaderboard row', () => {
    const { blocks } = buildFeedRankingsBlocks({
      responses: { 'most-followed': followedResponse() },
      favIds: ['fav1'],
      nameMap: NAMES,
    });
    expect(blocks[0].top3[0].href).toBe('/rankings/most-followed#rank-1');
    expect(blocks[0].favRows[0].href).toBe('/rankings/most-followed#rank-7');
  });

  it('routes every href through toHref so the client stays locale-free', () => {
    const { blocks } = buildFeedRankingsBlocks({
      responses: { 'most-followed': followedResponse() },
      favIds: ['fav1'],
      nameMap: NAMES,
      toHref: (href) => `/de${href}`,
    });
    expect(blocks[0].href).toBe('/de/rankings/most-followed');
    expect(blocks[0].top3[0].href).toBe('/de/rankings/most-followed#rank-1');
  });

  it('badges a favorite inside the podium and does not repeat it below', () => {
    const { blocks } = buildFeedRankingsBlocks({
      responses: { 'most-followed': followedResponse() },
      favIds: ['b', 'fav1'],
      nameMap: NAMES,
    });
    const block = blocks[0];
    expect(block.top3.find((r) => r.streamerId === 'b')?.isFavorite).toBe(true);
    expect(block.favRows.map((r) => r.streamerId)).toEqual(['fav1']);
  });

  it('promotes the next favorite when one occupies a podium slot', () => {
    const { blocks } = buildFeedRankingsBlocks({
      responses: { 'most-followed': followedResponse() },
      favIds: ['b', 'fav1', 'fav2'],
      nameMap: NAMES,
    });
    // b is badged on the podium, so BOTH remaining favorites still fit the
    // two visible rows instead of one being pushed into the disclosure.
    expect(blocks[0].favRows.map((r) => r.streamerId)).toEqual(['fav1', 'fav2']);
    expect(blocks[0].moreFavRows).toEqual([]);
  });

  it('splits favorites at RANKINGS_FAV_ROWS, best-ranked first', () => {
    // A third favorite at #10, so the page stays gap-free: 7, 10, 12.
    const withThird = followedResponse();
    withThird.data[9] = entry('fav3', 10, { follower_count: 1_200_000 });
    const { blocks } = buildFeedRankingsBlocks({
      responses: { 'most-followed': withThird },
      favIds: ['fav3', 'fav2', 'fav1'],
      nameMap: NAMES,
    });
    expect(blocks[0].favRows).toHaveLength(RANKINGS_FAV_ROWS);
    expect(blocks[0].favRows.map((r) => r.rank)).toEqual([7, 10]);
    expect(blocks[0].moreFavRows.map((r) => r.rank)).toEqual([12]);
  });

  it('reads placements beyond the fetched page from the per-streamer source', () => {
    const residual: Record<string, PublicStreamerRankings> = {
      deep: {
        streamer_id: 'deep',
        rankings: [
          {
            metric: 'most-followed',
            rank: 340,
            total: 512,
            value: 4_200,
            window_days: null,
            previous_rank: null,
          },
        ],
        games: [],
      },
    };
    const { blocks } = buildFeedRankingsBlocks({
      responses: { 'most-followed': followedResponse() },
      residual,
      favIds: ['fav1', 'deep'],
      nameMap: { ...NAMES, deep: 'Deep Cut' },
    });
    const deepRow = blocks[0].favRows.find((r) => r.streamerId === 'deep');
    expect(deepRow).toMatchObject({ rank: 340, total: 512, value: '4.2K', name: 'Deep Cut' });
    expect(deepRow?.trend).toEqual({ kind: 'none' });
  });

  it('omits a favorite silently when the residual call failed or has no placement', () => {
    const { blocks } = buildFeedRankingsBlocks({
      responses: { 'most-followed': followedResponse() },
      residual: { failed: null, unplaced: { streamer_id: 'unplaced', rankings: [], games: [] } },
      favIds: ['failed', 'unplaced'],
      nameMap: { failed: 'Failed', unplaced: 'Unplaced' },
    });
    expect(blocks[0].favRows).toEqual([]);
    expect(blocks[0].moreFavRows).toEqual([]);
  });

  it('prefers the fetched page over residual for the same favorite', () => {
    const residual: Record<string, PublicStreamerRankings> = {
      fav1: {
        streamer_id: 'fav1',
        rankings: [
          {
            metric: 'most-followed',
            rank: 999,
            total: 1000,
            value: 1,
            window_days: null,
            previous_rank: null,
          },
        ],
        games: [],
      },
    };
    const { blocks } = buildFeedRankingsBlocks({
      responses: { 'most-followed': followedResponse() },
      residual,
      favIds: ['fav1'],
      nameMap: NAMES,
    });
    expect(blocks[0].favRows).toHaveLength(1);
    expect(blocks[0].favRows[0].rank).toBe(7);
  });

  it('drops a residual placement without a known display name', () => {
    const residual: Record<string, PublicStreamerRankings> = {
      nameless: {
        streamer_id: 'nameless',
        rankings: [
          {
            metric: 'most-followed',
            rank: 50,
            total: 200,
            value: 10,
            window_days: null,
            previous_rank: null,
          },
        ],
        games: [],
      },
    };
    const { blocks } = buildFeedRankingsBlocks({
      responses: { 'most-followed': followedResponse() },
      residual,
      favIds: ['nameless'],
      nameMap: {},
    });
    expect(blocks[0].favRows).toEqual([]);
  });

  it('renders a trend arrow only when a baseline exists', () => {
    const { blocks } = buildFeedRankingsBlocks({
      responses: { 'most-followed': followedResponse() },
      favIds: ['fav1', 'fav2'],
      nameMap: NAMES,
    });
    // fav1 moved 10 -> 7, fav2 slipped 11 -> 12, the podium has no baseline.
    expect(blocks[0].favRows[0].trend).toEqual({ kind: 'up', delta: 3 });
    expect(blocks[0].favRows[1].trend).toEqual({ kind: 'down', delta: 1 });
    expect(blocks[0].top3[0].trend).toEqual({ kind: 'none' });
  });

  it('never reports an unknown baseline as a new entry', () => {
    // The snapshot table only reaches 100 deep, so "no baseline" usually means
    // "was outside the top 100" — an upward arrow there would be invented.
    const { blocks } = buildFeedRankingsBlocks({
      responses: {
        'most-followed': response(
          'most-followed',
          [
            entry('a', 1, { follower_count: 10 }),
            entry('b', 2, { follower_count: 9 }),
            entry('c', 3, { follower_count: 8 }),
          ],
          50,
        ),
      },
      favIds: [],
    });
    for (const row of blocks[0].top3) {
      expect(row.trend).toEqual({ kind: 'none' });
    }
  });

  it('keeps the podium when the viewer has no placed favorites', () => {
    const { blocks } = buildFeedRankingsBlocks({
      responses: { 'most-followed': followedResponse() },
      favIds: ['someone-else'],
      nameMap: {},
    });
    expect(blocks[0].top3).toHaveLength(3);
    expect(blocks[0].favRows).toEqual([]);
  });

  it('drops rows the leaderboard itself would not render, then re-ranks densely', () => {
    const withHoles = response(
      'most-followed',
      [
        entry('a', 1, { follower_count: 100 }),
        entry('zero', 2, { follower_count: 0 }),
        entry('b', 3, { follower_count: 80 }),
        entry('c', 4, { follower_count: 70 }),
      ],
      40,
    );
    const { blocks } = buildFeedRankingsBlocks({
      responses: { 'most-followed': withHoles },
      favIds: [],
    });
    expect(blocks[0].top3.map((r) => r.streamerId)).toEqual(['a', 'b', 'c']);
    expect(blocks[0].top3.map((r) => r.rank)).toEqual([1, 2, 3]);
    expect(blocks[0].top3[1].href).toBe('/rankings/most-followed#rank-2');
  });

  it('omits a block whose pool is too small to be meaningful', () => {
    const tiny = response(
      'most-followed',
      [entry('a', 1, { follower_count: 10 }), entry('b', 2, { follower_count: 9 })],
      2,
    );
    const { blocks } = buildFeedRankingsBlocks({ responses: { 'most-followed': tiny }, favIds: [] });
    expect(blocks).toEqual([]);
  });

  it('omits a block whose fetch failed and keeps the others', () => {
    const { blocks } = buildFeedRankingsBlocks({
      responses: {
        'most-followed': followedResponse(),
        'most-watched': null,
        'most-active': response('most-active', [], 0),
      },
      favIds: [],
    });
    expect(blocks.map((b) => b.metric)).toEqual(['most-followed']);
  });

  it('returns nothing when every metric failed', () => {
    expect(buildFeedRankingsBlocks({ responses: {}, favIds: ['fav1'] })).toEqual({
      blocks: [],
      favRiser: null,
    });
  });

  it('orders blocks by the site-wide ranking registry', () => {
    const { blocks } = buildFeedRankingsBlocks({
      responses: {
        'most-reliable': response(
          'most-reliable',
          [
            entry('r1', 1, { time_hit_rate: 0.92 }),
            entry('r2', 2, { time_hit_rate: 0.9 }),
            entry('r3', 3, { time_hit_rate: 0.88 }),
          ],
          40,
        ),
        'most-followed': followedResponse(),
      },
      favIds: [],
    });
    expect(blocks.map((b) => b.metric)).toEqual(['most-followed', 'most-reliable']);
    expect(blocks[1].title).toBe('Most punctual');
  });

  it('formats each metric with its own leaderboard formatter', () => {
    const { blocks } = buildFeedRankingsBlocks({
      responses: {
        'most-active': response(
          'most-active',
          [
            entry('h1', 1, { hours_streamed_28d: 182.5 }),
            entry('h2', 2, { hours_streamed_28d: 100 }),
            entry('h3', 3, { hours_streamed_28d: 90 }),
          ],
          40,
        ),
        'most-reliable': response(
          'most-reliable',
          [
            entry('r1', 1, { time_hit_rate: 0.9167 }),
            entry('r2', 2, { time_hit_rate: 0.9 }),
            entry('r3', 3, { time_hit_rate: 0.8 }),
          ],
          40,
        ),
        'fastest-growing': response(
          'fastest-growing',
          [
            entry('g1', 1, { follower_gain_7d: 12_400 }),
            entry('g2', 2, { follower_gain_7d: 9_000 }),
            entry('g3', 3, { follower_gain_7d: 800 }),
          ],
          40,
        ),
      },
      favIds: [],
    });
    const valueOf = (metric: RankingMetric) =>
      blocks.find((b) => b.metric === metric)!.top3[0].value;
    expect(valueOf('most-active')).toBe('182.5 h');
    expect(valueOf('most-reliable')).toBe('92%');
    expect(valueOf('fastest-growing')).toBe('+12.4K');
  });
});

describe('buildFeedRankingsBlocks — favRiser', () => {
  function growing(entries: PublicRankingEntry[]): RankingsResponse {
    return response('fastest-growing', entries, 120);
  }

  it('picks the favorite with the biggest weekly gain', () => {
    const { favRiser } = buildFeedRankingsBlocks({
      responses: {
        'fastest-growing': growing([
          entry('other', 1, { follower_gain_7d: 90_000 }),
          entry('fav1', 2, { follower_gain_7d: 12_400 }),
          entry('fav2', 3, { follower_gain_7d: 3_000 }),
        ]),
      },
      favIds: ['fav1', 'fav2'],
      nameMap: NAMES,
    });
    expect(favRiser).toMatchObject({ streamerId: 'fav1', gainLabel: '+12.4K', name: 'FAV1' });
    expect(favRiser?.href).toBe('/rankings/fastest-growing#rank-2');
  });

  it('counts a favorite that sits on the podium', () => {
    const { favRiser } = buildFeedRankingsBlocks({
      responses: {
        'fastest-growing': growing([
          entry('fav1', 1, { follower_gain_7d: 50_000 }),
          entry('x', 2, { follower_gain_7d: 40_000 }),
          entry('y', 3, { follower_gain_7d: 30_000 }),
        ]),
      },
      favIds: ['fav1'],
      nameMap: NAMES,
    });
    expect(favRiser?.streamerId).toBe('fav1');
  });

  it('stays silent when no favorite gained followers', () => {
    const { favRiser } = buildFeedRankingsBlocks({
      responses: {
        'fastest-growing': growing([
          entry('x', 1, { follower_gain_7d: 40_000 }),
          entry('y', 2, { follower_gain_7d: 30_000 }),
          entry('z', 3, { follower_gain_7d: 20_000 }),
        ]),
      },
      favIds: ['fav1'],
      nameMap: NAMES,
    });
    expect(favRiser).toBeNull();
  });

  it('reads a gain from the per-streamer source too', () => {
    const { favRiser } = buildFeedRankingsBlocks({
      responses: {
        'fastest-growing': growing([
          entry('x', 1, { follower_gain_7d: 40_000 }),
          entry('y', 2, { follower_gain_7d: 30_000 }),
          entry('z', 3, { follower_gain_7d: 20_000 }),
        ]),
      },
      residual: {
        deep: {
          streamer_id: 'deep',
          rankings: [
            {
              metric: 'fastest-growing',
              rank: 140,
              total: 400,
              value: 2_500,
              window_days: 7,
              previous_rank: null,
            },
          ],
          games: [],
        },
      },
      favIds: ['deep'],
      nameMap: { deep: 'Deep Cut' },
    });
    expect(favRiser).toMatchObject({ streamerId: 'deep', gainLabel: '+2.5K' });
  });
});

describe('pickResidualFavorites', () => {
  const followed = followedResponse();
  const watched = response(
    'most-watched',
    [entry('a', 1, { avg_view_count: 5000 }), entry('fav1', 2, { avg_view_count: 900 })],
    80,
  );

  it('asks for every favorite missing from at least one fetched page', () => {
    // fav2 is in the followers page but not the watched page — it still needs a
    // call, or its most-watched placement would silently never be shown.
    expect(pickResidualFavorites(['fav1', 'fav2'], { 'most-followed': followed, 'most-watched': watched })).toEqual([
      'fav2',
    ]);
  });

  it('skips a favorite already present in every fetched page', () => {
    expect(pickResidualFavorites(['fav1'], { 'most-followed': followed, 'most-watched': watched })).toEqual([]);
  });

  it('caps the number of calls and keeps favorite order', () => {
    const many = Array.from({ length: 30 }, (_, i) => `f${i}`);
    const picked = pickResidualFavorites(many, { 'most-followed': followed });
    expect(picked).toHaveLength(RESIDUAL_RANKINGS_CAP);
    expect(picked[0]).toBe('f0');
  });

  it('honors an explicit cap', () => {
    expect(
      pickResidualFavorites(['off1', 'off2', 'off3'], { 'most-followed': followed }, 2),
    ).toEqual(['off1', 'off2']);
  });

  it('spends nothing when no page was fetched', () => {
    expect(pickResidualFavorites(['fav1'], {})).toEqual([]);
    expect(pickResidualFavorites(['fav1'], { 'most-followed': null })).toEqual([]);
  });
});
