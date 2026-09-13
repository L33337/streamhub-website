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
import { INDEXABLE_HUB_LOCALES } from '@/lib/seo';

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
      // Live but below the hub's streamer floor: a transient (SEO F5).
      { category: 'Chess', streamer_count: 4, live_streamer_count: 1 },
      // Hub gate only (>= 5, < 10).
      { category: 'Minecraft', streamer_count: 7, live_streamer_count: 0 },
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
    // Hub page passes its streamer floor → both locale entries.
    expect(urls).toContain('https://streamertimes.tv/game/fortnite');
    expect(urls).toContain('https://streamertimes.tv/de/game/fortnite');
    expect(urls).toContain('https://streamertimes.tv/game/minecraft');
    expect(urls).toContain('https://streamertimes.tv/de/game/minecraft');
    // Ranking page gate (>= 10) admits Fortnite only.
    expect(urls).toContain('https://streamertimes.tv/rankings/game/fortnite');
    expect(urls).toContain('https://streamertimes.tv/de/rankings/game/fortnite');
    expect(urls).not.toContain('https://streamertimes.tv/rankings/game/minecraft');
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
    // S4.1: one entry + full reciprocal cluster per indexable hub locale.
    const expected = Object.fromEntries([
      ...INDEXABLE_HUB_LOCALES.map((l) => [
        l,
        l === 'en' ? 'https://streamertimes.tv/live' : `https://streamertimes.tv/${l}/live`,
      ]),
      ['x-default', 'https://streamertimes.tv/live'],
    ]);
    expect(liveDe?.alternates?.languages).toEqual(expected);
    expect(home?.alternates?.languages).toEqual(
      Object.fromEntries([
        ...INDEXABLE_HUB_LOCALES.map((l) => [
          l,
          l === 'en' ? 'https://streamertimes.tv' : `https://streamertimes.tv/${l}`,
        ]),
        ['x-default', 'https://streamertimes.tv'],
      ]),
    );
  });

  it('lists /tonight as a full hub, one entry + cluster per indexable locale', async () => {
    const entries = await sitemap();
    const urls = urlsOf(entries);
    expect(urls).toContain('https://streamertimes.tv/tonight');
    for (const l of INDEXABLE_HUB_LOCALES.filter((x) => x !== 'en')) {
      expect(urls).toContain(`https://streamertimes.tv/${l}/tonight`);
    }
    const tonightDe = entries.find((e) => e.url === 'https://streamertimes.tv/de/tonight');
    expect(tonightDe?.alternates?.languages).toEqual(
      Object.fromEntries([
        ...INDEXABLE_HUB_LOCALES.map((l) => [
          l,
          l === 'en'
            ? 'https://streamertimes.tv/tonight'
            : `https://streamertimes.tv/${l}/tonight`,
        ]),
        ['x-default', 'https://streamertimes.tv/tonight'],
      ]),
    );
  });

  it('lists the en-only methodology pages once, unprefixed, without clusters', async () => {
    const entries = await sitemap();
    const urls = urlsOf(entries);
    for (const path of ['/predictions', '/methodology/income-estimates']) {
      const matches = entries.filter((e) => e.url.endsWith(path));
      expect(matches, path).toHaveLength(1);
      expect(matches[0].url).toBe(`https://streamertimes.tv${path}`);
      // en-only class (applyLocaleSeo without the 4th arg): the non-en variants
      // are noindex, so the sitemap must not list them or declare a cluster.
      expect(matches[0].alternates).toBeUndefined();
      expect(urls.some((u) => u.includes(`/de${path}`))).toBe(false);
    }
    // <lastmod> mirrors the page's own "Last updated" line.
    const predictions = entries.find((e) => e.url.endsWith('/predictions'));
    expect(predictions?.lastModified).toEqual(new Date('2026-09-13'));
  });

  it('S4.1: lists every widened hub locale but never an /ar/ hub URL', async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    for (const l of INDEXABLE_HUB_LOCALES.filter((x) => x !== 'en')) {
      expect(urls).toContain(`https://streamertimes.tv/${l}/live`);
    }
    expect(urls.some((u) => u.includes('/ar/'))).toBe(false);
  });
});

