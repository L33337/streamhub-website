import type { PublicStreamer } from '@/lib/server/partner-api';

export interface RankedGameStreamer {
  rank: number; // 1-based
  streamer: PublicStreamer;
}

/**
 * Ranks a game/category's streamers by follower count for the "Most followed
 * {game} streamers" table. Pure + deterministic so it can be unit-tested and
 * reused across renders.
 *
 * - Excludes streamers with no usable follower count (`null` or `<= 0`) — the
 *   table never shows "0" followers, and a missing count can't be ranked
 *   honestly. Those streamers still appear elsewhere on the page (the "More …"
 *   grid), just not in the ranking.
 * - Sorts by follower_count desc, tie-broken by avg_view_count desc (nulls
 *   last), then name asc. The Partner API already returns follower-desc order,
 *   but re-sorting keeps the helper correct independent of input order.
 * - Returns at most `limit` rows with a 1-based rank.
 */
export function rankGameStreamers(
  streamers: PublicStreamer[],
  limit: number,
): RankedGameStreamer[] {
  return streamers
    .filter((s) => s.follower_count != null && s.follower_count > 0)
    .sort((a, b) => {
      const byFollowers = (b.follower_count ?? 0) - (a.follower_count ?? 0);
      if (byFollowers !== 0) return byFollowers;
      const byViewers = (b.avg_view_count ?? 0) - (a.avg_view_count ?? 0);
      if (byViewers !== 0) return byViewers;
      return a.name.localeCompare(b.name);
    })
    .slice(0, Math.max(0, limit))
    .map((streamer, i) => ({ rank: i + 1, streamer }));
}
