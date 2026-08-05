// M22 P3 — indexability matrix, hreflang clusters and content-language picks.
import { describe, expect, it } from 'vitest';
import type { Metadata } from 'next';
import {
  absoluteLocaleUrl,
  applyLocaleSeo,
  buildAlternates,
  INDEXABLE_HUB_LOCALES,
  pickDescription,
  streamerIndexableLocales,
} from '@/lib/seo';
import { pickReasoning } from '@/lib/slot-copy';

const SITE = 'https://streamertimes.tv';

describe('absoluteLocaleUrl', () => {
  it('collapses the English root to the bare origin (no trailing slash)', () => {
    expect(absoluteLocaleUrl('en', '/')).toBe(SITE);
  });
  it('prefixes non-English locales, including the root', () => {
    expect(absoluteLocaleUrl('de', '/')).toBe(`${SITE}/de`);
    expect(absoluteLocaleUrl('de', '/live')).toBe(`${SITE}/de/live`);
    expect(absoluteLocaleUrl('en', '/live')).toBe(`${SITE}/live`);
  });
});

describe('buildAlternates', () => {
  it('returns undefined for a single-locale cluster', () => {
    expect(buildAlternates('/streamer/foo', ['en'])).toBeUndefined();
  });
  it('builds the full cluster with x-default = unprefixed English', () => {
    expect(buildAlternates('/live', ['en', 'de'])).toEqual({
      en: `${SITE}/live`,
      de: `${SITE}/de/live`,
      'x-default': `${SITE}/live`,
    });
  });
  it('root path cluster uses the bare origin for en and x-default', () => {
    expect(buildAlternates('/', ['en', 'de'])).toEqual({
      en: SITE,
      de: `${SITE}/de`,
      'x-default': SITE,
    });
  });
  it('dedupes repeated locales', () => {
    expect(buildAlternates('/live', ['en', 'en'])).toBeUndefined();
  });
});

describe('streamerIndexableLocales', () => {
  it('pairs English with the streamer language when it is a UI locale', () => {
    expect(streamerIndexableLocales('de')).toEqual(['en', 'de']);
    expect(streamerIndexableLocales('pt-BR')).toEqual(['en', 'pt']);
  });
  it('is en-only for English, unknown-language and non-UI-locale streamers', () => {
    expect(streamerIndexableLocales('en')).toEqual(['en']);
    expect(streamerIndexableLocales(null)).toEqual(['en']);
    expect(streamerIndexableLocales('zh')).toEqual(['en']);
  });
});

