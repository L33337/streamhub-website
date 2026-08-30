/**
 * Region pinning for Supabase Edge Function calls (2026-08-29 health check).
 *
 * Supabase runs an Edge Function in the region closest to the CALLER, but the
 * project's Postgres lives in eu-west-1 (Dublin). Before this change the
 * website's functions ran in iad1, so every Partner API call executed in
 * us-east-1 and paid 3–5 transatlantic round trips to the database: the same
 * code path measured 390 ms in us-east-1 versus 122 ms in eu-west-1.
 *
 * Two mechanisms pin the region, both verified against production
 * (`x-sb-edge-region` echoes the region that ran):
 *   - the `x-region` request header — used by the server-side Partner API
 *     client, where we control every header;
 *   - the `forceFunctionRegion` query parameter — used by BROWSER calls
 *     (search-streamers, add-streamer, import-twitch-follows, delete-account),
 *     because the functions' CORS allow-list does not include `x-region` and a
 *     custom header would fail the preflight. The gateway reads the parameter
 *     before the function runs, so no backend change is needed.
 *
 * Documented trade-off: a pinned request is NOT re-routed when that region is
 * down. Acceptable — when eu-west-1 is down so is the database.
 *
 * Client-safe on purpose (no `server-only`): the browser callers import it too.
 * Keep the value in sync with the app's `EDGE_FUNCTION_REGION`.
 */

export const SUPABASE_FUNCTIONS_REGION = 'eu-west-1';

/** Header understood by the Supabase Edge Functions gateway. */
export const SUPABASE_REGION_HEADER = 'x-region';

/** Query parameter understood by the gateway (what supabase-js sets too). */
export const SUPABASE_REGION_PARAM = 'forceFunctionRegion';

/**
 * Appends `forceFunctionRegion=<region>` to an Edge Function URL. Idempotent
 * (an existing value is replaced) and query-string aware.
 */
export function withFunctionRegion(url: string, region: string = SUPABASE_FUNCTIONS_REGION): string {
  const parsed = new URL(url);
  parsed.searchParams.set(SUPABASE_REGION_PARAM, region);
  return parsed.toString();
}
