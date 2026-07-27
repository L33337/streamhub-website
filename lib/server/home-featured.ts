import 'server-only';

// Featured streamer ids for the homepage (2026-07-27): "Today's lineup" and
// "Most streamed this week" are editorially curated surfaces — only
// streamers.is_featured rows appear. The Partner API has no featured filter,
// but the streamers table is anon-readable, so one cached id sweep suffices
// (~480 rows today, well under the 1000-row PostgREST cap).

import { anonRestGet } from './anon-rest';

/**
 * Returns null on failure — callers should treat that as "filter unavailable"
 * and fall back to the unfiltered list (a mixed lineup beats an empty one).
 */
export async function fetchFeaturedStreamerIds(): Promise<Set<string> | null> {
  const rows = await anonRestGet<{ id: string }>(
    'streamers?select=id&is_featured=eq.true&is_hidden=eq.false&approved=eq.true&limit=1000',
    1800,
  );
  if (!rows) return null;
  return new Set(rows.map((row) => row.id));
}
