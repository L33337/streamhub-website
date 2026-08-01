// Pure view-model helpers for the "Most Watched right now" rail (homepage
// section rebuild 2026-07-28). No fetching and no clock of their own — every
// function takes its inputs, so the whole section is unit-testable and the
// server render and the client's minute tick can share one implementation
// (lib/home/__tests__/live-rail.test.ts).

import type { PublicStreamSlot } from '@/lib/server/partner-api';
import type { LiveRuntimeLex } from '@/lib/i18n/live-runtime';
import {
  countFilterOptions,
  normalizeLanguageCode,
  type CountedFilterOption,
} from './filter-options';

/**
 * `duration` the backend writes for always-on channels (1 year in minutes,
 * check-live-streams/state-manager.ts). Treated as "no end estimate" even
 * when `is_always_on` is somehow false on the slot — an 8760-hour countdown
 * would be the most visible bug on the page.
 */
export const ALWAYS_ON_DURATION_SENTINEL = 525_600;

/** Anything at or above this is a sentinel, not an estimate (~69 days). */
const SENTINEL_FLOOR_MINUTES = 100_000;

/**
 * Below this many freshly-sampled live slots we stop trusting the viewer
 * sampler and fall back to the unsampled pool (see pickBiggestLiveSlots).
 */
const MIN_SAMPLED_POOL = 4;

/**
 * The unfiltered "Most Watched right now" cut: how many cards are visible
 * before anyone touches a dropdown. Everything beyond this rank is rendered
 * but ships `hidden` — see computeVisibleLiveIds.
 */
export const LIVE_RAIL_DEFAULT_VISIBLE = 30;

/**
 * Safety cap on rendered cards, i.e. on the filter scope — NOT a target.
 * Production runs ~130 live streamers with the top-500 onboarding wave still
 * going, so evening peaks of 150-250 are plausible. Hidden cards cost HTML +
 * flight bytes and DOM nodes, but no image fetches (`hidden` is display:none,
 * so their lazy thumbnails never intersect the viewport). DOM size is what
 * binds here; re-measure before raising this.
 */
export const LIVE_RAIL_POOL_MAX = 200;

/**
 * How many cards ship as server-rendered HTML. The rest of the pool travels to
 * the island as slot DATA (`lib/home/slot-payload.ts`) and is rendered only
 * once a filter is active — which is the only state that can reveal them.
 *
 * Pinned to LIVE_RAIL_DEFAULT_VISIBLE, and it must never be lower: the
 * unfiltered rail IS the first `LIVE_RAIL_DEFAULT_VISIBLE` cards, so a smaller
 * head would leave the resting state depending on client rendering — a blank
 * gap for crawlers and JS-less browsers. Larger would only pay for HTML nobody
 * sees. `splitLiveSlots` asserts the relation.
 *
 * Measured on the 2026-08-01 payload round (170 live cards, local build):
 * rendering the whole pool cost 5,657 markup elements and 2.01 MB of document;
 * the split brought both down by roughly two thirds without changing what any
 * filter can reach.
 */
export const LIVE_RAIL_SSR_COUNT = LIVE_RAIL_DEFAULT_VISIBLE;

// ============================================
// Pool selection
// ============================================

/**
 * Splits the ranked pool into the server-rendered head and the deferred tail.
 * Both keep the pool's viewer ranking, which is what lets the island append
 * its matches after the server's and still read as one ranked rail (the head
 * is a strict PREFIX of the ranking, so head-matches always outrank
 * tail-matches).
 */
export function splitLiveSlots<T>(
  slots: T[],
  ssrCount: number = LIVE_RAIL_SSR_COUNT,
): { ssr: T[]; deferred: T[] } {
  const head = Math.max(ssrCount, LIVE_RAIL_DEFAULT_VISIBLE);
  return { ssr: slots.slice(0, head), deferred: slots.slice(head) };
}

/**
 * The rail's pool for "Most Watched right now": one slot per streamer, highest
 * CURRENT concurrent viewers first. Deliberately not renamed after the section
 * — "most watched" is already taken in this codebase by the `most-watched`
 * ranking metric (median viewers over 28 days, `HomeMostWatched`), and the two
 * must not be confused in code.
 *
 * Requiring a fresh viewer sample is what makes the section's promise
 * checkable — and it doubles as the zombie guard. Slots whose
 * streamer went offline without the backend noticing keep `status='live'`
 * indefinitely (two such rows sat in production on 2026-07-28, live for 6 and
 * 12 days) and are never sampled again, so `viewer_count` stays null. Without
 * this filter they would surface with a long-dead preview image the moment a
 * language filter thinned the pool around them.
 *
 * The fallback keeps a sampler outage from emptying the whole section: when
 * fewer than MIN_SAMPLED_POOL slots carry a sample, we rank the unfiltered
 * pool instead (nulls last) — degraded to the pre-2026-07-28 behaviour rather
 * than blank.
 *
 * The returned order IS the rail's rank order, and the rail's default cut is
 * a prefix of it (computeVisibleLiveIds). `cap` has no default on purpose:
 * the caller renders the whole pool and hides the tail, so the two numbers
 * (LIVE_RAIL_POOL_MAX vs LIVE_RAIL_DEFAULT_VISIBLE) must never be confused.
 */
