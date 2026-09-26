// Pure helpers for the game hub's schedule section (game-hub UX round
// 2026-07-23). Kept out of the page component so they stay unit-testable
// (lib/__tests__/game-schedule.test.ts).

import type { PublicStreamSlot } from '@/lib/server/partner-api';
import type { IcsSlot } from '@/lib/feed/ics';

/**
 * Maximum slots rendered per day on a game hub.
 *
 * The API is asked for up to 200 upcoming slots across the 7-day window; a
 * busy category (Just Chatting, Fortnite, League of Legends) really does fill
 * that. Each rendered slot costs ~6 KB of HTML — the card markup plus its
 * duplicate in the RSC flight payload — which pushed /game/just-chatting to
 * 1.55 MB and /game/fortnite to 1.20 MB. Bing applies a 1 MB soft limit and
 * flagged the page as "Html size is too long" on 2026-08-01; past that limit
 * it may not cache the whole document, so the content BELOW the wall of cards
 * (related games, the FAQ, the internal links) is what gets lost.
 *
 * 12/day keeps the busiest categories around 670 KB while still showing more
 * per day than anyone scrolls, and — unlike lowering the API `limit` — it caps
 * each day independently, so days 6 and 7 never vanish because days 1-2 were
 * busy. Low-confidence predictions are dropped first (see `capDaySlots`).
 */
export const MAX_SLOTS_PER_DAY = 12;

/**
 * Trim one day's slots to `max`, dropping the least informative first.
 *
 * Order of sacrifice: low-confidence upcoming predictions (the ones already
 * collapsed behind a <details> expander, i.e. the ones a reader has to opt
 * into seeing) go before anything that renders a full card. Returns the kept
 * slots in their original order plus how many were dropped, so the page can
 * say so instead of silently under-reporting the day.
 */
export function capDaySlots(
  slots: PublicStreamSlot[],
  max: number = MAX_SLOTS_PER_DAY,
): { slots: PublicStreamSlot[]; hidden: number } {
  if (slots.length <= max) return { slots, hidden: 0 };
  const { full, low } = splitCollapsibleSlots(slots);
  // Full cards win the budget; whatever is left goes to low-confidence rows.
  // A day with MORE than `max` full cards still gets trimmed — otherwise the
  // cap would not bound anything for a category whose predictions are all
  // high-confidence.
  const keptFull = full.slice(0, max);
  const keptLow = low.slice(0, Math.max(0, max - keptFull.length));
  const kept = new Set([...keptFull, ...keptLow]);
  return {
    slots: slots.filter((s) => kept.has(s)),
    hidden: slots.length - kept.size,
  };
}

/**
 * Splits a day's slots into full SlotCards vs. collapsible compact rows.
 * Collapsible = low-confidence upcoming predictions. Cancelled slots always
 * keep the full card (their greyed treatment carries meaning), as do live
 * slots (never expected inside the upcoming grid, but the guard keeps the
 * helper honest against future callers).
 */
export function splitCollapsibleSlots(slots: PublicStreamSlot[]): {
  full: PublicStreamSlot[];
  low: PublicStreamSlot[];
} {
  const full: PublicStreamSlot[] = [];
  const low: PublicStreamSlot[] = [];
  for (const slot of slots) {
    const collapsible =
      slot.confidence === 'low' &&
      slot.status === 'upcoming' &&
      slot.slot_kind !== 'cancelled';
    (collapsible ? low : full).push(slot);
  }
  return { full, low };
}

/**
 * Full SlotCards per day on the game hub (UX round 2026-09-24). A full card is
 * ~200px tall on a phone; at 12 per day a 7-day week was 14,000px of cards.
 * The rest of the day's high/medium predictions render as compact rows.
 */
export const FULL_CARDS_PER_DAY = 4;

/** Rendered days that stay open when the week collapses (normally today + tomorrow). */
export const OPEN_SCHEDULE_DAYS = 2;

/**
 * Splits a day into what renders as a full card, a compact row, or a
 * collapsed low-confidence row.
 *
 * - `full`: every cancelled slot (their greyed card carries meaning, and they
 *   do not count against the cap) plus the first `fullCap` non-cancelled
 *   high/medium predictions, in input order (chronological).
 * - `compact`: the remaining high/medium predictions.
 * - `low`: exactly `splitCollapsibleSlots`' low bucket.
 *
 * Every slot lands in exactly one bucket, and each bucket keeps input order.
 */
export function splitDayForRendering(
  slots: PublicStreamSlot[],
  fullCap: number = FULL_CARDS_PER_DAY,
): { full: PublicStreamSlot[]; compact: PublicStreamSlot[]; low: PublicStreamSlot[] } {
  const { full: candidates, low } = splitCollapsibleSlots(slots);
  const full: PublicStreamSlot[] = [];
  const compact: PublicStreamSlot[] = [];
  let used = 0;
  for (const slot of candidates) {
    if (slot.slot_kind === 'cancelled') {
      full.push(slot);
    } else if (used < fullCap) {
      full.push(slot);
      used++;
    } else {
      compact.push(slot);
    }
  }
  return { full, compact, low };
}

/**
 * Day keys that render but sit past the first `openCount` RENDERED days, in
 * `days` order. Those days start collapsed. Empty set = nothing to collapse
 * (fewer than openCount + 1 rendered days), and the page skips the wrapper.
 *
 * Rendered days, not calendar days: a category whose next stream is on day 3
 * would otherwise open on an empty schedule with nothing but a button.
 */
export function collapsedDayKeys(
  days: readonly string[],
  grouped: ReadonlyMap<string, readonly unknown[]>,
  openCount: number = OPEN_SCHEDULE_DAYS,
): Set<string> {
  const rendered = days.filter((d) => (grouped.get(d)?.length ?? 0) > 0);
  return new Set(rendered.slice(openCount));
}

/**
 * .ics export eligibility — mirrors the Program page's rule: only genuinely
 * upcoming slots, never cancelled ones (exporting "no stream expected" as a
 * calendar event would be nonsense).
 */
export function isIcsExportable(slot: PublicStreamSlot): boolean {
  return slot.status === 'upcoming' && slot.slot_kind !== 'cancelled';
}

/** Adapter: Partner-API slot → the feed ics builder's field names. */
export function publicSlotToIcsSlot(slot: PublicStreamSlot): IcsSlot {
  return {
    id: slot.id,
    streamerName: slot.streamer_name,
    streamTitle: slot.title,
    startTime: slot.start_time,
    duration: slot.duration_minutes,
    category: slot.category ?? undefined,
  };
}

/**
 * Distinct platforms across the schedule, in a stable order. The filter bar
 * only renders its platform group when more than one platform is present.
 */
export function schedulePlatforms(slots: PublicStreamSlot[]): ('twitch' | 'youtube')[] {
  const present = new Set<string>();
  for (const slot of slots) for (const p of slot.platforms) present.add(p);
  return (['twitch', 'youtube'] as const).filter((p) => present.has(p));
}
