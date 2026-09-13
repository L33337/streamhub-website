import { describe, it, expect } from 'vitest';
import type { FeedClip } from '@/lib/feed/types';
import { buildClipFilterItems, countClipFilterOptions } from '../clip-filters';
import {
  buildHomeClipsPayload,
  HOME_CLIP_WIRE_KEYS,
  homeClipFilterItems,
  hydrateHomeClip,
  packClipThumb,
  readHomeClip,
  twitchClipUrl,
  unpackClipThumb,
} from '../clip-payload';

const UUID = '0f3c9a2e-7b1d-4e5f-9a8b-1c2d3e4f5a6b';
const THUMB = `https://static-cdn.jtvnw.net/twitch-video-assets/twitch-vap-video-assets-prod-us-west-2/${UUID}/landscape/thumb/thumb-0000000000-480x272.jpg`;

function clip(overrides: Partial<FeedClip> = {}): FeedClip {
  return {
    id: 'db-1',
    streamerId: 's1',
    externalClipId: 'AbstemiousCrispyWoodpeckerPogChamp-7aBcD3EfGhIjKlMn',
    title: 'A clip',
    url: 'https://www.twitch.tv/streamerone/clip/AbstemiousCrispyWoodpeckerPogChamp-7aBcD3EfGhIjKlMn',
    thumbnailUrl: THUMB,
    durationSeconds: 30,
    viewCount: 500,
    category: 'Just Chatting',
    clipCreatedAt: '2026-09-10T12:00:00Z',
    creatorName: 'someone',
    ...overrides,
  };
}

const name = (code: string) => code.toUpperCase();

describe('packClipThumb / unpackClipThumb', () => {
  it('packs the known video-assets form to its uuid and back, byte for byte', () => {
    const packed = packClipThumb(THUMB);
    expect(packed).toEqual({ thumbId: UUID });
    expect(unpackClipThumb(packed)).toBe(THUMB);
  });

  it.each([
    ['another CDN', 'https://clips-media-assets2.twitch.tv/12345-preview-480x272.jpg'],
    ['an upper-case uuid', THUMB.replace(UUID, UUID.toUpperCase())],
    ['another size', THUMB.replace('480x272', '260x147')],
    ['another region', THUMB.replace('us-west-2', 'eu-west-1')],
    ['a path segment smuggled into the id', THUMB.replace(UUID, `${UUID}/x`)],
    ['a query string', `${THUMB}?v=2`],
    ['a bare uuid that is not a URL', UUID],
  ])('keeps %s in full', (_label, url) => {
    const packed = packClipThumb(url);
    expect(packed).toEqual({ thumbnailUrl: url });
    expect(unpackClipThumb(packed)).toBe(url);
  });

  it('packs a missing thumbnail to nothing', () => {
    expect(packClipThumb(undefined)).toEqual({});
    expect(unpackClipThumb({})).toBeUndefined();
  });

  it('never turns an invalid id into a URL', () => {
    expect(unpackClipThumb({ thumbId: 'not-a-uuid' })).toBeUndefined();
    expect(unpackClipThumb({ thumbId: `${UUID}/../x` })).toBeUndefined();
  });
});

describe('HOME_CLIP_WIRE_KEYS', () => {
  it('maps every field to a distinct short key', () => {
    const shortKeys = Object.values(HOME_CLIP_WIRE_KEYS);
    expect(new Set(shortKeys).size).toBe(shortKeys.length);
  });

  it('survives a JSON round trip, which is what the flight payload does', () => {
    const payload = buildHomeClipsPayload([clip()], {}, {}, { s1: 'streamerone' }, name);
    const overTheWire = JSON.parse(JSON.stringify(payload.clips));
    expect(hydrateHomeClip(overTheWire[0], payload.logins)).toEqual(
      hydrateHomeClip(payload.clips[0], payload.logins),
    );
  });
});