export function pickBiggestLiveSlots(
  slots: PublicStreamSlot[],
  cap: number,
): PublicStreamSlot[] {
  const live = slots.filter((slot) => slot.status === 'live');
  const sampled = live.filter((slot) => typeof slot.viewer_count === 'number');
  const pool = sampled.length >= MIN_SAMPLED_POOL ? sampled : live;

  const sorted = pool
    .slice()
    .sort((a, b) => (b.viewer_count ?? -1) - (a.viewer_count ?? -1));

  // One card per streamer — a simulcast writes one live slot per platform and
  // the same face twice in a most-watched list reads as a bug. The sort already
  // put the bigger of the two first.
  const seen = new Set<string>();
  const picked: PublicStreamSlot[] = [];
  for (const slot of sorted) {
    if (seen.has(slot.streamer_id)) continue;
    seen.add(slot.streamer_id);
    picked.push(slot);
    if (picked.length >= cap) break;
  }
  return picked;
}

/**
 * Where a card in this rail sends you: straight to the stream that is running
 * right now, on the platform itself.
 *
 * Everything in this rail is live by construction, so our own /schedule/<id>
 * page has nothing to add that the card doesn't already show — it only puts an
 * intercepted modal between the viewer and the stream they clicked. (No SEO
 * cost either: robots.txt disallows /schedule/ for search crawlers, so these
 * were never indexable link targets.)
 *
 * Twitch wins a simulcast: it is the platform whose viewer count ranked the
 * card into the rail, and its channel URL always lands on the running stream.
 * YouTube needs the /live suffix for that. Returns null when the slot carries
 * no channel id for any platform it claims to be live on — the caller then
 * keeps the internal link rather than rendering a dead card.
 */
export function liveWatchUrl(
  slot: Pick<PublicStreamSlot, 'platforms'> &
    Partial<Pick<PublicStreamSlot, 'twitch_login' | 'youtube_channel_id'>>,
): string | null {
  if (slot.platforms.includes('twitch') && slot.twitch_login) {
    return `https://twitch.tv/${slot.twitch_login}`;
  }
  if (slot.platforms.includes('youtube') && slot.youtube_channel_id) {
    return `https://youtube.com/channel/${slot.youtube_channel_id}/live`;
  }
  return null;
}

// ============================================
// Runtime estimate ("how much longer is this running?")
// ============================================

/**
 * What the runtime line on a card should say. `duration_minutes` on a live
 * slot is a real per-stream estimate (the AI prediction matched to this
 * start, else the streamer's average, else a 6 h default) — good enough for
 * an approximate line, never precise enough for a clock time.
 */
export type LiveRuntime =
  | { kind: 'alwaysOn' }
  /** Estimate still ahead of us. Values are already display-rounded. */
  | { kind: 'remaining'; hours: number; minutes: number }
  /** Estimate lapsed — the stream is running longer than predicted. */
  | { kind: 'overrun' }
  /** No usable estimate; we can only state how long it has been running. */
  | { kind: 'elapsed'; hours: number; minutes: number }
  /** Nothing honest to say (unparseable start, or "live" in the future). */
  | { kind: 'unknown' };

/**
 * Display rounding for an approximate duration. Precision degrades with
 * distance, because the estimate's own error does: 5-minute steps below an
 * hour, still 5-minute steps up to three hours, whole hours beyond that.
 * "~7 h 43 min left" would be false precision on a number that is routinely
 * an hour off.
 */
function roundForDisplay(totalMinutes: number): { hours: number; minutes: number } {
  if (totalMinutes < 180) {
    const rounded = Math.max(5, Math.round(totalMinutes / 5) * 5);
    return { hours: Math.floor(rounded / 60), minutes: rounded % 60 };
  }
  return { hours: Math.round(totalMinutes / 60), minutes: 0 };
}

/**
 * Resolves a live slot into its runtime line. `now` is injected so the server
 * render and the client's minute tick produce identical output.
 */
export function liveRuntime(
  slot: Pick<
    PublicStreamSlot,
    'start_time' | 'duration_minutes' | 'is_always_on'
  >,
  now: Date,
): LiveRuntime {
  return liveRuntimeFrom(
    Date.parse(slot.start_time),
    slot.duration_minutes,
    slot.is_always_on,
    now.getTime(),
  );
}

/**
 * Primitive form of `liveRuntime` — the client island re-derives the line from
 * `data-live-*` attributes every minute and has no slot object to hand.
 */
