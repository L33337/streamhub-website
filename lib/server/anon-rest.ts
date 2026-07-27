import 'server-only';

/**
 * GET a PostgREST path with the ANON key + ISR data-cache — the
 * lib/server/trending.ts pattern generalized (homepage rebuild 2026-07-27).
 * Deliberately a plain `fetch`, NOT lib/supabase/server.ts: that client reads
 * `cookies()` and would force the calling page dynamic (ISR-K1 rule). Only
 * tables/rows with an anon-read RLS policy are reachable this way.
 *
 * One retry on failure: a transient hiccup during a saturated build would
 * otherwise cache a missing section for the whole revalidate window (seen
 * 2026-07-27 — quick-facts cards vanished for an hour after one bad fetch).
 *
 * Returns null on persistent failure (missing env, non-2xx, network,
 * non-array body) so callers degrade to an absent section instead of
 * throwing — a throw during prerender aborts the whole production build.
 */
export async function anonRestGet<T>(
  pathWithQuery: string,
  revalidateSeconds: number,
): Promise<T[] | null> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) return null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${base}/rest/v1/${pathWithQuery}`, {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        next: { revalidate: revalidateSeconds },
      });
      if (res.ok) {
        const json: unknown = await res.json();
        if (Array.isArray(json)) return json as T[];
      }
    } catch {
      // fall through to the retry / null
    }
    if (attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  return null;
}

/**
 * Paged variant for result sets beyond PostgREST's max-rows cap (1000):
 * appends `limit`/`offset` per page and stops on a short page. The caller's
 * query MUST carry a deterministic `order` — offset pagination over an
 * unordered set silently duplicates/drops rows. Failed pages end the walk
 * (partial data beats none for decoration sections).
 */
export async function anonRestGetPaged<T>(
  pathWithQuery: string,
  revalidateSeconds: number,
  pageSize = 1000,
  maxPages = 3,
): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 0; page < maxPages; page++) {
    const pageRows = await anonRestGet<T>(
      `${pathWithQuery}&limit=${pageSize}&offset=${page * pageSize}`,
      revalidateSeconds,
    );
    if (!pageRows) break;
    rows.push(...pageRows);
    if (pageRows.length < pageSize) break;
  }
  return rows;
}
