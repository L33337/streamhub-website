// Pure view-model helpers for "Today's lineup" — the homepage's prediction
// section (dropdown filters added 2026-07-30, mirroring the live rail's
// category/language pair and adding a start-time dimension). No fetching and
// no clock of its own: `nowMs` and the local-hour resolver are injected, which
// is what keeps the timezone-dependent parts testable
// (lib/home/__tests__/lineup-filters.test.ts).

import type { PublicStreamSlot } from '@/lib/server/partner-api';
import { countFilterOptions, type CountedFilterOption } from './filter-options';
import { normalizeSlotLanguage } from './live-rail';

/**
 * Safety cap on the pool — the filter scope, and now a PAYLOAD guard rather
 * than a DOM guard. Production holds ~440 predictions in the 24 h window, so
 * this covers it whole with headroom; the fetch's own page size (500) is the
 * other end of the same budget.
 *
 * It used to be 120 because every card was server-rendered whether or not it
 * was visible. Measured at 372 predictions (2026-07-30, Lighthouse mobile,
 * with the live rail's 133 cards on the same page): rendering all of them cost
 * 12,859 DOM elements / 213 ms TBT / 3.0 s main-thread against 6,783 / 72 ms /
 * 1.9 s at 120. Hence the split below — only LINEUP_SSR_COUNT cards are HTML,
 * the rest travel as data and are rendered on demand.
 */
export const LINEUP_POOL_MAX = 500;

/**
 * How many cards ship as server-rendered HTML. The rest of the pool travels to
 * the client as slot DATA and is rendered only once the visitor filters or
 * expands — full 24 h coverage for the filters at a fraction of the DOM.
 *
 * 24 is deliberately the section's pre-2026-07-30 render limit, so the
 * crawlable surface of the homepage is exactly what it always was.
 */
export const LINEUP_SSR_COUNT = 24;

/**
 * Splits the pool into the server-rendered head and the deferred tail. Both
 * keep the pool's chronological order, which is what lets the client append
 * its matches after the server's and still read as one list.
 */
export function splitLineupSlots<T>(
  slots: T[],
  ssrCount: number = LINEUP_SSR_COUNT,
): { ssr: T[]; deferred: T[] } {
  return { ssr: slots.slice(0, ssrCount), deferred: slots.slice(ssrCount) };
}

/**
 * The offered start times, as hours of the viewer's local day. "Common times"
 * per the product ask: afternoon through late evening, two-hour steps. Each
 * one filters CUMULATIVELY ("from 8 PM"), so the options sharpen towards the
 * evening instead of slicing the day into blocks nobody's stream fits.
 */
export const LINEUP_TIME_HOURS = [14, 16, 18, 20, 22] as const;

export interface LineupFilterItem {
  /** Matches the card's `data-home-id`. */
  id: string;
  /** Raw category name; '' when the slot has none. */
  category: string;
  /** Normalized language code; '' when unknown. */
  language: string;
  /** Language name in the VIEWER's locale, for the dropdown option. */
  languageLabel: string;
  /** Epoch ms of the predicted start; 0 when unparseable. */
  startMs: number;
}

export interface LineupSelection {
  category: string;
  language: string;
  /** Hour of the local day to filter from, or null for "any time". */
  fromHour: number | null;
}

export const EMPTY_LINEUP_SELECTION: LineupSelection = {
  category: '',
  language: '',
  fromHour: null,
};

/** Whether any dimension is narrowing the list. */
export function isLineupSelectionActive(selection: LineupSelection): boolean {
  return (
    selection.category !== '' ||
    selection.language !== '' ||
    selection.fromHour !== null
  );
}

/**
 * Turns the lineup's slots into the island's filter metadata. `languageName`
 * resolves a code to the viewer's locale (D6: chrome, not content) and is
 * injected so this module needs no Intl setup. Order mirrors the slots, i.e.
 * chronological — the section's own reading order.
 */
export function buildLineupFilterItems(
  slots: PublicStreamSlot[],
  languageName: (code: string) => string,
): LineupFilterItem[] {
  return slots.map((slot) => {
    const language = normalizeSlotLanguage(slot) ?? '';
    const startMs = Date.parse(slot.start_time);
    return {
      id: slot.id,
      category: slot.category?.trim() ?? '',
      language,
      languageLabel: language ? languageName(language) : '',
      startMs: Number.isFinite(startMs) ? startMs : 0,
    };
  });
}