export function liveRuntimeFrom(
  startMs: number,
  durationMinutes: number,
  alwaysOn: boolean,
  nowMs: number,
): LiveRuntime {
  const start = startMs;
  if (!Number.isFinite(start)) return { kind: 'unknown' };

  const duration = durationMinutes;
  const isSentinel =
    !Number.isFinite(duration) || duration >= SENTINEL_FLOOR_MINUTES;
  if (alwaysOn || isSentinel) return { kind: 'alwaysOn' };

  const elapsedMinutes = (nowMs - start) / 60_000;
  // A live slot whose start lies in the future (clock skew, or a slot flipped
  // to live before its announced start) has nothing truthful to show.
  if (elapsedMinutes < 0) return { kind: 'unknown' };

  // duration <= 0 happens on legacy/always-on-adjacent rows: no estimate, but
  // "live since" is still a fact we know.
  if (!(duration > 0)) {
    if (elapsedMinutes < 1) return { kind: 'unknown' };
    return { kind: 'elapsed', ...roundForDisplay(elapsedMinutes) };
  }

  const remaining = duration - elapsedMinutes;
  if (remaining <= 0) return { kind: 'overrun' };
  return { kind: 'remaining', ...roundForDisplay(remaining) };
}

/**
 * The runtime line's text, or null when the card should show no line at all
 * ('alwaysOn' is carried by the 24/7 badge, 'unknown' has nothing to say).
 */
export function formatLiveRuntime(
  runtime: LiveRuntime,
  lex: LiveRuntimeLex,
): string | null {
  switch (runtime.kind) {
    case 'remaining':
      return lex.remaining(runtime.hours, runtime.minutes);
    case 'overrun':
      return lex.overrun;
    case 'elapsed':
      return lex.elapsed(runtime.hours, runtime.minutes);
    default:
      return null;
  }
}

// ============================================
// Filter options
// ============================================

/**
 * One rail card's filterable metadata. Built server-side (that is where the
 * slots and the locale live) and handed to the client island, which owns the
 * selection state.
 */
export interface LiveFilterItem {
  /** Matches the card's `data-live-id`. */
  id: string;
  /** Raw category name; '' when the slot has none. */
  category: string;
  /** Normalized language code; '' when unknown. */
  language: string;
  /** Language name in the VIEWER's locale, for the dropdown option. */
  languageLabel: string;
}

export type { CountedFilterOption };

/**
 * Cards passing the current selection. An empty selection matches everything;
 * items without a category/language are only reachable that way, which is why
 * neither dimension offers an "unknown" option.
 */
export function matchesLiveFilters(
  item: LiveFilterItem,
  category: string,
  language: string,
): boolean {
  return (
    (category === '' || item.category === category) &&
    (language === '' || item.language === language)
  );
}

/**
 * The rail's dropdown options for one dimension. Thin binding over the shared
 * counter (lib/home/filter-options.ts) — the lineup section counts its own
 * three dimensions through the same function, so the blank-skipping and the
 * ISR-stable ordering live in exactly one place.
 */
export function countLiveFilterOptions(
  items: LiveFilterItem[],
  dimension: 'category' | 'language',
): CountedFilterOption[] {
  return dimension === 'category'
    ? countFilterOptions(
        items,
        (item) => item.category,
        (item) => item.category,
      )
    : countFilterOptions(
        items,
        (item) => item.language,
        (item) => item.languageLabel,
      );
}

/**
 * A slot's broadcaster language as the filter key — see normalizeLanguageCode
 * (lib/home/filter-options.ts) for the region-subtag rule this shares with the
 * clips rail.
 */
export function normalizeSlotLanguage(
  slot: Pick<PublicStreamSlot, 'streamer_language'>,
): string | null {
  return normalizeLanguageCode(slot.streamer_language);
}

/**
 * Which cards the rail should show.
 *
 * With no selection the rail is the "biggest right now" cut: the first
 * `defaultVisible` items. That works because the item order is the slot
 * order, which is pickBiggestLiveSlots' viewer ranking — an invariant the
 * server render depends on too (it ships everything past that index
 * `hidden`, so this function reproduces the served HTML on mount).
 *
 * With ANY filter active the cut is gone and every match in the pool shows,
 * uncapped: the whole point of rendering the full live sweep is that a
 * language or category is findable no matter where it ranks. A German stream
 * at rank 84 is exactly the case the pre-2026-07-29 rail could not show.
 */
export function computeVisibleLiveIds(
  items: LiveFilterItem[],
  category: string,
  language: string,
  defaultVisible: number,
): Set<string> {
  if (category === '' && language === '') {
    return new Set(items.slice(0, defaultVisible).map((item) => item.id));
  }
  return new Set(
    items
      .filter((item) => matchesLiveFilters(item, category, language))
      .map((item) => item.id),
  );
}

/**
 * Turns the rail's slots into the island's filter metadata. `languageName`
 * resolves a code to the viewer's locale (lib/format/language.ts) — injected
 * rather than imported so this module stays free of Intl setup and the tests
 * stay independent of CLDR data.
 *
 * Order is load-bearing: it mirrors the slots, i.e. the viewer ranking, and
 * computeVisibleLiveIds slices its default cut off the front.
 */
export function buildLiveFilterItems(
  slots: PublicStreamSlot[],
  languageName: (code: string) => string,
): LiveFilterItem[] {
  return slots.map((slot) => {
    const language = normalizeSlotLanguage(slot) ?? '';
    return {
      id: slot.id,
      category: slot.category?.trim() ?? '',
      language,
      languageLabel: language ? languageName(language) : '',
    };
  });
}