describe('applyLocaleSeo — indexability matrix', () => {
  const base: Metadata = {
    title: 'T',
    alternates: { canonical: `${SITE}/live` },
    openGraph: { title: 'T', locale: 'en_US' },
  };

  // S4.1 (2026-08-05): the hub list is every UI locale except `ar` (LTR-only
  // chrome — see the INDEXABLE_HUB_LOCALES comment). These pins fail loudly if
  // someone adds `ar` without the logical-properties migration, or drops a
  // locale by accident.
  it('S4.1: hubs index in all locales except ar', () => {
    expect(INDEXABLE_HUB_LOCALES).toEqual([
      'en',
      'de',
      'es',
      'fr',
      'pt',
      'it',
      'ru',
      'ja',
      'uk',
      'hu',
      'pl',
    ]);
    expect(INDEXABLE_HUB_LOCALES).not.toContain('ar');
  });

  const expectedCluster = Object.fromEntries([
    ...INDEXABLE_HUB_LOCALES.map((l) => [l, absoluteLocaleUrl(l, '/live')]),
    ['x-default', `${SITE}/live`],
  ]);

  it('en indexable: canonical unchanged, full 11-locale cluster + og alternates', () => {
    const out = applyLocaleSeo(base, 'en', '/live', INDEXABLE_HUB_LOCALES);
    expect(out.alternates?.canonical).toBe(`${SITE}/live`);
    expect(out.alternates?.languages).toEqual(expectedCluster);
    expect(out.robots).toBeUndefined();
    const alt = (out.openGraph as { alternateLocale?: string[] }).alternateLocale;
    expect(alt).toHaveLength(INDEXABLE_HUB_LOCALES.length - 1);
    expect(alt).toContain('de_DE');
    expect(alt).not.toContain('en_US');
  });

  it('de hub variant: indexable, self-canonical, same cluster', () => {
    const out = applyLocaleSeo(base, 'de', '/live', INDEXABLE_HUB_LOCALES);
    expect(out.alternates?.canonical).toBe(`${SITE}/de/live`);
    expect(out.alternates?.languages).toEqual(expectedCluster);
    expect(out.robots).toBeUndefined();
    const alt = (out.openGraph as { alternateLocale?: string[] }).alternateLocale;
    expect(alt).toContain('en_US');
    expect(alt).not.toContain('de_DE');
  });

  it('fr hub variant (widened in S4.1): indexable with reciprocal cluster', () => {
    const out = applyLocaleSeo(base, 'fr', '/live', INDEXABLE_HUB_LOCALES);
    expect(out.robots).toBeUndefined();
    expect(out.alternates?.canonical).toBe(`${SITE}/fr/live`);
    expect(out.alternates?.languages).toEqual(expectedCluster);
  });

  it('ar hub variant: noindex,follow + self-canonical, no cluster (LTR gate)', () => {
    const out = applyLocaleSeo(base, 'ar', '/live', INDEXABLE_HUB_LOCALES);
    expect(out.robots).toEqual({ index: false, follow: true });
    expect(out.alternates?.canonical).toBe(`${SITE}/ar/live`);
    expect(out.alternates?.languages).toBeUndefined();
  });

  it('default is English-only: non-en noindex, en byte-identical pass-through', () => {
    const en = applyLocaleSeo(base, 'en', '/live');
    expect(en).toBe(base);
    const de = applyLocaleSeo(base, 'de', '/live');
    expect(de.robots).toEqual({ index: false, follow: true });
    expect(de.alternates?.languages).toBeUndefined();
  });

  it('incoming noindex (thin page) wins in every locale — no cluster leaks', () => {
    const thin: Metadata = { ...base, robots: { index: false, follow: true } };
    const en = applyLocaleSeo(thin, 'en', '/streamer/x', ['en', 'ja']);
    expect(en).toBe(thin);
    const ja = applyLocaleSeo(thin, 'ja', '/streamer/x', ['en', 'ja']);
    expect(ja.robots).toEqual({ index: false, follow: true });
    expect(ja.alternates?.languages).toBeUndefined();
    expect(ja.alternates?.canonical).toBe(`${SITE}/ja/streamer/x`);
  });

  it('streamer pair: own-language variant indexable, third locale not', () => {
    const pair = streamerIndexableLocales('ja');
    const jaOut = applyLocaleSeo(base, 'ja', '/streamer/x', pair);
    expect(jaOut.robots).toBeUndefined();
    expect(jaOut.alternates?.languages).toEqual({
      en: `${SITE}/streamer/x`,
      ja: `${SITE}/ja/streamer/x`,
      'x-default': `${SITE}/streamer/x`,
    });
    const deOut = applyLocaleSeo(base, 'de', '/streamer/x', pair);
    expect(deOut.robots).toEqual({ index: false, follow: true });
    expect(deOut.alternates?.languages).toBeUndefined();
  });
});

