import { describe, it, expect } from 'vitest';
import { UI_LANGS } from '../i18n-core';
import { CHROME_STRINGS, chromeLexFor, LANGUAGE_NATIVE_NAMES } from '../i18n-chrome';
import { SITE_META_STRINGS, siteMetaFor } from '../i18n-sitemeta';
import { BANNER_STRINGS } from '../i18n-banner';

// Broken interpolation / missing values must never reach rendered HTML.
const BROKEN = /undefined|\bNaN\b|\$\{|\[object/;

/**
 * Flattens a lexicon object of nested plain-string records into [path, value]
 * pairs. Unlike the slot/ui lexica these three modules are pure string tables
 * (no functions), so a recursive walk covers every key without a hand-kept
 * fixture list.
 */
function flatten(obj: unknown, prefix = ''): Array<[string, string]> {
  if (typeof obj === 'string') return [[prefix, obj]];
  const out: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    out.push(...flatten(value, prefix ? `${prefix}.${key}` : key));
  }
  return out;
}

describe.each([
  ['CHROME_STRINGS', CHROME_STRINGS],
  ['SITE_META_STRINGS', SITE_META_STRINGS],
  ['BANNER_STRINGS', BANNER_STRINGS],
] as const)('%s lexica', (_name, table) => {
  it.each([...UI_LANGS])('%s renders every key as clean non-empty text', (lang) => {
    const entries = flatten(table[lang]);
    expect(entries.length).toBeGreaterThan(0);
    for (const [key, value] of entries) {
      expect(typeof value, `${lang}:${key} not a string`).toBe('string');
      expect(value.trim(), `${lang}:${key} empty`).not.toBe('');
      expect(value, `${lang}:${key} broken: "${value}"`).not.toMatch(BROKEN);
    }
  });
});

describe('CHROME_STRINGS', () => {
  it('keeps the English strings byte-identical to the legacy hardcoded copy', () => {
    const L = CHROME_STRINGS.en;
    expect(L.nav.live).toBe('Live');
    expect(L.nav.streamers).toBe('Streamers');
    expect(L.nav.games).toBe('Games');
    expect(L.nav.rankings).toBe('Rankings');
    expect(L.nav.getApp).toBe('Get the App');
    expect(L.nav.openMenu).toBe('Open menu');
    expect(L.nav.closeMenu).toBe('Close menu');
    expect(L.nav.searchPlaceholder).toBe('Search streamers…');
    expect(L.nav.searchResults).toBe('Search results');
    // M22 S4.1 — must stay byte-identical to the SearchBar prop defaults.
    expect(L.nav.searchLabel).toBe('Search streamers');
    expect(L.nav.searching).toBe('Searching…');
    expect(L.nav.searchError).toBe('Search is unavailable right now.');
    expect(L.nav.searchViewAll).toBe('View all results for “{q}” →');
    expect(L.nav.home).toBe('Streamer Times home');
    expect(L.footer.tagline).toBe('Your Livestream Guide for Twitch & YouTube.');
    expect(L.footer.copyrightTail).toBe('Streamer Times — Your Livestream Guide.');
    expect(L.footer.impressum).toBe('Impressum');
    expect(L.notFound.kicker).toBe('404');
    expect(L.notFound.title).toBe('Page not found');
    expect(L.notFound.body).toBe(
      'We couldn’t find that page. It may have moved, or the link may be broken. Try one of these instead:',
    );
    expect(L.notFound.liveNow).toBe("Who's live now");
  });

  it('keeps the … ellipsis character in every search placeholder', () => {
    for (const lang of UI_LANGS) {
      expect(CHROME_STRINGS[lang].nav.searchPlaceholder, lang).toContain('…');
    }
  });

  it('keeps the {q} placeholder in every searchViewAll template (M22 S4.1)', () => {
    for (const lang of UI_LANGS) {
      expect(CHROME_STRINGS[lang].nav.searchViewAll, lang).toContain('{q}');
    }
  });

  it('keeps "Impressum" untranslated in all languages (German legal term)', () => {
    for (const lang of UI_LANGS) {
      expect(CHROME_STRINGS[lang].footer.impressum, lang).toBe('Impressum');
    }
  });

  it('chromeLexFor returns the English table for en', () => {
    expect(chromeLexFor('en')).toBe(CHROME_STRINGS.en);
    expect(chromeLexFor('de')).toBe(CHROME_STRINGS.de);
  });
});

describe('SITE_META_STRINGS', () => {
  it('keeps the English hub metadata byte-identical to the inline page exports', () => {
    const M = SITE_META_STRINGS.en;
    // app/page.tsx
    expect(M.home.title).toBe(
      'Stream Schedule, Highlights & Stats — Twitch & YouTube | StreamerTimes',
    );
    expect(M.home.description).toBe(
      'Stream schedules, weekly highlights and channel stats for Twitch and YouTube — all in one place. See who is live now and when your favorites go live next.',
    );
    // app/live/page.tsx
    expect(M.live.title).toBe("Who's Live Now on Twitch & YouTube | StreamerTimes");
    expect(M.live.description).toBe(
      'See every streamer live right now on Twitch and YouTube, grouped by game and category — plus who is starting in the next few hours. Updated every minute.',
    );
    // app/streamers/page.tsx
    expect(M.streamers.title).toBe(
      'All Streamers A–Z — Twitch & YouTube Live Schedules | StreamerTimes',
    );
    // app/games/page.tsx via DEFAULT_GAMES_HUB_VIEW.buildTitle()
    expect(M.games.title).toBe('Most Popular Games on Twitch & YouTube | StreamerTimes');
    // app/rankings/page.tsx
    expect(M.rankings.title).toBe(
      'Streamer Rankings — Most Followed, Most Watched & Most Active',
    );
  });

  it('siteMetaFor returns the English table for en', () => {
    expect(siteMetaFor('en')).toBe(SITE_META_STRINGS.en);
    expect(siteMetaFor('ja')).toBe(SITE_META_STRINGS.ja);
  });
});

describe('LANGUAGE_NATIVE_NAMES', () => {
  it('has a non-empty native name for all 12 UI languages', () => {
    for (const lang of UI_LANGS) {
      expect(LANGUAGE_NATIVE_NAMES[lang], lang).toBeTypeOf('string');
      expect(LANGUAGE_NATIVE_NAMES[lang].trim(), lang).not.toBe('');
    }
    expect(Object.keys(LANGUAGE_NATIVE_NAMES)).toHaveLength(UI_LANGS.length);
    expect(LANGUAGE_NATIVE_NAMES.en).toBe('English');
    expect(LANGUAGE_NATIVE_NAMES.de).toBe('Deutsch');
  });
});

describe('BANNER_STRINGS', () => {
  it('is complete for all 12 UI languages', () => {
    expect(Object.keys(BANNER_STRINGS)).toHaveLength(UI_LANGS.length);
    for (const lang of UI_LANGS) {
      expect(BANNER_STRINGS[lang], lang).toBeDefined();
    }
    expect(BANNER_STRINGS.en.text).toBe('This page is also available in English.');
    expect(BANNER_STRINGS.en.cta).toBe('Switch to English');
    expect(BANNER_STRINGS.en.dismiss).toBe('Dismiss');
  });
});
