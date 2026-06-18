export const APP_STORE_URL = 'https://apps.apple.com/app/id6760627630';
export const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.streamhub.tv.app';
export const FALLBACK_URL = '/app';

export type GetAppTarget = {
  href: string;
  external: boolean;
};

/**
 * Maps a raw User-Agent string to the best download/install URL.
 * - iOS UA → Apple App Store
 * - Android UA → Google Play
 * - Anything else (incl. null/missing UA) → /app landing page
 *
 * Works on both server (UA header) and client (navigator.userAgent).
 */
export function resolveStoreUrlFromUa(ua: string | null): string {
  if (!ua) {
    return FALLBACK_URL;
  }
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return APP_STORE_URL;
  }
  if (/Android/i.test(ua)) {
    return PLAY_STORE_URL;
  }
  return FALLBACK_URL;
}

/**
 * Resolves the best download/install URL for the current device.
 * - iOS UA → Apple App Store
 * - Android UA → Google Play
 * - Anything else (incl. SSR) → /app landing page
 *
 * SSR-safe: returns the fallback when `navigator` is undefined. Always call
 * inside `useEffect` to avoid hydration mismatch.
 */
export function detectGetAppTarget(): GetAppTarget {
  if (typeof navigator === 'undefined') {
    return { href: FALLBACK_URL, external: false };
  }
  const href = resolveStoreUrlFromUa(navigator.userAgent);
  return { href, external: href !== FALLBACK_URL };
}