describe('pickDescription', () => {
  const s = (d: string | null, en: string | null, lang: string | null) => ({
    description: d,
    description_en: en,
    language: lang,
  });

  it('own-language viewer gets the original bio', () => {
    expect(pickDescription(s('Deutsche Bio', 'English bio', 'de'), 'de')).toEqual({
      text: 'Deutsche Bio',
      lang: 'de',
      dir: undefined,
    });
  });
  it('English viewer gets description_en when present', () => {
    expect(pickDescription(s('Deutsche Bio', 'English bio', 'de'), 'en')).toEqual({
      text: 'English bio',
      lang: 'en',
    });
  });
  it('third-locale viewer gets the English fallback', () => {
    expect(pickDescription(s('日本語', 'English bio', 'ja'), 'fr')?.text).toBe(
      'English bio',
    );
  });
  it('falls back to the original when no translation exists', () => {
    const picked = pickDescription(s('Deutsche Bio', null, 'de'), 'en');
    expect(picked).toEqual({ text: 'Deutsche Bio', lang: 'de', dir: undefined });
  });
  it('marks RTL original text', () => {
    expect(pickDescription(s('نص', null, 'ar'), 'ar')?.dir).toBe('rtl');
  });
  it('null language without a translation keeps the original, assumed English', () => {
    expect(pickDescription(s('English text', null, null), 'en')).toEqual({
      text: 'English text',
      lang: 'en',
      dir: undefined,
    });
  });
  // Regression (2026-07-27): langCode(null) === 'en' used to make a
  // NULL-language streamer look like an English one, so English viewers got the
  // untranslated bio — precisely the YouTube-only cohort P1 translates.
  it('null language WITH a translation serves the translation to every viewer', () => {
    const yt = s('Bio en français sans langue connue', 'Bio in English', null);
    expect(pickDescription(yt, 'en')).toEqual({ text: 'Bio in English', lang: 'en' });
    expect(pickDescription(yt, 'de')).toEqual({ text: 'Bio in English', lang: 'en' });
    expect(pickDescription(yt, 'fr')).toEqual({ text: 'Bio in English', lang: 'en' });
  });
  it('returns null without any description', () => {
    expect(pickDescription(s(null, null, 'de'), 'en')).toBeNull();
  });
});

describe('pickReasoning', () => {
  it('keeps the real reasoning when the copy language matches the viewer', () => {
    expect(
      pickReasoning({ reasoning: 'echt', copy_language: 'de', generic_reasoning: 'gen' }, 'de'),
    ).toEqual({ text: 'echt', isGeneric: false, lang: 'de' });
  });
  it('keeps English reasoning for every viewer (lingua-franca rule)', () => {
    expect(
      pickReasoning({ reasoning: 'real', copy_language: 'en', generic_reasoning: 'gen' }, 'de'),
    ).toEqual({ text: 'real', isGeneric: false, lang: 'en' });
  });
  it('swaps third-language copy for the labelled generic summary', () => {
    expect(
      pickReasoning({ reasoning: '日本語', copy_language: 'ja', generic_reasoning: 'gen' }, 'de'),
    ).toEqual({ text: 'gen', isGeneric: true, lang: 'en' });
    expect(
      pickReasoning({ reasoning: '日本語', copy_language: 'ja', generic_reasoning: 'gen' }, 'en'),
    ).toEqual({ text: 'gen', isGeneric: true, lang: 'en' });
  });
  it('shows foreign copy unswapped when no generic exists (honest fallback)', () => {
    expect(
      pickReasoning({ reasoning: '日本語', copy_language: 'ja' }, 'de'),
    ).toEqual({ text: '日本語', isGeneric: false, lang: 'ja' });
  });
  it('pre-M22 slots (no copy_language) behave exactly as before', () => {
    expect(pickReasoning({ reasoning: 'old' }, 'de')).toEqual({
      text: 'old',
      isGeneric: false,
      lang: '',
    });
  });
  it('generic-only slots render the generic', () => {
    expect(pickReasoning({ generic_reasoning: 'gen' }, 'en')).toEqual({
      text: 'gen',
      isGeneric: true,
      lang: 'en',
    });
  });
  it('returns null when nothing is available', () => {
    expect(pickReasoning({}, 'en')).toBeNull();
    expect(pickReasoning({ reasoning: '   ' }, 'en')).toBeNull();
  });
});
