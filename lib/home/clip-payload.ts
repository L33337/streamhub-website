// Compact clip payloads for "Clips of the week" (payload diet 2026-09-14, SEO
// plan F7).
//
// ClipCard is a client component, so every pooled clip crosses the boundary as
// props — 500 of them. Measured on production (2026-09-13) the section's flight
// row was 358 KB: thumbnails 93 KB, filter items 57 KB, urls 45 KB, slugs
// 32 KB, database ids 21 KB, and 34 KB of `clipCreatedAt` + `creatorName`,
// which nothing on the homepage path reads.
//
// What changes on the wire, and why each is lossless:
// - `id` is not shipped: the clip's Twitch slug doubles as its id (unique per
//   pool; a duplicate slug ships its database id so React keys and the
//   lightbox playlist stay unique). The pool's ORDER is decided server-side
//   before packing, so the id's role as a sort tie-breaker is unaffected.
// - `url` is rebuilt from a streamer → login map in the exact form the
//   database stores (`https://www.twitch.tv/<login>/clip/<slug>`, 500 of 500
//   in production). Any clip whose rebuilt URL would not be byte-identical, or
//   whose streamer has no login, ships its full url.
// - thumbnails of Twitch's video-assets form ship only their uuid
//   (`thumbId`); any other form ships in full (`thumbnailUrl`). Two fields,
//   not one, so a packed value can never be mistaken for a URL or vice versa.
// - filter items are rebuilt by the island (`homeClipFilterItems`).
// - the remaining fields travel under short JSON keys (lib/home/wire-keys.ts,
//   ~80 bytes of key names per clip otherwise).
//
// Hydrated clips are plain `FeedClip`s, so ClipCard and ClipLightbox receive
// exactly what they did before and the signed-in feed is untouched.

import type { FeedClip, HomeClipPayload } from '@/lib/feed/types';
import { buildClipFilterItems, type ClipFilterItem } from './clip-filters';
import {
  collectLanguageLabels,
  languageNameFromLabels,
  ownValue,
} from './filter-payload';
import { decodeWire, encodeWire, type WireEncoded, type WireKeyMap } from './wire-keys';

/**
 * Short wire keys for `HomeClipPayload`. Must stay unique (pinned by a test);
 * a new payload field without a key here fails to compile.
 */
export const HOME_CLIP_WIRE_KEYS = {
  externalClipId: 'x',
  streamerId: 's',
  viewCount: 'v',
  title: 't',
  url: 'u',
  thumbId: 'h',
  thumbnailUrl: 'hu',
  durationSeconds: 'd',
  category: 'c',
  id: 'i',
} as const satisfies WireKeyMap<HomeClipPayload>;

/** One clip as it crosses the server/client boundary. */
export type HomeClipWire = WireEncoded<HomeClipPayload, typeof HOME_CLIP_WIRE_KEYS>;

const CLIP_THUMB_PREFIX =
  'https://static-cdn.jtvnw.net/twitch-video-assets/twitch-vap-video-assets-prod-us-west-2/';
const CLIP_THUMB_SUFFIX = '/landscape/thumb/thumb-0000000000-480x272.jpg';
/** Lowercase canonical uuid, nothing else — an unpack can only ever yield the pattern. */
const CLIP_THUMB_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function clipThumbUrl(thumbId: string): string {
  return `${CLIP_THUMB_PREFIX}${thumbId}${CLIP_THUMB_SUFFIX}`;
}

/** The clip URL form the database stores for Twitch clips. */
export function twitchClipUrl(login: string, slug: string): string {
  return `https://www.twitch.tv/${login}/clip/${slug}`;
}

/**
 * Packs a clip thumbnail: the uuid alone when the URL is exactly the known
 * video-assets form (verified by rebuilding it), otherwise the URL untouched.
 */
export function packClipThumb(
  url: string | undefined,
): Pick<HomeClipPayload, 'thumbId' | 'thumbnailUrl'> {
  if (!url) return {};
  if (url.startsWith(CLIP_THUMB_PREFIX) && url.endsWith(CLIP_THUMB_SUFFIX)) {
    const thumbId = url.slice(
      CLIP_THUMB_PREFIX.length,
      url.length - CLIP_THUMB_SUFFIX.length,
    );
    if (CLIP_THUMB_ID.test(thumbId) && clipThumbUrl(thumbId) === url) {
      return { thumbId };
    }
  }
  return { thumbnailUrl: url };
}

/**
 * Inverse of `packClipThumb`. A `thumbId` that is not a canonical uuid (never
 * produced by the packer) yields no thumbnail rather than a different URL —
 * the card then shows its placeholder.
 */
