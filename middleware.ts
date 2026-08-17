import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware-helper';
import { isUiLang, localeHref, type UiLang } from '@/lib/i18n-core';
import { staleSlotRedirectSlug } from '@/lib/prediction-redirect';

/**
 * M22 locale routing (composed with the Supabase session refresh):
 *
 *   /streamer/foo        → rewrite  → /en/streamer/foo   (unprefixed = English)
 *   /de/streamer/foo     → pass through (matches app/[locale] directly)
 *   /en/streamer/foo     → 308      → /streamer/foo      (exactly ONE English URL)
 *
 * Locale never comes from Accept-Language or cookies here — a deterministic
 * URL→content mapping keeps CDN caching clean and crawlers safe (no cloaking).
 * The NEXT_LOCALE cookie is read client-side only (suggestion banner).
 *
 * Session-cookie survival: `updateSession()` may attach refreshed sb-* cookies
 * to its response. Rewrites/redirects build a NEW response, so those cookies
 * are copied over explicitly — dropping them silently logs users out (the
 * classic compose failure mode; covered by middleware.test.ts).
 */

// Route handlers + metadata routes that live at the app/ root and must never
// be locale-rewritten. /auth/login etc. are PAGES and are NOT listed here.
// The brand og/twitter images moved into app/[locale]/ (metadata file
// conventions only attach within their own segment), so /opengraph-image and
// /twitter-image now go through the normal /en rewrite like any page.
const PASSTHROUGH_EXACT = new Set([
  '/get',
  '/auth/callback',
  '/auth/confirm',
  '/auth/sign-out',
]);

function isPassthrough(pathname: string): boolean {
  if (pathname === '/api' || pathname.startsWith('/api/')) return true;
  if (PASSTHROUGH_EXACT.has(pathname)) return true;
  // Anything with a file extension: sitemap.xml, robots.txt, llms.txt,
  // manifest.webmanifest, icons, /screenshots/*.webp and other public/ assets.
  if (pathname.includes('.')) return true;
  return false;
}

/**
 * Target for a /schedule/<id> URL whose id is old enough to be provably dead,
 * or null to let the request take the normal route.
 *
 * Why this lives in middleware rather than in the page: the page can only
 * decide after asking the Partner API, and that answer is written back into the
 * ISR cache. With `revalidate = 300` and crawlers re-hitting a given dead URL
 * roughly every 25 minutes, the entry is ALWAYS stale on arrival — so every
 * single crawler hit paid for a full render, a Partner-API 404 and a billed ISR
 * write, with no amortisation whatsoever. Measured 2026-08-17: a crawl wave
 * through ~4,900 long-dead ids produced 12.8k Partner-API 404s in one hour.
 * Answering here costs an edge request and nothing else.
 *
 * This does NOT shrink the crawlers' URL frontier — the impersonation botnet
 * ignores robots.txt and re-fetches ids that have been dead for two weeks, so
 * no status code makes it forget them. It makes those hits free instead.
 */
function deadSlotRedirectPath(pathname: string, nowMs: number): string | null {
  const [, first, ...rest] = pathname.split('/');

  // `/en/*` is normalised away before this runs, so a locale here is non-English.
  const locale: UiLang = isUiLang(first) ? first : 'en';
  const segments = isUiLang(first) ? rest : [first, ...rest];

  // Exactly `/schedule/<id>` — never a longer path, never a trailing slash.
  if (segments.length !== 2 || segments[0] !== 'schedule') return null;

  // Deliberately NOT decodeURIComponent'd: it throws on malformed escapes, and
  // an encoded id simply fails the id pattern and falls through to the page.
  const slug = staleSlotRedirectSlug(segments[1], nowMs);
  return slug ? localeHref(locale, `/streamer/${slug}`) : null;
}

function withSessionCookies(response: NextResponse, sessionResponse: NextResponse): NextResponse {
  for (const cookie of sessionResponse.cookies.getAll()) {
    response.cookies.set(cookie);
  }
  return response;
}

export async function middleware(request: NextRequest) {
  // Refresh the Supabase session first — it also updates request.cookies so a
  // rewritten request forwards the fresh token to server components.
  const sessionResponse = await updateSession(request);

  const pathname = request.nextUrl.pathname;
  if (isPassthrough(pathname)) {
    return sessionResponse;
  }

  const [, first, ...rest] = pathname.split('/');

  // /en/* → 308 to the unprefixed URL (query preserved by nextUrl.clone()).
  if (first === 'en') {
    const url = request.nextUrl.clone();
    url.pathname = `/${rest.join('/')}`;
    return withSessionCookies(NextResponse.redirect(url, 308), sessionResponse);
  }

  // Long-dead prediction slot URL → 308 straight to the streamer page, without
  // rendering the route or calling the Partner API. Same destination and same
  // status the page would have produced, just before any billable work.
  const deadSlotTarget = deadSlotRedirectPath(pathname, Date.now());
  if (deadSlotTarget !== null) {
    const url = request.nextUrl.clone();
    url.pathname = deadSlotTarget;
    return withSessionCookies(NextResponse.redirect(url, 308), sessionResponse);
  }

  // Known non-English locale → matches app/[locale]/* directly.
  if (isUiLang(first)) {
    return sessionResponse;
  }

  // Unprefixed (or unknown first segment) → serve the English tree. Unknown
  // segments 404 inside it (/xyzzy → /en/xyzzy → app/[locale]/not-found).
  const url = request.nextUrl.clone();
  url.pathname = pathname === '/' ? '/en' : `/en${pathname}`;
  return withSessionCookies(NextResponse.rewrite(url, { request }), sessionResponse);
}

export const config = {
  matcher: [
    // Run on all paths except Next.js internals + static assets.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
