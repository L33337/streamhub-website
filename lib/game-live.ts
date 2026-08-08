// Scope + payload rules for the game hub's "Watching {category} now" section
// (language filter, 2026-08-08).
//
// The dropdown itself is the homepage rail's control verbatim — the filter
// vocabulary (`LiveFilterItem`, `matchesLiveFilters`, `countLiveFilterOptions`,
// `computeVisibleLiveIds`) lives in lib/home/live-rail.ts and is SHARED, so the
// two can only ever disagree on purpose. What lives here is only what differs:
// this section is a grid of `SlotCard`s with a small resting cut plus a
// show-more, not a rail, and it has no category dimension at all (the page IS
// the category).

import type { PublicStreamSlot } from '@/lib/server/partner-api';
import { countLiveFilterOptions, type LiveFilterItem } from '@/lib/home/live-rail';

/**
 * Cards visible before anyone touches a dropdown or the show-more. Popular
 * categories run dozens of live slots, which used to bury the sections below.
 */
export const GAME_LIVE_VISIBLE_CAP = 4;

/**
 * How many cards ship as server HTML — the resting cut plus everything the
 * show-more can reveal. Was the `<details>` expander's 4 + 20 before the
 * filter, and the number is kept so the page's HTML weight is unchanged.
 *
 * It must never be lower than GAME_LIVE_VISIBLE_CAP: the resting section IS the
 * first GAME_LIVE_VISIBLE_CAP cards, so a smaller head would leave the default
 * state depending on client rendering — a blank gap for crawlers.
 * `splitGameLiveSlots` enforces it.
 */
export const GAME_LIVE_SSR_COUNT = 24;

/**
 * Filter scope: how deep into the category's live sweep the language dropdown
 * can reach. Also the payload guard — cards past the SSR head travel as pruned
 * DATA (`toGameLiveCardSlot`), not as HTML, and are rendered only once a filter
 * reveals them.
 *
 * **The scope is deliberately larger than the visible cut.** Filtering only
 * what is rendered is the bug this pattern exists to avoid: the homepage rail
 * once searched its 30 visible cards, so German offered 3 of 17 live streams
 * and several languages had no option at all (fixed 2026-07-29).
 *
 * Sized against production: peak concurrent live channels per category over 14
 * days was 37 (Just Chatting), 27 (League of Legends), <20 for everything else,
 * so 60 covers every category's peak with room for the onboarding wave while
 * bounding the flight payload at ~36 pruned slots. The API fetch caps at 100;
 * anything past this pool stays in the "…more in the full ranking" link.
 */
export const GAME_LIVE_POOL_MAX = 60;

/**
 * The section's pool: biggest current audience first, capped.
 *
 * Deliberately NOT deduplicated per streamer (unlike the homepage rail): the
 * fetch is category-filtered, so a simulcast contributes at most one slot per
 * category in practice, and dropping rows here would change what the section
 * has always shown.
 */
export function rankGameLiveSlots(
  slots: PublicStreamSlot[],
  cap: number = GAME_LIVE_POOL_MAX,
): PublicStreamSlot[] {
  return slots
    .slice()
    .sort((a, b) => (b.viewer_count ?? -1) - (a.viewer_count ?? -1))
    .slice(0, cap);
}

/**
 * Splits the ranked pool into the server-rendered head and the deferred tail.
 * Both keep the pool's viewer ranking, which is what lets the island append its
 * matches after the server's and still read as one ranked grid (the head is a
 * strict PREFIX, so head matches always outrank tail matches).
 */
export function splitGameLiveSlots<T>(
  slots: T[],
  ssrCount: number = GAME_LIVE_SSR_COUNT,
): { ssr: T[]; deferred: T[] } {
  const head = Math.max(ssrCount, GAME_LIVE_VISIBLE_CAP);
  return { ssr: slots.slice(0, head), deferred: slots.slice(head) };
}

/**
 * How many languages a category needs before the dropdown is worth rendering.
 * One option is not a filter — the same rule the schedule's platform chips
 * already follow (`ScheduleFilters`, rendered only with ≥2 platforms).
 *
 * Slots with an unknown broadcaster language (YouTube-only channels never
 * report one) produce no option and stay reachable only under "All languages",
 * so a category streamed in one language never grows a control.
 */
export const MIN_LANGUAGE_OPTIONS = 2;

/**
 * Whether the language dropdown can do anything at all — the server's cue to
 * skip the deferred tail entirely, since nothing could reveal it. The island
 * applies the same threshold to the options it has already counted.
 */
export function hasLanguageChoice(items: LiveFilterItem[]): boolean {
  return countLiveFilterOptions(items, 'language').length >= MIN_LANGUAGE_OPTIONS;
}

/**
 * Exactly what `SlotCard` renders for a LIVE slot. A `Pick` of the DTO rather
 * than a parallel shape, so a card that starts reading a new field fails to
 * compile here instead of rendering `undefined` in production — the rule
 * lib/home/slot-payload.ts established for the homepage's deferred pools.
 *
 * No `reasoning`/`generic_reasoning`/`copy_language`: the card only reads those
 * on predicted, non-live slots, and everything in this section is live by
 * construction — which is also the single biggest saving (measured at 116 KB of
 * `reasoning` across the homepage's slot payloads). No `slot_kind` either: a
 * live slot is never a cancellation.
 */
export type GameLiveCardSlot = Pick<
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
  | 'viewer_count'
>;

/** Prunes a live slot to what the card renders. */
export function toGameLiveCardSlot(slot: PublicStreamSlot): GameLiveCardSlot {
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
    // Optional on the DTO; an absent key costs nothing where `"viewer_count":
    // null` costs bytes on every card.
    ...(typeof slot.viewer_count === 'number'
      ? { viewer_count: slot.viewer_count }
      : {}),
  };
}
