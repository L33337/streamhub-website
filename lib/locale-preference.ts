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
}