export function unpackClipThumb(
  packed: Pick<HomeClipPayload, 'thumbId' | 'thumbnailUrl'>,
): string | undefined {
  if (packed.thumbId !== undefined) {
    return CLIP_THUMB_ID.test(packed.thumbId) ? clipThumbUrl(packed.thumbId) : undefined;
  }
  return packed.thumbnailUrl;
}

/** Everything the clips island receives as data. */
export interface HomeClipsIslandPayload {
  clips: HomeClipWire[];
  /** streamer_id → display name for card and lightbox captions. */
  names: Record<string, string>;
  /** streamer_id → raw broadcaster language; the clip itself has none. */
  languages: Record<string, string>;
  /** streamer_id → Twitch login, only for streamers with a rebuilt url. */
  logins: Record<string, string>;
  /** Normalized language code → name in the viewer's locale. */
  languageLabels: Record<string, string>;
}

/**
 * Packs the rail's clips (already in display order) for the island.
 * `languageName` resolves a code in the viewer's locale, as for the filter
 * items this replaces.
 */
export function buildHomeClipsPayload(
  clips: FeedClip[],
  names: Record<string, string>,
  languages: Record<string, string>,
  logins: Record<string, string>,
  languageName: (code: string) => string,
): HomeClipsIslandPayload {
  const seenSlugs = new Set<string>();
  const usedLogins: Record<string, string> = {};
  const packed = clips.map((clip) => {
    const login = ownValue(logins, clip.streamerId);
    const rebuildable =
      login !== undefined && twitchClipUrl(login, clip.externalClipId) === clip.url;
    if (rebuildable) usedLogins[clip.streamerId] = login;
    const duplicate = seenSlugs.has(clip.externalClipId);
    seenSlugs.add(clip.externalClipId);

    const payload: HomeClipPayload = {
      externalClipId: clip.externalClipId,
      streamerId: clip.streamerId,
      viewCount: clip.viewCount,
      ...(clip.title !== null ? { title: clip.title } : {}),
      ...(rebuildable ? {} : { url: clip.url }),
      ...packClipThumb(clip.thumbnailUrl),
      ...(clip.durationSeconds !== undefined
        ? { durationSeconds: clip.durationSeconds }
        : {}),
      ...(clip.category !== undefined ? { category: clip.category } : {}),
      ...(duplicate ? { id: clip.id } : {}),
    };
    return encodeWire(payload, HOME_CLIP_WIRE_KEYS);
  });

  return {
    clips: packed,
    names,
    languages,
    logins: usedLogins,
    languageLabels: collectLanguageLabels(
      clips.map((clip) => ownValue(languages, clip.streamerId)),
      languageName,
    ),
  };
}

/** Decodes a wire clip back to its readable, still-packed fields. */
export function readHomeClip(wire: HomeClipWire): HomeClipPayload {
  return decodeWire<HomeClipPayload, typeof HOME_CLIP_WIRE_KEYS>(wire, HOME_CLIP_WIRE_KEYS);
}

/** Rebuilds the `FeedClip` ClipCard/ClipLightbox render from a wire clip. */
export function hydrateHomeClip(
  wire: HomeClipWire,
  logins: Record<string, string>,
): FeedClip {
  const clip = readHomeClip(wire);
  return {
    id: clip.id ?? clip.externalClipId,
    streamerId: clip.streamerId,
    externalClipId: clip.externalClipId,
    title: clip.title ?? null,
    // The packer only omits the url when this rebuild is byte-identical.
    url:
      clip.url ??
      twitchClipUrl(ownValue(logins, clip.streamerId) ?? '', clip.externalClipId),
    thumbnailUrl: unpackClipThumb(clip),
    durationSeconds: clip.durationSeconds,
    viewCount: clip.viewCount,
    category: clip.category,
    // Not shipped: ClipCard, ClipLightbox and ClipEmbedFrame never read it
    // (verified 2026-09-14). The empty string only satisfies the shared type.
    clipCreatedAt: '',
  };
}

/**
 * The island's filter items, derived from the hydrated clips — the same
 * function the server used to ship them from, over the same clip ids.
 */
export function homeClipFilterItems(
  clips: FeedClip[],
  payload: Pick<HomeClipsIslandPayload, 'languages' | 'languageLabels'>,
): ClipFilterItem[] {
  return buildClipFilterItems(
    clips,
    payload.languages,
    languageNameFromLabels(payload.languageLabels),
  );
}
