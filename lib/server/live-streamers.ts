import 'server-only';

import { getPartnerApi } from './partner-api';

let _cache: { set: Set<string>; expiresAt: number } | null = null;

const CACHE_TTL_MS = 60_000;
const MAX_PAGES = 5;
/**
 * `from`/`to` are floored to this bucket so the request URLs — and with them
 * the Next.js data-cache keys — are shared across pages and build workers
 * (lib/server/next-streams.ts convention). Raw `Date.now()` timestamps made
 * every caller fire its own uncached sweep; during `next build` that
 * multiplied across the hub pages × 12 locales and contributed to the
 * partner-API saturation that timed out the sitemap (build failure
 * 2026-07-27). The process-local cache above still handles the hot path.
 */
const BUCKET_MS = 300_000;

/**
 * Returns the set of streamer ids that are currently live (including always-on
 * channels). Process-local cache (60 s) sits in front of the Partner API's own
 * 60 s revalidate, so the hot path is a constant-time Set lookup with no
 * outbound request.
 */
export async function getLiveStreamerIdSet(): Promise<Set<string>> {
  if (_cache && _cache.expiresAt > Date.now()) return _cache.set;

  const api = getPartnerApi();
  const ids = new Set<string>();
  let cursor: string | undefined = undefined;
  let pages = 0;

  // Partner API filters by start_time >= from; live slots whose start_time
  // is in the past (the common case) would otherwise be dropped. Always-on
  // streamers in particular have start_times that are days or weeks old.
  const bucket = Math.floor(Date.now() / BUCKET_MS) * BUCKET_MS;
  const wideFrom = new Date(bucket - 365 * 86_400_000).toISOString();
  const wideTo = new Date(bucket + 6 * 60 * 60 * 1000).toISOString();

  do {
    const resp = await api.listSchedules({
      status: ['live'],
      includeAlwaysOn: true,
      from: wideFrom,
      to: wideTo,
      cursor,
      limit: 500,
      revalidate: 60,
    });
    for (const slot of resp.data) ids.add(slot.streamer_id);
    cursor = resp.pagination.next_cursor ?? undefined;
    pages++;
  } while (cursor && pages < MAX_PAGES);

  _cache = { set: ids, expiresAt: Date.now() + CACHE_TTL_MS };
  return ids;
}
