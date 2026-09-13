// Compact slot payloads for the homepage's DEFERRED card pools (2026-08-01).
//
// Two homepage sections render only a head of their pool as HTML and hand the
// rest to their island as DATA (lib/home/lineup-filters.ts `splitLineupSlots`,
// lib/home/live-rail.ts `splitLiveSlots`). Whatever crosses that boundary is
// paid for once per slot in the RSC flight payload, so a full `PublicStreamSlot`
// ships a dozen fields no card reads — plus, on predictions, TWO reasoning
// texts where the viewer can only ever be shown one.
//
// Measured on production's homepage (2026-08-01): 319 slot objects carried
// 116,680 chars of `reasoning` AND 36,423 of `generic_reasoning`, next to
// `streamer_id`, `twitch_login` and `youtube_channel_id`, which the cards never
// touch.
//
// Second round (2026-09-14, SEO plan F7): the lineup row was still 362 KB of
// flight. Lineup cards now (1) cut the reasoning to the teaser the card can
// show at all (LINEUP_TEASER_MAX_CHARS), (2) omit the fields that are almost
// always at their default, (3) travel under short JSON keys
// (lib/home/wire-keys.ts) with the avatar URL packed to its varying part
// (lib/home/avatar-pack.ts), and (4) carry the normalized broadcaster
// language, so the islands derive the deferred tail's filter metadata
// themselves instead of receiving it a second time (lineup-filters.ts /
// live-rail.ts `*IslandData`). `hydrateLineupCardSlot` undoes (2) and (3) on
// the client.
//
// The readable types are `Pick`s of the API DTO rather than a parallel shape,
// so a card that starts reading a new field fails to compile here instead of
// rendering `undefined` in production.

import type { PublicStreamSlot } from '@/lib/server/partner-api';
import { pickReasoning, type PickedReasoning } from '@/lib/slot-copy';
import { packAvatarUrl, unpackAvatarUrl } from './avatar-pack';
import { normalizeLanguageCode } from './filter-options';
import { decodeWire, encodeWire, type WireEncoded, type WireKeyMap } from './wire-keys';

/**
 * Longest reasoning a DEFERRED lineup card ships. The card clamps its teaser
 * to two lines (`line-clamp-2`, ~50-100 characters depending on the grid), so
 * anything past this is bytes nobody can see: 360 of 463 lineup predictions
 * were longer (production, 2026-09-14), up to 634 characters. The
 * server-rendered head keeps the full sentence in its HTML — that copy is the
 * crawlable one.
 */
export const LINEUP_TEASER_MAX_CHARS = 220;

/**
 * What `SlotCard` (incl. `SlotStatusText` → `getStatusParts`) reads, plus the
 * normalized `streamer_language` the island's language filter is derived
 * from. This is the shape after `hydrateLineupCardSlot`.
 *
 * `slot_kind`, `viewer_count` and the three copy fields are optional in the
 * DTO and are OMITTED when they carry no information — an absent key costs
 * nothing, where a `slot_kind` of "regular" costs bytes on every card.
 */
export type HydratedLineupCardSlot = Pick<
  PublicStreamSlot,
  | 'id'
  | 'streamer_name'
  | 'title'
  | 'category'
  | 'platforms'
  | 'thumbnail_url'
  | 'avatar_url'
  | 'start_time'
  | 'duration_minutes'
  | 'status'
  | 'is_predicted'
  | 'confidence'
  | 'is_always_on'
  | 'streamer_timezone'
  | 'streamer_language'
  | 'slot_kind'
  | 'viewer_count'
  | 'reasoning'
  | 'generic_reasoning'
  | 'copy_language'
>;

type LineupDefaultField = 'status' | 'is_predicted' | 'is_always_on' | 'thumbnail_url';

/**
 * The value each omittable field has on nearly every lineup card: the section
 * is a list of upcoming predictions, and predictions carry no preview image
 * (463 of 463 in production, 2026-09-14). A card that differs (an announced,
 * non-predicted slot, an always-on channel) ships the field explicitly.
 */
export const LINEUP_CARD_DEFAULTS: Readonly<
  Pick<HydratedLineupCardSlot, LineupDefaultField>
> = {
  status: 'upcoming',
  is_predicted: true,
  is_always_on: false,
  thumbnail_url: null,
};

/** The pruned card with its default-valued fields made optional. */
export type LineupCardFields = Omit<HydratedLineupCardSlot, LineupDefaultField> &
  Partial<Pick<HydratedLineupCardSlot, LineupDefaultField>>;

/**
 * Short wire keys for `LineupCardFields`. Must stay unique (pinned by a test);
 * a new card field without a key here fails to compile.
 */
