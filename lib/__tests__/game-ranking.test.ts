import { describe, it, expect } from 'vitest';
import { rankGameStreamers } from '../game-ranking';
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
