import { describe, it, expect } from 'vitest';
import { SOCIAL_HOSTS, SOCIAL_LINKS, socialSameAs } from '../social-links';

describe('SOCIAL_LINKS', () => {
  it('every configured profile is an https URL on its platform host, without a trailing slash', () => {
    for (const link of SOCIAL_LINKS) {
      const u = new URL(link.url);
      expect(u.protocol, link.platform).toBe('https:');
      expect(SOCIAL_HOSTS[link.platform], `${link.platform}: ${u.hostname}`).toContain(u.hostname);
      expect(link.url, link.platform).not.toMatch(/\/$/);
      // A Facebook page without a vanity name has no cleaner URL than
      // profile.php?id=<digits>; every other platform's profile URL is a path.
      if (link.platform === 'facebook' && u.pathname === '/profile.php') {
        expect(u.search, 'facebook: profile.php needs exactly ?id=<digits>').toMatch(/^\?id=\d+$/);
      } else {
        expect(u.search, `${link.platform}: no query strings in a canonical profile URL`).toBe('');
      }
      expect(link.label.trim(), link.platform).not.toBe('');
    }
  });

  it('has all five accounts that exist as of 2026-09-26', () => {
    expect(SOCIAL_LINKS.map((l) => l.platform)).toEqual([
      'instagram',
      'tiktok',
      'youtube',
      'x',
      'facebook',
    ]);
  });

  it('lists each platform at most once', () => {
    const platforms = SOCIAL_LINKS.map((l) => l.platform);
    expect(new Set(platforms).size).toBe(platforms.length);
  });

  it('sameAs mirrors the configured URLs in footer order', () => {
    expect(socialSameAs()).toEqual(SOCIAL_LINKS.map((l) => l.url));
  });
});
