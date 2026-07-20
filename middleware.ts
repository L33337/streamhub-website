import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware-helper';
import { isUiLang } from '@/lib/i18n-core';

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
const PASSTHROUGH_EXACT = new Set([
  '/get',
  '/auth/callback',
  '/auth/confirm',
  '/auth/sign-out',
  '/opengraph-image',
  '/twitter-image',
]);

function isPassthrough(pathname: string): boolean {
  if (pathname === '/api' || pathname.startsWith('/api/')) return true;
  if (PASSTHROUGH_EXACT.has(pathname)) return true;
  // Anything with a file extension: sitemap.xml, robots.txt, llms.txt,
  // manifest.webmanifest, icons, /screenshots/*.webp and other public/ assets.
  if (pathname.includes('.')) return true;
  return false;
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
