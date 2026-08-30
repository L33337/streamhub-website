'use client';

// Lazy Supabase browser client (2026-08-29 health check).
//
// This module deliberately has NO static import of `@supabase/ssr`: the
// providers in the root layout import it, and a static import here put the
// whole supabase-js bundle (GoTrue + Realtime + Storage + Functions, 238 KB
// raw / 62 KB gzip, ~25 % of the JS on every route) into every page load —
// for anonymous visitors, who never make a single Supabase request.
//
// The client is created on first use through a dynamic `import()`, and the
// providers only ask for it once they have SEEN an auth cookie. Components
// that live on auth-gated/dynamic pages and need the client synchronously in
// render use `./client-eager` (same underlying singleton; @supabase/ssr caches
// the browser client internally, so both entry points return one instance).

import type { SupabaseClient } from '@supabase/supabase-js';

/** Cookie name prefix written by @supabase/ssr (`sb-<ref>-auth-token[.N]`). */
const AUTH_COOKIE_PREFIX = 'sb-';

/**
 * True when the document carries a Supabase auth cookie. Pure: pass a cookie
 * string to test it; defaults to `document.cookie` in the browser and to
 * `false` on the server (the root layout is static, it must never read
 * cookies). The auth cookie is NOT HttpOnly (@supabase/ssr default), which is
 * what makes this a plain string check — the same `sb-` prefix rule the
 * middleware uses to skip anonymous requests.
 */
export function hasSupabaseAuthCookie(
  cookieString: string | undefined = typeof document === 'undefined' ? undefined : document.cookie,
): boolean {
  if (!cookieString) return false;
  return cookieString.split(';').some((part) => part.trim().startsWith(AUTH_COOKIE_PREFIX));
}

let _clientPromise: Promise<SupabaseClient> | null = null;

/**
 * Resolves the shared browser client, loading supabase-js on first call.
 * Concurrent callers share one in-flight import; a failed import is forgotten
 * so the next call retries instead of caching the rejection forever.
 */
export function getSupabaseBrowserClient(): Promise<SupabaseClient> {
  if (_clientPromise) return _clientPromise;
  _clientPromise = import('./client-eager')
    .then(({ createSupabaseBrowserClient }) => createSupabaseBrowserClient())
    .catch((err) => {
      _clientPromise = null;
      throw err;
    });
  return _clientPromise;
}
