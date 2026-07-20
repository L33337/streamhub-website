// --- Body-localization core (client-safe) --------------------------------------
//
// Tiny shared primitives for the streamer-page body localization. This module
// deliberately contains NO string tables and must stay import-light: it is
// pulled into client bundles via lib/i18n-slot.ts (SlotCard/SlotStatusText/
// FavoriteButton render on /, /live and the feed). Never import lib/seo.ts or
// lib/i18n-ui.ts from here.
//
// Division of labor: sentences and labels live in the lexica
// (lib/i18n-slot.ts, lib/i18n-ui.ts); weekday names, relative days, list
// conjunctions and plural categories come from Intl so we don't hand-maintain
// word lists that the runtime already knows.

/** Languages with a full UI lexicon. Everything else falls back to 'en'. */
export const UI_LANGS = [
  'en',
  'de',
  'es',
  'fr',
  'pt',
  'it',
  'ru',
  'ja',
  'uk',
  'ar',
  'hu',
  'pl',
] as const;

export type UiLang = (typeof UI_LANGS)[number];

const UI_LANG_SET: ReadonlySet<string> = new Set(UI_LANGS);

/** Exact lexicon-language check (no BCP-47 resolution — 'de-AT' is NOT a UiLang). */
export function isUiLang(value: string | null | undefined): value is UiLang {
  return value != null && UI_LANG_SET.has(value);
}

/**
 * M22 locale routing: unprefixed URLs are English (`/streamer/foo`), every
 * other UI language gets a path prefix (`/de/streamer/foo`). Used by every
 * internal link so the locale a visitor picked survives navigation.
 * `path` must start with '/'; `localeHref('de', '/')` → '/de'.
 */
export function localeHref(locale: UiLang, path: string): string {
  if (locale === 'en') return path;
  return path === '/' ? `/${locale}` : `/${locale}${path}`;
}

/**
 * Resolve a stored broadcaster language (BCP-47, may be null/''/'other'/
 * unknown) to a supported lexicon language. 'de-AT' → 'de'; anything without
 * a lexicon → 'en'. Mirrors langCode() in lib/seo.ts but is duplicated here
 * (3 lines) so client bundles never pull in the 600-line META_STRINGS module.
 */
export function resolveUiLang(language: string | null | undefined): UiLang {
  const code = (language || 'en').split('-')[0].toLowerCase();
  return UI_LANG_SET.has(code) ? (code as UiLang) : 'en';
}

/**
 * Pick the right plural form via Intl.PluralRules. Covers Slavic one/few/many
 * (ru/uk/pl: 21 → one, 2 → few, 5 → many) and single-form languages (ja)
 * without per-language if-chains in the lexica. `other` is the required
 * fallback form; missing categories fall back to it.
 */
export function pluralForms<T>(
  lang: string,
  n: number,
  forms: Partial<Record<Intl.LDMLPluralRule, T>> & { other: T },
): T {
  let rule: Intl.LDMLPluralRule = 'other';
  try {
    rule = new Intl.PluralRules(lang).select(n);
  } catch {
    // Unknown/invalid tag — 'other' is always present.
  }
  return forms[rule] ?? forms.other;
}

// 2024-01-01 was a Monday; adding isoIndex days walks Mon→Sun in UTC.
const WEEKDAY_REF_MONDAY_UTC = Date.UTC(2024, 0, 1);

/**
 * Localized weekday name by ISO index (0 = Monday … 6 = Sunday), from Intl
 * rather than a hand-maintained list. weekdayLong(0, 'en') === 'Monday',
 * weekdayLong(0, 'de') === 'Montag'.
 */
export function weekdayLong(isoIndex: number, lang: string): string {
  return weekdayLabel(isoIndex, lang, 'long');
}

/** Short variant: weekdayShort(5, 'en') === 'Sat'. */
export function weekdayShort(isoIndex: number, lang: string): string {
  return weekdayLabel(isoIndex, lang, 'short');
}

function weekdayLabel(isoIndex: number, lang: string, style: 'long' | 'short'): string {
  const d = new Date(WEEKDAY_REF_MONDAY_UTC + isoIndex * 86_400_000);
  try {
    return d.toLocaleDateString(lang, { weekday: style, timeZone: 'UTC' });
  } catch {
    return d.toLocaleDateString('en-US', { weekday: style, timeZone: 'UTC' });
  }
}

/**
 * "A", "A and B", "A, B and C" — localized conjunction list. The 'en' path is
 * hand-rolled (no Oxford comma) so existing English output stays byte-identical
 * to the legacy listAnd() in lib/streamer-faq.ts; other languages use
 * Intl.ListFormat ("A, B und C", "A, B и C", "A、B、C").
 */
export function listConjunction(items: string[], lang: string): string {
  if (items.length <= 1) return items[0] ?? '';
  if (resolveUiLang(lang) === 'en') {
    return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
  }
  try {
    return new Intl.ListFormat(lang, { style: 'long', type: 'conjunction' }).format(items);
  } catch {
    return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
  }
}