export const LINEUP_CARD_WIRE_KEYS = {
  id: 'i',
  streamer_name: 'n',
  title: 't',
  category: 'c',
  platforms: 'p',
  thumbnail_url: 'u',
  avatar_url: 'a',
  start_time: 's',
  duration_minutes: 'd',
  status: 'st',
  is_predicted: 'ip',
  confidence: 'f',
  is_always_on: 'ao',
  streamer_timezone: 'z',
  streamer_language: 'l',
  slot_kind: 'k',
  viewer_count: 'v',
  reasoning: 'r',
  generic_reasoning: 'g',
  copy_language: 'cl',
} as const satisfies WireKeyMap<LineupCardFields>;

/**
 * The deferred lineup card as it crosses the server/client boundary. Never
 * hand it to `SlotCard` directly — `hydrateLineupCardSlot` first, which the
 * compiler enforces (the wire shape has none of the card's field names).
 */
export type LineupCardSlot = WireEncoded<LineupCardFields, typeof LINEUP_CARD_WIRE_KEYS>;

/**
 * What `LiveRailCard` reads — including `twitch_login`/`youtube_channel_id`,
 * which the card needs for `liveWatchUrl` (this rail links OUT to the
 * platform), and `streamer_id` for the favourite heart. `streamer_language`
 * (normalized) feeds the island's filter metadata for the deferred tail.
 *
 * No `reasoning`: live cards show a runtime estimate, never AI copy. No
 * `status`/`confidence`/`slot_kind`: everything in this rail is live by
 * construction.
 */
export type LiveCardSlot = Pick<
  PublicStreamSlot,
  | 'id'
  | 'streamer_id'
  | 'streamer_name'
  | 'title'
  | 'category'
  | 'platforms'
  | 'thumbnail_url'
  | 'avatar_url'
  | 'start_time'
  | 'duration_minutes'
  | 'is_always_on'
  | 'viewer_count'
  | 'streamer_language'
> &
  // Required on the DTO, optional here: a slot carries at most one of them for
  // the platform it is live on, and the other is never read.
  Partial<Pick<PublicStreamSlot, 'twitch_login' | 'youtube_channel_id'>>;

/**
 * Cuts a teaser to at most `max` characters, ellipsis included. Prefers the
 * last word boundary in the second half of the window; text without one (CJK
 * copy has no spaces) is cut hard, never inside a surrogate pair. The result
 * minus its trailing "…" is always a PREFIX of the input, which is the
 * property the reasoning round-trip test pins.
 */
export function truncateTeaser(
  text: string,
  max: number = LINEUP_TEASER_MAX_CHARS,
): string {
  if (text.length <= max) return text;
  let cut = text.slice(0, max - 1);
  const boundary = lastWhitespaceIndex(cut);
  if (boundary >= Math.floor(max / 2)) {
    cut = cut.slice(0, boundary);
  } else {
    const last = cut.charCodeAt(cut.length - 1);
    // A lone high surrogate would render as a replacement glyph.
    if (last >= 0xd800 && last <= 0xdbff) cut = cut.slice(0, -1);
  }
  return `${cut.replace(/[\s,;:]+$/u, '')}…`;
}

function lastWhitespaceIndex(text: string): number {
  for (let index = text.length - 1; index >= 0; index -= 1) {
    if (/\s/u.test(text[index])) return index;
  }
  return -1;
}

/**
 * The reasoning fields to ship, PRE-RESOLVED for one viewer language and cut
 * to the teaser length.
 *
 * `pickReasoning` picks between the real copy and the English generic summary
 * per viewer, and the viewer's language is fixed for a given prerender — so
 * shipping both texts (and the language tag that only exists to choose between
 * them) pays for a decision that was already made server-side.
 *
 * The result is chosen so that `pickReasoning(payload, sameLanguage)` returns
 * the same `{isGeneric, lang}` as `pickReasoning(fullSlot, ...)` did and a
 * text that is the full one or a prefix of it (plus "…"): the card keeps its
 * "auto summary" label and its `lang` attribute. Guarded by a round-trip test.
 */
function reasoningPayload(
  picked: PickedReasoning | null,
): Pick<LineupCardFields, 'reasoning' | 'generic_reasoning' | 'copy_language'> {
  if (!picked) return {};
  const text = truncateTeaser(picked.text);
  // isGeneric means the viewer gets the English template — shipped as
  // `generic_reasoning` with no `reasoning`, which is the input pickReasoning
  // resolves to exactly that again.
  if (picked.isGeneric) return { generic_reasoning: text };
  return {
    reasoning: text,
    // Kept ONLY when known: it still drives the `lang` attribute on the
    // paragraph (copy in a third language with no generic fallback).
    ...(picked.lang ? { copy_language: picked.lang } : {}),
  };
}

