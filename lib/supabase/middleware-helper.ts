import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Hard wall-clock budget for the session refresh. The middleware runs in front
 * of EVERY page, so a hanging GoTrue call does not degrade auth — it 504s the
 * whole site (Vercel kills the edge middleware at its invocation limit and
 * returns MIDDLEWARE_INVOCATION_TIMEOUT). That happened on 2026-07-26/27/28
 * while the Supabase instance was swapping.
 *
 * A healthy round trip measures ~100ms from Vercel, so 2.5s is ~25x headroom:
 * it only ever fires when the auth backend is genuinely unwell.
 */
export const SESSION_REFRESH_BUDGET_MS = 2_500;

/**
 * Refreshes the Supabase session cookie on every matched request. Must be
 * called from `middleware.ts` at the project root. Without this, refresh
 * tokens never get exchanged and the user is silently logged out as soon as
 * the access token expires.
 *
 * Bounded by SESSION_REFRESH_BUDGET_MS. On timeout the request is served
 * WITHOUT a refreshed session rather than not at all: the existing cookies are
 * forwarded untouched, so the user is not logged out — the refresh is simply
 * deferred to the next request. Public pages (everything except /feed,
 * /favorites, /program, /settings, /onboarding and /auth/*) never call
 * `getUser()` themselves, so for them this is the ONLY Supabase touchpoint and
 * bounding it keeps them serving from the ISR cache exactly as they do for
 * anonymous visitors.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  // Cookie-less visitors (all anonymous SEO traffic) carry no session to
  // refresh — skip Supabase client construction entirely. Every cookie
  // @supabase/ssr sets starts with "sb-" (the auth token may be chunked
  // into sb-…-auth-token.0/.1, which still matches the prefix), so this
  // check is robust against cookie-name changes between SDK versions.
  const hasAuthCookie = request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith('sb-'));
  if (!hasAuthCookie) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  // ONE deadline drives both halves of the budget:
  //   - as an AbortSignal it cancels the in-flight GoTrue request, and makes
  //     every subsequent retry fail instantly instead of opening new sockets;
  //   - as a race participant it guarantees this function returns, which the
  //     signal alone does NOT: auth-js wraps an aborted fetch into a
  //     *retryable* error and keeps retrying with exponential backoff until
  //     AUTO_REFRESH_TICK_DURATION_MS (30s) — well past the middleware limit.
  const deadline = new AbortController();
  const timer = setTimeout(() => deadline.abort(), SESSION_REFRESH_BUDGET_MS);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: (input, init) => fetch(input, { ...init, signal: deadline.signal }),
      },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const timedOut = new Promise<void>((resolve) => {
    if (deadline.signal.aborted) {
      resolve();
      return;
    }
    deadline.signal.addEventListener('abort', () => resolve(), { once: true });
  });

  try {
    // Reading the user triggers the refresh-cookie write if needed.
    // getUser() reports network failures via its `error` field rather than
    // throwing, but non-auth errors do propagate — swallow them so a broken
    // auth backend can never take the page down with it.
    await Promise.race([supabase.auth.getUser().catch(() => undefined), timedOut]);
  } finally {
    clearTimeout(timer);
  }

  // Either the refresh completed (setAll may have replaced `response` with one
  // carrying fresh cookies) or the budget ran out and `response` still forwards
  // the request unchanged. A late setAll cannot corrupt what we return here: it
  // reassigns the local variable to a NEW NextResponse, it does not mutate this
  // one.
  return response;
}
