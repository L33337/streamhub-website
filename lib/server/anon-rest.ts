import 'server-only';

/**
 * GET a PostgREST path with the ANON key + ISR data-cache — the
 * lib/server/trending.ts pattern generalized (homepage rebuild 2026-07-27).
 * Deliberately a plain `fetch`, NOT lib/supabase/server.ts: that client reads
 * `cookies()` and would force the calling page dynamic (ISR-K1 rule). Only
 * tables/rows with an anon-read RLS policy are reachable this way.
 *
 * Returns null on any failure (missing env, non-2xx, network, non-array body)
 * so callers degrade to an absent section instead of throwing — a throw during
 * prerender aborts the whole production build (2026-07-07 incident).
 */
export async function anonRestGet<T>(
  pathWithQuery: string,
  revalidateSeconds: number,
): Promise<T[] | null> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) return null;

  try {
    const res = await fetch(`${base}/rest/v1/${pathWithQuery}`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      next: { revalidate: revalidateSeconds },
    });
    if (!res.ok) return null;
    const json: unknown = await res.json();
    return Array.isArray(json) ? (json as T[]) : null;
  } catch {
    return null;
  }
}
