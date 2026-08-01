import { describe, expect, it } from 'vitest';
import type { PublicRankingEntry, PublicStreamer } from '@/lib/server/partner-api';
import { getRankingPageSpec } from '@/lib/rankings';
import {
  computeMovers,
  isClimbersIndexable,
  MAX_CLIMBERS_PER_METRIC,
  MAX_NEWCOMERS_PER_METRIC,
  MIN_INDEXABLE_MOVERS,
  topClimber,
  topClimbersAcrossMetrics,
  totalMoverCount,
} from '@/lib/rankings-climbers';
import { leaderboardOgProps } from '@/lib/og/leaderboard-props';

const spec = getRankingPageSpec('most-followed')!;
const watchedSpec = getRankingPageSpec('most-watched')!;

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

describe('computeMovers', () => {
  it('splits climbers and newcomers, ignores fallers/unchanged', () => {
    const m = computeMovers(spec, [
      entry(1, { follower_count: 100, previous_rank: 1 }), // unchanged
      entry(2, { follower_count: 90, previous_rank: 5 }), // up 3
      entry(3, { follower_count: 80, previous_rank: 2 }), // down 1
      entry(4, { follower_count: 70, previous_rank: null }), // new in top 100
    ]);
    expect(m.climbers).toHaveLength(1);
    expect(m.climbers[0].entry.rank).toBe(2);
    expect(m.climbers[0].delta).toBe(3);
    expect(m.climbers[0].previousRank).toBe(5);
    expect(m.newcomers.map((e) => e.rank)).toEqual([4]);
    expect(m.hasTrendData).toBe(true);
  });

  it('previous_rank ABSENT means warming up — never a mover, hasTrendData false', () => {
    const m = computeMovers(spec, [
      entry(1, { follower_count: 100 }),
      entry(2, { follower_count: 90 }),
    ]);
    expect(m.climbers).toHaveLength(0);
    expect(m.newcomers).toHaveLength(0);
    expect(m.hasTrendData).toBe(false);
  });

  it('sorts climbers by delta desc, ties by better current rank; newcomers by rank', () => {
    const m = computeMovers(spec, [
      entry(10, { follower_count: 50, previous_rank: 15 }), // up 5
      entry(3, { follower_count: 90, previous_rank: 12 }), // up 9
      entry(7, { follower_count: 60, previous_rank: 12 }), // up 5, better rank than #10
      entry(90, { follower_count: 10, previous_rank: null }),
      entry(40, { follower_count: 20, previous_rank: null }),
    ]);
    expect(m.climbers.map((c) => c.entry.rank)).toEqual([3, 7, 10]);
    expect(m.newcomers.map((e) => e.rank)).toEqual([40, 90]);
  });

  it('caps climbers and newcomers per metric', () => {
    const entries = [
      // 15 climbers with increasing deltas + 8 newcomers.
      ...Array.from({ length: 15 }, (_, i) =>
        entry(i + 1, { follower_count: 100 - i, previous_rank: i + 2 + i }),
      ),
      ...Array.from({ length: 8 }, (_, i) =>
        entry(50 + i, { follower_count: 30 - i, previous_rank: null }),
      ),
    ];
    const m = computeMovers(spec, entries);
    expect(m.climbers).toHaveLength(MAX_CLIMBERS_PER_METRIC);
    expect(m.newcomers).toHaveLength(MAX_NEWCOMERS_PER_METRIC);
  });

  it('carries refreshedAt through', () => {
    const m = computeMovers(spec, [], '2026-07-27T04:15:00Z');
    expect(m.refreshedAt).toBe('2026-07-27T04:15:00Z');
  });
});

describe('index gate + cross-metric helpers', () => {
  const climberEntries = (n: number) =>
    Array.from({ length: n }, (_, i) =>
      entry(i + 1, { follower_count: 100 - i, previous_rank: i + 5 }),
    );

  it('indexable only from MIN_INDEXABLE_MOVERS rendered movers', () => {
    const thin = [computeMovers(spec, climberEntries(MIN_INDEXABLE_MOVERS - 1))];
    const enough = [
      computeMovers(spec, climberEntries(5)),
      computeMovers(watchedSpec, climberEntries(5)),
    ];
    expect(totalMoverCount(thin)).toBe(MIN_INDEXABLE_MOVERS - 1);
    expect(isClimbersIndexable(thin)).toBe(false);
    expect(isClimbersIndexable(enough)).toBe(true);
  });

  it('topClimber finds the biggest delta across metrics', () => {
    const a = computeMovers(spec, [entry(2, { follower_count: 90, previous_rank: 6 })]);
    const b = computeMovers(watchedSpec, [entry(9, { avg_view_count: 500, previous_rank: 20 })]);
    const best = topClimber([a, b]);
    expect(best?.movers.spec.slug).toBe('most-watched');
    expect(best?.climber.delta).toBe(11);
    expect(topClimber([computeMovers(spec, [])])).toBeNull();
  });

  it('topClimbersAcrossMetrics dedupes by streamer, best delta wins', () => {
    const shared = { id: 'same', name: 'Same' };
    const a = computeMovers(spec, [
      entry(2, { follower_count: 90, previous_rank: 4 }, shared), // up 2
    ]);
    const b = computeMovers(watchedSpec, [
      entry(5, { avg_view_count: 500, previous_rank: 14 }, shared), // up 9
      entry(8, { avg_view_count: 400, previous_rank: 11 }), // up 3
    ]);
    const top = topClimbersAcrossMetrics([a, b], 3);
    expect(top).toHaveLength(2);
    expect(top[0].entry.streamer.id).toBe('same');
    expect(top[0].delta).toBe(9);
    expect(top[1].delta).toBe(3);
  });
});

describe('leaderboardOgProps', () => {
  it('builds medal pills from the top 3 and the #1 lead line as subtitle', () => {
    const props = leaderboardOgProps(spec, [
      entry(1, { follower_count: 24_500_000 }, { name: 'Stray Kids' }),
      entry(2, { follower_count: 12_000_000 }, { name: 'B' }),
      entry(3, { follower_count: 9_000_000 }, { name: 'C' }),
      entry(4, { follower_count: 1_000_000 }, { name: 'D' }),
    ]);
    expect(props.title).toBe(spec.h1);
    expect(props.eyebrow).toBe('Streamer Rankings');
    expect(props.pills?.map((p) => p.label)).toEqual(['#1 Stray Kids', '#2 B', '#3 C']);
    // First sentence of buildDescription, period stripped.
    expect(props.subtitle).toBe('Stray Kids leads with 24.5M followers');
  });

  it('degrades to the count-free methodology opener without entries', () => {
    const props = leaderboardOgProps(spec, []);
    expect(props.pills).toEqual([]);
    expect(props.subtitle).toBe(
      'The most followed livestreamers on Twitch and YouTube, ranked by followers and subscribers',
    );
  });

  it('truncates long display names in pills', () => {
    const props = leaderboardOgProps(spec, [
      entry(1, { follower_count: 100 }, { name: 'AVeryVeryLongStreamerName' }),
    ]);
    expect(props.pills?.[0].label).toBe('#1 AVeryVeryLongStream…');
  });
});