/**
 * The local hour of a timestamp, in the timezone of whoever is running this.
 * Only ever correct on the client — the server prerenders one page for every
 * timezone on earth, which is exactly why the time dimension is resolved at
 * mount and never baked into the HTML.
 */
export function localHourOf(startMs: number): number {
  return new Date(startMs).getHours();
}

/**
 * A card whose predicted start has passed. The ISR page can be served
 * minutes-to-hours stale and a tab ages arbitrarily, so an expired prediction
 * would otherwise sit in "Today's lineup" as a "was expected at …" card.
 * startMs 0 means "unparseable" and is never treated as expired.
 */
export function isLineupItemExpired(item: LineupFilterItem, nowMs: number): boolean {
  return item.startMs > 0 && item.startMs <= nowMs;
}

/**
 * Cards passing the current selection. An empty selection matches everything;
 * items without a category/language are only reachable that way, which is why
 * neither dimension offers an "unknown" option. The time dimension compares
 * the HOUR OF THE LOCAL DAY, so "from 8 PM" means evening streams on whichever
 * day of the 24 h window they fall — not "every start after tonight 8 PM",
 * which would drag tomorrow morning in under an evening label.
 */
export function matchesLineupFilters(
  item: LineupFilterItem,
  selection: LineupSelection,
  localHour: (startMs: number) => number,
): boolean {
  if (selection.category !== '' && item.category !== selection.category) {
    return false;
  }
  if (selection.language !== '' && item.language !== selection.language) {
    return false;
  }
  if (selection.fromHour !== null) {
    if (item.startMs <= 0) return false;
    if (localHour(item.startMs) < selection.fromHour) return false;
  }
  return true;
}

/**
 * Ids of the cards that should be visible: everything unexpired that passes
 * the selection. Unlike the live rail there is no default cut — the lineup
 * clamps its overflow visually (peek zone + show-all toggle) instead, so
 * "visible" here is purely about filtering and expiry.
 */
export function computeVisibleLineupIds(
  items: LineupFilterItem[],
  selection: LineupSelection,
  localHour: (startMs: number) => number,
  nowMs: number,
): Set<string> {
  const visible = new Set<string>();
  for (const item of items) {
    if (isLineupItemExpired(item, nowMs)) continue;
    if (!matchesLineupFilters(item, selection, localHour)) continue;
    visible.add(item.id);
  }
  return visible;
}

/** Category options over the pool the other two dimensions already narrowed. */
export function countLineupCategoryOptions(
  items: LineupFilterItem[],
): CountedFilterOption[] {
  return countFilterOptions(
    items,
    (item) => item.category,
    (item) => item.category,
  );
}

/** Language options over the pool the other two dimensions already narrowed. */
export function countLineupLanguageOptions(
  items: LineupFilterItem[],
): CountedFilterOption[] {
  return countFilterOptions(
    items,
    (item) => item.language,
    (item) => item.languageLabel,
  );
}

/**
 * Time options, chronological — NOT count-sorted like the other two. A time
 * dropdown that reorders itself by popularity is unreadable, and these counts
 * are cumulative anyway (each is a superset of the ones below it), so
 * count-desc would only ever reproduce the chronological order backwards.
 *
 * Options with no match are dropped, keeping the live rail's contract that a
 * selectable option always yields cards. `label` receives the hour so the
 * caller owns formatting ("From 8:00 PM" / "Ab 20:00").
 */
export function countLineupTimeOptions(
  items: LineupFilterItem[],
  localHour: (startMs: number) => number,
  label: (hour: number) => string,
  nowMs: number,
  hours: readonly number[] = LINEUP_TIME_HOURS,
): CountedFilterOption[] {
  const usable = items.filter(
    (item) => item.startMs > 0 && !isLineupItemExpired(item, nowMs),
  );
  const options: CountedFilterOption[] = [];
  for (const hour of hours) {
    const count = usable.filter((item) => localHour(item.startMs) >= hour).length;
    if (count === 0) continue;
    options.push({ value: String(hour), label: label(hour), count });
  }
  return options;
}

/**
 * The clock reading a time option is labelled with, in the viewer's locale —
 * "8:00 PM" in en, "20:00" in de. Formatted off a fixed UTC instant because
 * the label is a clock reading, not a moment in time; the lexicon wraps it
 * ("From {time}" / "Ab {time}").
 */
export function formatLineupHour(hour: number, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(2026, 0, 1, hour, 0, 0)));
  } catch {
    return `${String(hour).padStart(2, '0')}:00`;
  }
}
