import { describe, expect, it } from 'vitest';
import robots from '../robots';

// Freezes the two-group structure of robots.txt. The split is load-bearing:
// Googlebot must not crawl the churning /schedule/<id> URLs (GSC "Page with
// redirect" noise, ~500 wasted crawls/day), but the * group must NOT block
// /schedule/ — Discordbot/Twitterbot respect robots.txt, and a wildcard block
// would silently kill link embeds of user-shared slot URLs. "Simplifying"
// back to a single group breaks one side or the other.

const SHARED_DISALLOWS = ['/api/', '/auth/', '/settings', '/favorites'];

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
    expect(googlebot?.disallow).toEqual([...SHARED_DISALLOWS, '/schedule/']);
    expect(googlebot?.allow).toBe('/');
  });

  it('keeps /schedule/ crawlable for every other bot (social embeds)', () => {
    const wildcard = ruleFor('*');
    expect(wildcard).toBeDefined();
    expect(wildcard?.disallow).toEqual(SHARED_DISALLOWS);
    expect(wildcard?.disallow).not.toContain('/schedule/');
    expect(wildcard?.allow).toBe('/');
  });

  it('keeps sitemap and host untouched', () => {
    const result = robots();
    expect(result.sitemap).toBe('https://streamertimes.tv/sitemap.xml');
    expect(result.host).toBe('https://streamertimes.tv');
  });
});