/** Prunes a lineup prediction down to what the card renders, wire-encoded. */
export function toLineupCardSlot(
  slot: PublicStreamSlot,
  viewerLanguage: string,
): LineupCardSlot {
  const language = normalizeLanguageCode(slot.streamer_language);
  const fields: LineupCardFields = {
    id: slot.id,
    streamer_name: slot.streamer_name,
    title: slot.title,
    category: slot.category,
    platforms: slot.platforms,
    // Packed; hydrateLineupCardSlot unpacks it byte-identically.
    avatar_url: packAvatarUrl(slot.avatar_url),
    start_time: slot.start_time,
    duration_minutes: slot.duration_minutes,
    confidence: slot.confidence,
    streamer_timezone: slot.streamer_timezone,
    // Omitted at their default; hydrateLineupCardSlot puts them back.
    ...(slot.status !== LINEUP_CARD_DEFAULTS.status ? { status: slot.status } : {}),
    ...(slot.is_predicted !== LINEUP_CARD_DEFAULTS.is_predicted
      ? { is_predicted: slot.is_predicted }
      : {}),
    ...(slot.is_always_on !== LINEUP_CARD_DEFAULTS.is_always_on
      ? { is_always_on: slot.is_always_on }
      : {}),
    ...(slot.thumbnail_url !== LINEUP_CARD_DEFAULTS.thumbnail_url
      ? { thumbnail_url: slot.thumbnail_url }
      : {}),
    // Normalized here, so the island's re-normalization is a no-op.
    ...(language ? { streamer_language: language } : {}),
    // 'regular' is the DTO's documented meaning of an absent value.
    ...(slot.slot_kind && slot.slot_kind !== 'regular'
      ? { slot_kind: slot.slot_kind }
      : {}),
    ...(typeof slot.viewer_count === 'number'
      ? { viewer_count: slot.viewer_count }
      : {}),
    ...reasoningPayload(pickReasoning(slot, viewerLanguage)),
  };
  return encodeWire(fields, LINEUP_CARD_WIRE_KEYS);
}

/**
 * Decodes a wire card back to its readable, still-pruned fields. The avatar
 * stays PACKED here; only `hydrateLineupCardSlot` yields a renderable card.
 */
export function readLineupCardSlot(slot: LineupCardSlot): LineupCardFields {
  return decodeWire<LineupCardFields, typeof LINEUP_CARD_WIRE_KEYS>(
    slot,
    LINEUP_CARD_WIRE_KEYS,
  );
}

/**
 * Decodes a wire card and restores the default-valued fields
 * `toLineupCardSlot` left out — the shape `SlotCard` takes.
 */
export function hydrateLineupCardSlot(slot: LineupCardSlot): HydratedLineupCardSlot {
  const fields = readLineupCardSlot(slot);
  return {
    ...fields,
    avatar_url: unpackAvatarUrl(fields.avatar_url),
    status: fields.status ?? LINEUP_CARD_DEFAULTS.status,
    is_predicted: fields.is_predicted ?? LINEUP_CARD_DEFAULTS.is_predicted,
    is_always_on: fields.is_always_on ?? LINEUP_CARD_DEFAULTS.is_always_on,
    thumbnail_url: fields.thumbnail_url ?? LINEUP_CARD_DEFAULTS.thumbnail_url,
  };
}

/** Prunes a live slot down to what the rail's card renders. */
export function toLiveCardSlot(slot: PublicStreamSlot): LiveCardSlot {
  const language = normalizeLanguageCode(slot.streamer_language);
  return {
    id: slot.id,
    streamer_id: slot.streamer_id,
    streamer_name: slot.streamer_name,
    title: slot.title,
    category: slot.category,
    platforms: slot.platforms,
    thumbnail_url: slot.thumbnail_url,
    avatar_url: slot.avatar_url,
    start_time: slot.start_time,
    duration_minutes: slot.duration_minutes,
    is_always_on: slot.is_always_on,
    ...(typeof slot.viewer_count === 'number'
      ? { viewer_count: slot.viewer_count }
      : {}),
    ...(language ? { streamer_language: language } : {}),
    // Only the platform the slot actually claims can produce a watch URL, so
    // the other id is dead weight (liveWatchUrl checks `platforms` first).
    ...(slot.platforms.includes('twitch') && slot.twitch_login
      ? { twitch_login: slot.twitch_login }
      : {}),
    ...(slot.platforms.includes('youtube') && slot.youtube_channel_id
      ? { youtube_channel_id: slot.youtube_channel_id }
      : {}),
  };
}
