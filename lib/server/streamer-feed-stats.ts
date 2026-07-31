import 'server-only';

/**
 * Reads the nightly `streamer_feed_stats` cache (pg_cron 04:15 UTC) for the
 * homepage "Streamer Wiki" cards: top category + 28-day stream count.
 *
 * The table carries a `Public read streamer_feed_stats` RLS policy, so the
 * anon key reaches it — no Partner API route needed (the /v1/streamers DTO
 * exposes these numbers only under a `?category=` filter).
 */

import { anonRestGet } from './anon-rest';
import { topCategoryOf, type WikiFeedStats } from '@/lib/home/streamer-wiki';

/** Matches the nightly refresh cadence — the data only changes at 04:15 UTC. */
const REVALIDATE_SECONDS = 1800;

interface FeedStatsRow {
  streamer_id: string;
  category_shares: Record<string, number> | null;
  streams_28d: number | null;
}

/**
 * Returns null when the fetch FAILS — callers must distinguish that from an
 * empty map ("queried, nobody has stats"), because a failure must degrade the
 * cards rather than delete the section (see pickWikiStreamers).
 */
export async function fetchStreamerFeedStats(
  ids: string[],
): Promise<Map<string, WikiFeedStats> | null> {
  const unique = [...new Set(ids.filter((id) => id.length > 0))];
  if (unique.length === 0) return new Map();

  // PostgREST `in.()` needs each value quoted — ids are slugs today, but a
  // comma or paren in one would otherwise split the filter list (same guard
  // as lib/server/most-streamed.ts).
  const quotedIds = unique.map((id) => `"${id.replace(/"/g, '')}"`).join(',');
  const rows = await anonRestGet<FeedStatsRow>(
    'streamer_feed_stats?select=streamer_id,category_shares,streams_28d' +
      `&streamer_id=in.(${encodeURIComponent(quotedIds)})`,
    REVALIDATE_SECONDS,
  );
  if (rows === null) return null;

  return new Map(
    rows.map((row) => [
      row.streamer_id,
      {
        streamerId: row.streamer_id,
        topCategory: topCategoryOf(row.category_shares),
        streams28d: row.streams_28d,
      },
    ]),
  );
}
