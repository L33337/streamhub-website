// Display names for streamer broadcaster-language codes ("de" → "German").
// Twitch sends ISO-639-1 codes plus two specials the CLDR data doesn't know:
// "other" and "asl" (American Sign Language — the ISO code would be "ase",
// but Twitch uses "asl").
//
// Default output stays English so every existing caller (ranking tables, the
// game explorer) is byte-identical; the live-rail language filter passes the
// viewer's locale, because a dropdown of language names is chrome and follows
// the VIEWER axis (CLAUDE.md D6).

const cache = new Map<string, Intl.DisplayNames | null>();

function displayNamesFor(locale: string): Intl.DisplayNames | null {
  const cached = cache.get(locale);
  if (cached !== undefined) return cached;
  let instance: Intl.DisplayNames | null = null;
  try {
    instance = new Intl.DisplayNames([locale], {
      type: 'language',
      fallback: 'code',
    });
  } catch {
    instance = null; // runtime without Intl.DisplayNames — fall back to codes
  }
  cache.set(locale, instance);
  return instance;
}

const SPECIALS: Record<string, Record<string, string>> = {
  other: {
    en: 'Other',
    de: 'Andere',
    es: 'Otro',
    fr: 'Autre',
    pt: 'Outro',
    it: 'Altro',
    ru: 'Другой',
    ja: 'その他',
    uk: 'Інша',
    ar: 'أخرى',
    hu: 'Egyéb',
    pl: 'Inny',
  },
};

/**
 * Whether a stored broadcaster-language code can drive a "streams in the same
 * language" relation query against the Partner API (`GET /v1/streamers?language=`).
 *
 * Twitch's specials are real values in `streamers.language` but useless as a
 * relation: `other` means "none of the listed languages" (two `other` channels
 * share nothing), and `asl` is a sign language with a handful of channels.
 * Until 2026-09-13 RelatedStreamers passed `other` through verbatim; the API
 * rejected it with 400 and the whole section — the page's internal links —
 * silently disappeared for that streamer. A relatable code is ISO 639-1/2
 * (2–3 letters) with an optional region tail, i.e. what the API validates.
 */
export function isRelatableLanguage(code: string | null | undefined): code is string {
  if (!code) return false;
  return /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})?$/.test(code.trim());
}

/**
 * Human-readable language name for a broadcaster language code, or null when
 * there is no code. Region subtags are dropped for compactness ("zh-hk" →
 * "Chinese", not "Chinese (Hong Kong SAR China)"); codes the CLDR cannot
 * resolve fall back to the uppercased input ("xx" → "XX").
 *
 * `locale` picks the language the NAME is rendered in and defaults to English
 * (existing callers unchanged). "asl" stays untranslated: Intl has no entry
 * for it and a hand-translated sign-language name in 12 locales would be
 * guesswork.
 */
export function languageDisplayName(
  code: string | null | undefined,
  locale = 'en',
): string | null {
  if (!code) return null;
  const trimmed = code.trim().toLowerCase();
  if (!trimmed) return null;
  if (trimmed === 'other') return SPECIALS.other[locale] ?? SPECIALS.other.en;
  if (trimmed === 'asl') return 'American Sign Language';
  const base = trimmed.split('-')[0];
  try {
    const name = displayNamesFor(locale)?.of(base);
    if (name && name.toLowerCase() !== base) return name;
  } catch {
    // Malformed tag — fall through to the code fallback.
  }
  return trimmed.toUpperCase();
}
