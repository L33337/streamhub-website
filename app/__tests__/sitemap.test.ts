import { beforeEach, describe, expect, it, vi } from 'vitest';

// The sitemap pulls its rows from the Partner API; stub it with a tiny roster
// that covers the three language shapes the M22 matrix distinguishes.
const listStreamers = vi.fn();
const listGames = vi.fn();

vi.mock('@/lib/server/partner-api', () => ({
  getPartnerApi: () => ({ listStreamers, listGames }),
  PartnerApiError: class PartnerApiError extends Error {
    code = 'x';
  },
}));

import sitemap from '../sitemap';

const streamer = (id: string, language: string | null) => ({
  id,
  language,
  is_featured: false,
  last_status_change_at: '2026-07-19T10:00:00Z',
  updated_at: '2026-07-19T10:00:00Z',
});

beforeEach(() => {
  listStreamers.mockReset().mockResolvedValue({
    data: [streamer('germanguy', 'de'), streamer('yanks', 'en'), streamer('ytonly', null)],
    pagination: { next_cursor: null },
  });
  listGames.mockReset().mockResolvedValue({
    data: [
      // Passes both game gates (hub >= 5 streamers, ranking >= 10).
      { category: 'Fortnite', streamer_count: 43, live_streamer_count: 3 },
      // Passes the hub gate only (live), not the >= 10 ranking gate.
      { category: 'Chess', streamer_count: 4, live_streamer_count: 1 },
    ],
  });
});

const urlsOf = (entries: Awaited<ReturnType<typeof sitemap>>) => entries.map((e) => e.url);

describe('sitemap — M22 locale variants', () => {
  it('emits the en + own-language pair for non-English streamers only', async () => {
    const urls = urlsOf(await sitemap());
    expect(urls).toContain('https://streamertimes.tv/streamer/germanguy');
    expect(urls).toContain('https://streamertimes.tv/de/streamer/germanguy');
    // English and unknown-language streamers stay single unprefixed entries.
    expect(urls).toContain('https://streamertimes.tv/streamer/yanks');
    expect(urls.filter((u) => u.endsWith('/streamer/yanks'))).toHaveLength(1);
    expect(urls.filter((u) => u.endsWith('/streamer/ytonly'))).toHaveLength(1);
  });

  it('declares NO hreflang cluster on streamer entries', async () => {
    // Regression guard (2026-07-27): the sitemap's index gate is only a proxy
    // (last_status_change_at), while the real gate — live || next || featured —
    // is evaluated per page. Declaring a cluster here for a streamer whose page
    // renders noindex (and therefore emits no hreflang) produces "no return
    // tags" errors in GSC. The exact, reciprocal cluster lives on the pages.
    const streamerEntries = (await sitemap()).filter((e) => e.url.includes('/streamer/'));
    expect(streamerEntries.length).toBeGreaterThan(0);
    for (const entry of streamerEntries) {
      expect(entry.alternates).toBeUndefined();
    }
  });

  it('emits en+de discovery entries for game pages WITHOUT clusters (M22 P4)', async () => {
    const entries = await sitemap();
    const urls = urlsOf(entries);
    // Hub page passes its proxy gate → both locale entries.
    expect(urls).toContain('https://streamertimes.tv/game/fortnite');
    expect(urls).toContain('https://streamertimes.tv/de/game/fortnite');
    expect(urls).toContain('https://streamertimes.tv/game/chess');
    expect(urls).toContain('https://streamertimes.tv/de/game/chess');
    // Ranking page gate (>= 10) admits Fortnite only.
    expect(urls).toContain('https://streamertimes.tv/rankings/game/fortnite');
    expect(urls).toContain('https://streamertimes.tv/de/rankings/game/fortnite');
    expect(urls).not.toContain('https://streamertimes.tv/rankings/game/chess');
    // Same "no return tags" guard as streamer entries: the game gates here are
    // proxies, the pages own the exact hreflang clusters — the sitemap must
    // not declare clusters the pages might never confirm.
    for (const entry of entries.filter(
      (e) => e.url.includes('/game/') || e.url.includes('/rankings/game/'),
    )) {
      expect(entry.alternates, entry.url).toBeUndefined();
    }
  });

  it('keeps the full cluster on hub entries, which are unconditionally indexable', async () => {
    const entries = await sitemap();
    const home = entries.find((e) => e.url === 'https://streamertimes.tv');
    const liveDe = entries.find((e) => e.url === 'https://streamertimes.tv/de/live');
    const expected = {
      en: 'https://streamertimes.tv/live',
      de: 'https://streamertimes.tv/de/live',
      'x-default': 'https://streamertimes.tv/live',
    };
    expect(liveDe?.alternates?.languages).toEqual(expected);
    expect(home?.alternates?.languages).toEqual({
      en: 'https://streamertimes.tv',
      de: 'https://streamertimes.tv/de',
      'x-default': 'https://streamertimes.tv',
    });
  });
});