describe('sitemap — SEO F5 game entries', () => {
  it('no longer lists a small category just because it is live right now', async () => {
    const urls = urlsOf(await sitemap());
    expect(urls.some((u) => u.endsWith('/game/chess'))).toBe(false);
  });

  it('lists a slug once when two category spellings collide', async () => {
    listGames.mockResolvedValue({
      data: [
        { category: 'Bombanana!', streamer_count: 6 },
        { category: 'BOMBANANA!', streamer_count: 12 },
      ],
    });
    const urls = urlsOf(await sitemap());
    expect(urls.filter((u) => u === 'https://streamertimes.tv/game/bombanana')).toHaveLength(1);
    // The ranking gate reads the WINNER's count (12), as the page does.
    expect(urls.filter((u) => u === 'https://streamertimes.tv/rankings/game/bombanana')).toHaveLength(1);
  });
});

describe('sitemap — SEO F2 streamer gate', () => {
  const NOW = new Date('2026-09-14T12:00:00Z');
  const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();
  const daysAhead = (d: number) => new Date(NOW.getTime() + d * 86_400_000).toISOString();
  const f2 = (id: string, overrides: Record<string, unknown>) => ({
    ...streamer(id, 'en'),
    last_status_change_at: daysAgo(90),
    is_live: false,
    next_stream_at: null,
    last_stream_at: null,
    predictions_updated_at: null,
    ...overrides,
  });

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    return () => vi.useRealTimers();
  });

  it('lists live, upcoming and active-featured streamers only', async () => {
    listStreamers.mockResolvedValue({
      data: [
        f2('livenow', { is_live: true }),
        f2('soon', { next_stream_at: daysAhead(2) }),
        f2('farout', { next_stream_at: daysAhead(9) }),
        f2('featuredactive', { is_featured: true, last_stream_at: daysAgo(12) }),
        f2('featureddormant', { is_featured: true, last_stream_at: daysAgo(80) }),
        f2('quiet', { last_stream_at: daysAgo(3) }),
      ],
      pagination: { next_cursor: null },
    });
    const urls = urlsOf(await sitemap());
    const listed = (id: string) => urls.includes(`https://streamertimes.tv/streamer/${id}`);
    expect(listed('livenow')).toBe(true);
    expect(listed('soon')).toBe(true);
    expect(listed('featuredactive')).toBe(true);
    expect(listed('farout')).toBe(false);
    expect(listed('featureddormant')).toBe(false);
    expect(listed('quiet')).toBe(false);
  });

  it('dates <lastmod> by the newest of metadata, live flip and prediction run', async () => {
    listStreamers.mockResolvedValue({
      data: [
        f2('predicted', {
          is_live: true,
          updated_at: '2026-09-01T00:00:00Z',
          last_status_change_at: '2026-09-10T00:00:00Z',
          predictions_updated_at: '2026-09-13T08:00:00Z',
        }),
      ],
      pagination: { next_cursor: null },
    });
    const entry = (await sitemap()).find((e) => e.url.endsWith('/streamer/predicted'));
    expect(entry?.lastModified).toEqual(new Date('2026-09-13T08:00:00Z'));
  });
});

describe('sitemap — legacy API without the F2 fields', () => {
  it('keeps the pre-F2 proxy: never-live and not featured stays out', async () => {
    listStreamers.mockResolvedValue({
      data: [
        { ...streamer('neverlive', 'en'), last_status_change_at: null },
        { ...streamer('featuredneverlive', 'en'), last_status_change_at: null, is_featured: true },
      ],
      pagination: { next_cursor: null },
    });
    const urls = urlsOf(await sitemap());
    expect(urls).not.toContain('https://streamertimes.tv/streamer/neverlive');
    expect(urls).toContain('https://streamertimes.tv/streamer/featuredneverlive');
  });

  it('still lists every locale hub', async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    for (const l of INDEXABLE_HUB_LOCALES.filter((x) => x !== 'en')) {
      expect(urls).toContain(`https://streamertimes.tv/${l}/live`);
    }
    expect(urls.some((u) => u.includes('/ar/'))).toBe(false);
  });
});
