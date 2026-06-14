import { FALLBACK_URL, resolveStoreUrlFromUa } from '@/lib/get-app-target';

// Response depends on the request's User-Agent header → never statically cache.
export const dynamic = 'force-dynamic';

/**
 * Smart download redirect.
 *
 * Scanning the QR code on /app (or visiting /get directly) lands here. We read
 * the device User-Agent and 302-redirect straight to the matching store:
 *   iPhone/iPad  → App Store
 *   Android      → Google Play
 *   anything else → /app landing page
 */
export async function GET(request: Request): Promise<Response> {
  const target = resolveStoreUrlFromUa(request.headers.get('user-agent'));

  // Store URLs are absolute; the /app fallback is relative → make it absolute.
  const location =
    target === FALLBACK_URL ? new URL(FALLBACK_URL, request.url).toString() : target;

  return Response.redirect(location, 302);
}
