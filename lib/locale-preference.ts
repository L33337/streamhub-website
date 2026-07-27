// M22 client-side locale preference (NEXT_LOCALE cookie).
//
// STRICTLY CLIENT-ONLY semantics: the cookie feeds the suggestion banner and
// the default the language switcher highlights — it must NEVER influence
// server rendering or middleware rewrites (a cookie-based rewrite would
// fragment the CDN cache per cookie value and reintroduce cloaking; see the
// epic's D3). No server module imports this file.

import { resolveUiLang, isUiLang, type UiLang } from './i18n-core';

const PREFERENCE_COOKIE = 'NEXT_LOCALE';
const DISMISSED_COOKIE = 'st_locale_banner_dismissed';
const COOKIE_MAX_AGE_SECONDS = 180 * 24 * 60 * 60; // ~6 months

// The cookies below ARE the store this module exposes, and document.cookie
// notifies nobody. Writers call `notify()` so `useSyncExternalStore` consumers
// (the suggestion banner) re-read instead of keeping a second copy of the same
// state in React — a copy is what forced the banner to setState from an effect.
const listeners = new Set<() => void>();

/** Subscribe to locale-preference changes. Stable identity — safe to pass to useSyncExternalStore. */
export function subscribeLocalePreference(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function notify(): void {
  for (const listener of listeners) listener();
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function writeCookie(name: string, value: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
}

export function getPreferredLocale(): UiLang | null {
  const value = readCookie(PREFERENCE_COOKIE);
  return value !== null && isUiLang(value) ? value : null;
}

/**
 * Deliberately does NOT notify. Every call site is the click handler of a link
 * that navigates to this very locale, so the only subscriber (the banner) would
 * re-read mid-navigation, see a preference that no longer matches the page it
 * is still standing on, and flash itself in above the fold for the length of
 * the page load. The navigation is the update.
 */
export function setPreferredLocale(locale: UiLang): void {
  writeCookie(PREFERENCE_COOKIE, locale);
}

/**
 * The locale to suggest for a visitor: explicit preference cookie first, then
 * the first browser language that resolves to a lexicon language.
 */
export function detectSuggestedLocale(): UiLang {
  const preferred = getPreferredLocale();
  if (preferred) return preferred;
  if (typeof navigator !== 'undefined') {
    for (const tag of navigator.languages ?? [navigator.language]) {
      const resolved = resolveUiLang(tag);
      // resolveUiLang falls back to 'en' for unknown tags — only trust it
      // when the tag's primary subtag really is a lexicon language.
      if (resolved !== 'en' || tag.toLowerCase().startsWith('en')) return resolved;
    }
  }
  return 'en';
}

function dismissedPairs(): Set<string> {
  const raw = readCookie(DISMISSED_COOKIE);
  return new Set(raw ? raw.split(',') : []);
}

export function isBannerDismissed(suggested: UiLang, pageLocale: UiLang): boolean {
  return dismissedPairs().has(`${suggested}>${pageLocale}`);
}

export function dismissBanner(suggested: UiLang, pageLocale: UiLang): void {
  const pairs = dismissedPairs();
  pairs.add(`${suggested}>${pageLocale}`);
  writeCookie(DISMISSED_COOKIE, [...pairs].join(','));
  notify();
}

/**
 * The locale to offer on a page rendered in `pageLocale`, or null when there is
 * nothing to suggest (same language, already dismissed, or no DOM yet).
 *
 * Returns a primitive so it is safe as a `useSyncExternalStore` snapshot: React
 * calls it on every render and compares with Object.is, which a fresh object
 * would fail every time.
 *
 * The server snapshot is `null` BY DESIGN, not as a fallback: the banner must
 * never reach the cached HTML, or ISR would serve visitor-dependent markup
 * (cloaking risk + CDN fragmentation, M22 D3).
 */
export function suggestedLocaleFor(pageLocale: UiLang): UiLang | null {
  if (typeof document === 'undefined') return null;
  const detected = detectSuggestedLocale();
  if (detected === pageLocale) return null;
  return isBannerDismissed(detected, pageLocale) ? null : detected;
}
