// Pure view-model helpers for the "Biggest live right now" rail (homepage
// section rebuild 2026-07-28). No fetching and no clock of their own — every
// function takes its inputs, so the whole section is unit-testable and the
// server render and the client's minute tick can share one implementation
// (lib/home/__tests__/live-rail.test.ts).

import type { PublicStreamSlot } from '@/lib/server/partner-api';
import type { LiveRuntimeLex } from '@/lib/i18n/live-runtime';

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

// ============================================
// Pool selection
// ============================================

/**
 * The rail's pool: the biggest live streams right now, one slot per streamer,
 * highest concurrent viewers first.
 *
 * Requiring a fresh viewer sample is what makes the section's promise
 * ("biggest") checkable — and it doubles as the zombie guard. Slots whose
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
 */
export function pickBiggestLiveSlots(
  slots: PublicStreamSlot[],
  cap = 30,
): PublicStreamSlot[] {
  const live = slots.filter((slot) => slot.status === 'live');
  const sampled = live.filter((slot) => typeof slot.viewer_count === 'number');
  const pool = sampled.length >= MIN_SAMPLED_POOL ? sampled : live;

  const sorted = pool
    .slice()
    .sort((a, b) => (b.viewer_count ?? -1) - (a.viewer_count ?? -1));

  // One card per streamer — a simulcast writes one live slot per platform and
  // the same face twice in a "biggest" list reads as a bug. The sort already
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
export function liveRuntime(slot: PublicStreamSlot, now: Date): LiveRuntime {
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

export interface CountedFilterOption {
  /** Filter key: the raw category name, or a normalized language code. */
  value: string;
  /** What the dropdown shows (category names are their own label). */
  label: string;
  /** Cards matching this option within the pool it was counted over. */
  count: number;
}

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
 * Dropdown options for one dimension, counted over whatever pool the caller
 * passes — the island passes the pool narrowed by the OTHER dimension, so the
 * counts always describe what picking the option would actually show, and a
 * zero-result combination cannot be selected.
 *
 * Sorted by count desc, then label, so the order is stable across ISR renders
 * with identical data.
 */
export function countLiveFilterOptions(
  items: LiveFilterItem[],
  dimension: 'category' | 'language',
): CountedFilterOption[] {
  const counts = new Map<string, CountedFilterOption>();
  for (const item of items) {
    const value = dimension === 'category' ? item.category : item.language;
    if (!value) continue;
    const label = dimension === 'category' ? item.category : item.languageLabel;
    const existing = counts.get(value);
    if (existing) existing.count += 1;
    else counts.set(value, { value, label, count: 1 });
  }
  return [...counts.values()].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label),
  );
}

/**
 * Normalizes a broadcaster language to the value used as the filter key and
 * as the `data-live-lang` attribute: lowercased, region subtag dropped
 * ("pt-BR" → "pt"), so Twitch's regional variants collapse into one option.
 * Returns null for unknown languages — those slots stay reachable only under
 * "All languages"; inventing an "Unknown" bucket in a filter reads as a bug.
 */
export function normalizeSlotLanguage(
  slot: Pick<PublicStreamSlot, 'streamer_language'>,
): string | null {
  const raw = slot.streamer_language;
  if (!raw) return null;
  const base = raw.trim().toLowerCase().split('-')[0];
  return base.length > 0 ? base : null;
}

/**
 * Turns the rail's slots into the island's filter metadata. `languageName`
 * resolves a code to the viewer's locale (lib/format/language.ts) — injected
 * rather than imported so this module stays free of Intl setup and the tests
 * stay independent of CLDR data.
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
