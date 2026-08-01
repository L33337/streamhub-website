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
// `streamer_id`, `twitch_login`, `youtube_channel_id` and `streamer_language`,
// which the cards never touch.
//
// The types are `Pick`s of the API DTO rather than a parallel shape, so a card
// that starts reading a new field fails to compile here instead of rendering
// `undefined` in production.

import type { PublicStreamSlot } from '@/lib/server/partner-api';
import { pickReasoning, type PickedReasoning } from '@/lib/slot-copy';

/**
 * What `SlotCard` (incl. `SlotStatusText` → `getStatusParts`) reads. The
 * deferred half of "Today's lineup" ships exactly this.
 *
 * `slot_kind`, `viewer_count` and the three copy fields are optional in the
 * DTO and are OMITTED when they carry no information — an absent key costs
 * nothing, where `"slot_kind":"regular"` costs 25 bytes on every card.
 */
export type LineupCardSlot = Pick<
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
  | 'slot_kind'
  | 'viewer_count'
  | 'reasoning'
  | 'generic_reasoning'
  | 'copy_language'
>;

/**
 * What `LiveRailCard` reads — including `twitch_login`/`youtube_channel_id`,
 * which the card needs for `liveWatchUrl` (this rail links OUT to the
 * platform), and `streamer_id` for the favourite heart.
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
> &
  // Required on the DTO, optional here: a slot carries at most one of them for
  // the platform it is live on, and the other is never read.
  Partial<Pick<PublicStreamSlot, 'twitch_login' | 'youtube_channel_id'>>;

/**
 * The reasoning fields to ship, PRE-RESOLVED for one viewer language.
 *
 * `pickReasoning` picks between the real copy and the English generic summary
 * per viewer, and the viewer's language is fixed for a given prerender — so
 * shipping both texts (and the language tag that only exists to choose between
 * them) pays for a decision that was already made server-side.
 *
 * The result is chosen so that `pickReasoning(payload, sameLanguage)` returns
 * the SAME `{text, isGeneric, lang}` as `pickReasoning(fullSlot, ...)` did:
 * the card keeps its "auto summary" label and its `lang` attribute. Guarded by
 * a round-trip test.
 */
function reasoningPayload(
  picked: PickedReasoning | null,
): Pick<LineupCardSlot, 'reasoning' | 'generic_reasoning' | 'copy_language'> {
  if (!picked) return {};
  // isGeneric means the viewer gets the English template — shipped as
  // `generic_reasoning` with no `reasoning`, which is the input pickReasoning
  // resolves to exactly that again.
  if (picked.isGeneric) return { generic_reasoning: picked.text };
  return {
    reasoning: picked.text,
    // Kept ONLY when known: it still drives the `lang` attribute on the
    // paragraph (copy in a third language with no generic fallback).
    ...(picked.lang ? { copy_language: picked.lang } : {}),
  };
}

/** Prunes a lineup prediction down to what the card renders. */
export function toLineupCardSlot(
  slot: PublicStreamSlot,
  viewerLanguage: string,
): LineupCardSlot {
  return {
    id: slot.id,
    streamer_name: slot.streamer_name,
    title: slot.title,
    category: slot.category,
    platforms: slot.platforms,
    thumbnail_url: slot.thumbnail_url,
    avatar_url: slot.avatar_url,
    start_time: slot.start_time,
    duration_minutes: slot.duration_minutes,
    status: slot.status,
    is_predicted: slot.is_predicted,
    confidence: slot.confidence,
    is_always_on: slot.is_always_on,
    streamer_timezone: slot.streamer_timezone,
    // 'regular' is the DTO's documented meaning of an absent value.
    ...(slot.slot_kind && slot.slot_kind !== 'regular'
      ? { slot_kind: slot.slot_kind }
      : {}),
    ...(typeof slot.viewer_count === 'number'
      ? { viewer_count: slot.viewer_count }
      : {}),
    ...reasoningPayload(pickReasoning(slot, viewerLanguage)),
  };
}

/** Prunes a live slot down to what the rail's card renders. */
export function toLiveCardSlot(slot: PublicStreamSlot): LiveCardSlot {
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
