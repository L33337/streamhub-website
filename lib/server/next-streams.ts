import 'server-only';

import { getPartnerApi, type PublicStreamSlot } from './partner-api';
import { pickEarliestSlotPerStreamer } from '@/lib/next-stream';

/** Partner API caps repeated streamer_id filters at 100 per request. */
const CHUNK_SIZE = 100;
/** Safety cap per chunk — 4 × 500 slots is far beyond 100 streamers' week. */
const MAX_PAGES = 4;
/**
 * Fetch window. 7 days matches the prediction horizon AND keeps the bare
 * weekday label of lib/next-stream.ts `nextStreamLabel` unambiguous.
 */
const WINDOW_DAYS = 7;
/**
 * `from`/`to` are rounded down to this bucket so the request URL — and with
 * it the Next.js data-cache key — stays stable across regenerations inside
 * the revalidate window. A raw `new Date().toISOString()` would produce a
 * unique URL every render and silently disable data caching entirely.
 * Exported (W2.2) so the homepage discover sample can seed its PRNG on the
 * SAME anchor — sample rotation and fetch-window bucketing must flip
 * together or the URL would change mid-bucket anyway.
 */
export const BUCKET_MS = 300_000;

/**
 * Earliest upcoming slot (announced or predicted, always-on excluded) within
 * the next 7 days for each of the given streamer ids. Decoration data for the
 * /rankings "Next stream" column: every failure path degrades to the entries
 * collected so far (worst case an empty map — the column renders "—"), never
 * a throw. Ids beyond the API's 100-id filter cap are chunked.
 */
export async function getNextSlotByStreamer(
  ids: string[],
): Promise<Map<string, PublicStreamSlot>> {
  const result = new Map<string, PublicStreamSlot>();
  // Sorted (W2.2): the id list is part of the fetch URL = the data-cache key.
  // Callers passing the same SET of ids in a different order must share one
  // cache entry; the returned Map makes order irrelevant to every caller.
  const unique = [...new Set(ids.filter((id) => id.length > 0))].sort();
  if (unique.length === 0) return result;

  let api: ReturnType<typeof getPartnerApi>;
  try {
    api = getPartnerApi();
  } catch {
    return result; // missing env — decoration silently absent
  }

  const bucket = Math.floor(Date.now() / BUCKET_MS) * BUCKET_MS;
  const from = new Date(bucket).toISOString();
  const to = new Date(bucket + WINDOW_DAYS * 86_400_000).toISOString();

  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += CHUNK_SIZE) {
    chunks.push(unique.slice(i, i + CHUNK_SIZE));
  }

  await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const rows: PublicStreamSlot[] = [];
        const seen = new Set<string>();
        let cursor: string | undefined;
        let pages = 0;
        do {
          const resp = await api.listSchedules({
            streamerIds: chunk,
            status: ['upcoming'],
            from,
            to,
            includeAlwaysOn: false,
            limit: 500,
            cursor,
            revalidate: 300,
          });
          for (const slot of resp.data) {
            rows.push(slot);
            seen.add(slot.streamer_id);
          }
          cursor = resp.pagination.next_cursor ?? undefined;
          pages++;
          // Ascending start_time ordering: once every id has appeared, later
          // pages can only contain later slots — nothing left to learn.
          if (seen.size >= chunk.length) break;
        } while (cursor && pages < MAX_PAGES);
        for (const [id, slot] of pickEarliestSlotPerStreamer(rows)) {
          result.set(id, slot);
        }
      } catch {
        // Chunk failed — other chunks' results still render.
      }
    }),
  );
  return result;
}
