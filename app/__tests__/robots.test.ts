import { describe, expect, it } from 'vitest';
import robots from '../robots';
import { UI_LANGS } from '@/lib/i18n-core';

// Freezes the three-group structure of robots.txt. The split is load-bearing:
// search crawlers (Googlebot, Bingbot) must not crawl the churning
// /schedule/<id> URLs (GSC "Page with redirect" noise, ~500 wasted
// crawls/day), but the * group must NOT block /schedule/ —
// Discordbot/Twitterbot respect robots.txt, and a wildcard block would
// silently kill link embeds of user-shared slot URLs. "Simplifying" back to
// fewer groups breaks one side or the other.

// /feed covers /feed/interests too (path-prefix match) — like /settings and
// /favorites it always redirects anonymous crawlers, so no bot should fetch it.
// M22: each private class repeats per non-English locale prefix (/de/settings…);
// /api/ lives outside the locale tree and /en/* 308s to unprefixed.
const NON_EN = UI_LANGS.filter((lang) => lang !== 'en');
const localeVariants = (paths: string[]) =>
  paths.flatMap((p) => [p, ...NON_EN.map((lang) => `/${lang}${p}`)]);
const SHARED_DISALLOWS = [
  '/api/',
  ...localeVariants(['/auth/', '/settings', '/favorites', '/feed', '/program']),
];
const SCHEDULE_DISALLOWS = localeVariants(['/schedule/']);

function ruleFor(userAgent: string) {
  const rules = robots().rules;
  const list = Array.isArray(rules) ? rules : [rules];
  return list.find((r) => r.userAgent === userAgent);
}

describe('robots.txt rules', () => {
  it('blocks /schedule/ for Googlebot, repeating every shared disallow', () => {
    const googlebot = ruleFor('Googlebot');
    expect(googlebot).toBeDefined();
    // A crawler reads only its most specific matching group, so the Googlebot
    // group must contain the shared disallows itself — not inherit from *.
    expect(googlebot?.disallow).toEqual([...SHARED_DISALLOWS, ...SCHEDULE_DISALLOWS]);
    expect(googlebot?.allow).toBe('/');
  });

  it('blocks /schedule/ for Bingbot, repeating every shared disallow', () => {
    const bingbot = ruleFor('Bingbot');
    expect(bingbot).toBeDefined();
    expect(bingbot?.disallow).toEqual([...SHARED_DISALLOWS, ...SCHEDULE_DISALLOWS]);
    expect(bingbot?.allow).toBe('/');
  });

  it('keeps /schedule/ crawlable for every other bot (social embeds)', () => {
    const wildcard = ruleFor('*');
    expect(wildcard).toBeDefined();
    expect(wildcard?.disallow).toEqual(SHARED_DISALLOWS);
    expect(wildcard?.disallow).not.toContain('/schedule/');
    expect(wildcard?.disallow).not.toContain('/de/schedule/');
    expect(wildcard?.allow).toBe('/');
  });

  it('keeps sitemap and host untouched', () => {
    const result = robots();
    expect(result.sitemap).toBe('https://streamertimes.tv/sitemap.xml');
    expect(result.host).toBe('https://streamertimes.tv');
  });
});
