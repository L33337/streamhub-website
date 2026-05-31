export const APP_STORE_URL = 'https://apps.apple.com/app/id6760627630';
export const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.streamhub.tv.app';
export const FALLBACK_URL = '/app';

export type GetAppTarget = {
  href: string;
  external: boolean;
};

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
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return { href: APP_STORE_URL, external: true };
  }
  if (/Android/i.test(ua)) {
    return { href: PLAY_STORE_URL, external: true };
  }
  return { href: FALLBACK_URL, external: false };
}
