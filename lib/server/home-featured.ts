import 'server-only';

// Featured streamers for the homepage (2026-07-27): "Today's lineup", the
// discover grid and "Most streamed this week" are editorially curated
// surfaces — only streamers.is_featured rows appear. The Partner API has no
// featured filter, but the streamers table is anon-readable, so one cached
// sweep suffices (~480 rows today, well under the 1000-row PostgREST cap).

import { anonRestGet } from './anon-rest';

export interface FeaturedStreamer {
  id: string;
  name: string;
  avatar_url: string | null;
  follower_count: number | null;
}

/**
 * Returns null on failure — callers should treat that as "featured pool
 * unavailable" and fall back to the popular list (a mixed section beats an
 * empty one).
 */
export async function fetchFeaturedStreamers(): Promise<FeaturedStreamer[] | null> {
  return anonRestGet<FeaturedStreamer>(
    'streamers?select=id,name,avatar_url,follower_count' +
      '&is_featured=eq.true&is_hidden=eq.false&approved=eq.true&limit=1000',
    1800,
  );
}