describe('buildHomeClipsPayload + hydrateHomeClip', () => {
  const logins = { s1: 'streamerone', s2: 'StreamerTwo', s3: 'third' };

  it('drops the id, url, unread fields and the full thumbnail', () => {
    const { clips } = buildHomeClipsPayload([clip()], {}, {}, logins, name);
    expect(readHomeClip(clips[0])).toEqual({
      externalClipId: clip().externalClipId,
      streamerId: 's1',
      viewCount: 500,
      title: 'A clip',
      thumbId: UUID,
      durationSeconds: 30,
      category: 'Just Chatting',
    });
  });

  it('ships the full url whenever the rebuild would not be byte-identical', () => {
    const pool = [
      // Streamer without a login in the map.
      clip({ id: 'a', streamerId: 'nologin', externalClipId: 'SlugA', url: 'https://www.twitch.tv/x/clip/SlugA' }),
      // Login case differs from what the url stores.
      clip({ id: 'b', streamerId: 's2', externalClipId: 'SlugB', url: 'https://www.twitch.tv/streamertwo/clip/SlugB' }),
      // Legacy clips.twitch.tv form.
      clip({ id: 'c', streamerId: 's3', externalClipId: 'SlugC', url: 'https://clips.twitch.tv/SlugC' }),
      // Rebuildable.
      clip({ id: 'd', streamerId: 's3', externalClipId: 'SlugD', url: twitchClipUrl('third', 'SlugD') }),
    ];
    const payload = buildHomeClipsPayload(pool, {}, {}, logins, name);
    expect(payload.clips.map((entry) => readHomeClip(entry).url)).toEqual([
      'https://www.twitch.tv/x/clip/SlugA',
      'https://www.twitch.tv/streamertwo/clip/SlugB',
      'https://clips.twitch.tv/SlugC',
      undefined,
    ]);
    // Only logins that rebuild something travel.
    expect(payload.logins).toEqual({ s3: 'third' });
    const hydrated = payload.clips.map((entry) => hydrateHomeClip(entry, payload.logins));
    expect(hydrated.map((entry) => entry.url)).toEqual(pool.map((entry) => entry.url));
  });

  it('round-trips every field ClipCard and ClipLightbox read', () => {
    const pool = [
      clip(),
      clip({
        id: 'db-2',
        streamerId: 's2',
        externalClipId: 'Other',
        url: 'https://clips.twitch.tv/Other',
        title: null,
        thumbnailUrl: undefined,
        durationSeconds: undefined,
        category: undefined,
      }),
    ];
    const payload = buildHomeClipsPayload(pool, {}, {}, logins, name);
    const hydrated = payload.clips.map((entry) => hydrateHomeClip(entry, payload.logins));
    pool.forEach((original, index) => {
      const back = hydrated[index];
      expect(back.id).toBe(original.externalClipId);
      expect(back.streamerId).toBe(original.streamerId);
      expect(back.externalClipId).toBe(original.externalClipId);
      expect(back.title).toBe(original.title);
      expect(back.url).toBe(original.url);
      expect(back.thumbnailUrl).toBe(original.thumbnailUrl);
      expect(back.durationSeconds).toBe(original.durationSeconds);
      expect(back.viewCount).toBe(original.viewCount);
      expect(back.category).toBe(original.category);
    });
  });

  it('keeps ids unique when a slug repeats in the pool', () => {
    const pool = [
      clip({ id: 'db-1', externalClipId: 'Same', url: twitchClipUrl('streamerone', 'Same') }),
      clip({ id: 'db-2', externalClipId: 'Same', url: twitchClipUrl('streamerone', 'Same') }),
    ];
    const payload = buildHomeClipsPayload(pool, {}, {}, logins, name);
    expect(readHomeClip(payload.clips[0])).not.toHaveProperty('id');
    expect(readHomeClip(payload.clips[1]).id).toBe('db-2');
    const ids = payload.clips.map((entry) => hydrateHomeClip(entry, payload.logins).id);
    expect(new Set(ids).size).toBe(2);
  });

  // The dropdown counts must not move: the island's derived items have to be
  // exactly what the server used to ship, clip by clip.
  it('derives filter items identical to the server-built ones', () => {
    const languages = { s1: 'de', s2: 'pt-BR', s3: 'other' };
    const pool = [
      clip({ id: 'a', streamerId: 's1', externalClipId: 'A', url: twitchClipUrl('streamerone', 'A') }),
      clip({ id: 'b', streamerId: 's2', externalClipId: 'B', category: ' Fortnite ' }),
      clip({ id: 'c', streamerId: 's3', externalClipId: 'C', category: undefined }),
      clip({ id: 'd', streamerId: 'unknown', externalClipId: 'D' }),
    ];
    const labels = (code: string) => ({ de: 'Deutsch', pt: 'Portugiesisch' })[code] ?? code.toUpperCase();
    const payload = buildHomeClipsPayload(pool, {}, languages, logins, labels);
    const hydrated = payload.clips.map((entry) => hydrateHomeClip(entry, payload.logins));

    const serverItems = buildClipFilterItems(
      pool.map((entry) => ({ ...entry, id: entry.externalClipId })),
      languages,
      labels,
    );
    const clientItems = homeClipFilterItems(hydrated, payload);
    expect(clientItems).toEqual(serverItems);
    for (const dimension of ['category', 'language'] as const) {
      expect(countClipFilterOptions(clientItems, dimension)).toEqual(
        countClipFilterOptions(serverItems, dimension),
      );
    }
    expect(payload.languageLabels).toEqual({ de: 'Deutsch', pt: 'Portugiesisch', other: 'OTHER' });
  });
});
