// Pure view-model core for /tonight — the evening-intention page ("who is
// streaming tonight"), the streaming equivalent of a TV magazine's
// "TV-Programm heute 20:15". Sibling of /live, which answers "right now".
//
// ---------------------------------------------------------------------------
// THE TIMEZONE MODEL (read this before changing anything here)
// ---------------------------------------------------------------------------
// "Tonight" is a LOCAL concept and one prerendered ISR page serves every
// timezone on earth. The repo's standing rule — never bake a local hour into
// server HTML (lib/home/minute-clock.ts, lib/format/time.ts `localDateKey`) —
// forbids deriving the window from the render machine's clock.
//
// So the page works like a national TV magazine: each LOCALE has a fixed
// REFERENCE ZONE (de → Europe/Berlin, ja → Asia/Tokyo, …). The window and the
// block boundaries are computed in that zone, which makes them deterministic,
// cacheable and identical for every visitor of that locale — the rule is about
// VIEWER-dependent time, and a per-locale constant is not viewer-dependent.
//
// Blocks are therefore ABSOLUTE instant ranges. Their headings are only a
// clock READING of those instants, so the client can relabel them in the
// viewer's own zone after hydration (components/web/tonight/TonightBlocks.tsx)
// without moving a single card between blocks — no reflow, no hydration
// mismatch, and the server HTML stays the crawlable source of truth.
//
// Known and accepted limitation: a viewer far from their locale's reference
// zone gets block boundaries on odd local hours (a US-Eastern visitor on /en
// reads the London 18:00–06:00 window as 13:00–01:00). Their evening is still
// INSIDE the window because it is 12 hours wide — only its edges shift. Fully
// re-windowing per viewer would mean shipping the whole pool as data and
// re-rendering every card client-side; deliberately not done in v1.

import { listConjunction, type UiLang } from '@/lib/i18n-core';
import type { PublicStreamSlot } from '@/lib/server/partner-api';
import {
  countFilterOptions,
  normalizeLanguageCode,
  type CountedFilterOption,
} from '@/lib/home/filter-options';

/**
 * The zone each locale's evening is anchored to — the "national" zone of the
 * language's largest streaming audience, the way a printed TV guide prints one
 * country's times.
 *
 * `en` is the hard case (no single country). Europe/London is chosen because
 * the rest of this site already renders server-side times in UTC, so the
 * English page keeps one consistent frame; London is UTC in winter and UTC+1
 * in summer, which also keeps the evening block on a round UTC hour for half
 * the year. `pt` follows its audience to Brazil, not Portugal.
 */
export const TONIGHT_REFERENCE_ZONES: Record<UiLang, string> = {
  en: 'Europe/London',
  de: 'Europe/Berlin',
  es: 'Europe/Madrid',
  fr: 'Europe/Paris',
  pt: 'America/Sao_Paulo',
  it: 'Europe/Rome',
  ru: 'Europe/Moscow',
  ja: 'Asia/Tokyo',
  uk: 'Europe/Kyiv',
  ar: 'Asia/Riyadh',
  hu: 'Europe/Budapest',
  pl: 'Europe/Warsaw',
};

export function tonightZoneFor(locale: UiLang): string {
  return TONIGHT_REFERENCE_ZONES[locale] ?? 'UTC';
}

/**
 * The broadcast-day boundary, TV-listings convention: hours before this belong
 * to the PREVIOUS evening's night. At 01:00 the page is still showing the night
 * that started yesterday at 18:00, not promising an evening 17 hours away.
 */
export const BROADCAST_DAY_START_HOUR = 6;

/** First hour of the evening window. */
export const EVENING_START_HOUR = 18;

/**
 * Block boundaries as hours from the evening date's local midnight, so 24 = the
 * following midnight and 30 = 06:00 the next morning. Four blocks: early
 * evening, prime time, late evening, night.
 */
export const TONIGHT_BLOCK_BOUNDS = [18, 20, 22, 24, 30] as const;

/**
 * The "20:15" highlight window (minutes from the evening date's local
 * midnight). Deliberately wider than the German 20:15 slot itself — streams do
 * not start on a broadcaster's grid, and a half-hour either side is what makes
 * the highlight box reliably non-empty.
 */
export const PRIMETIME_START_MINUTES = 19 * 60 + 30;
export const PRIMETIME_END_MINUTES = 21 * 60 + 30;

/** Cards in the prime-time highlight box. */
export const PRIMETIME_CAP = 4;

/** Streamer names named in the intro sentence (SEO copy + answer text). */
export const HEADLINE_NAME_CAP = 3;

/**
 * How far ahead the page fetches, in hours. Must cover every locale's window:
 * the window ends at 06:00 of the next reference day, which is at most 24 h
 * after `now` in any zone (at 06:00 local exactly). The extra headroom absorbs
 * the fetch bucket and gives the quiet-night fallback something to show.
 */
export const TONIGHT_FETCH_HOURS = 26;

/** Payload guard on the whole evening pool (cards + filter metadata). */
export const TONIGHT_POOL_MAX = 400;

/** Cards rendered as server HTML per block; the rest travels as data. */
export const TONIGHT_SSR_PER_BLOCK = 12;

/** Cards visible per block before the visitor asks for more. */
export const TONIGHT_VISIBLE_PER_BLOCK = 6;

/** How many more cards one "show more" click reveals, per block. */
export const TONIGHT_REVEAL_STEP = 12;

/**
 * Rows in the "already live" section before anyone touches a dropdown — a
 * taster, /live owns the full list.
 *
 * This is the VISIBLE cut, not the filter scope. Keeping the two apart is the
 * whole point: the homepage rail once rendered only its visible cards and its
 * dropdowns could therefore only search those, so German showed 3 of 17 live
 * streams and several languages had no option at all (fixed 2026-07-29). The
 * section renders the whole pool and hides the tail instead.
 */
export const TONIGHT_LIVE_CAP = 8;

/**
 * Filter scope of the "already live" section, i.e. how much of the live sweep
 * the dropdowns can reach. Also the payload guard — cards beyond the visible
 * cut travel as pruned DATA, not as HTML. Production runs ~130 live streamers
 * with evening peaks of 150-250 plausible.
 */
export const TONIGHT_LIVE_POOL_MAX = 200;

/**
 * How many live rows ship as server HTML. Pinned to the visible cut and it must
 * never be lower: the resting section IS the first TONIGHT_LIVE_CAP rows, so a
 * smaller head would leave the default state depending on client rendering — a
 * blank gap for crawlers and JS-less browsers. Larger would only pay for HTML
 * nobody sees until a filter is picked. `splitTonightLiveSlots` enforces it.
 */
export const TONIGHT_LIVE_SSR_COUNT = TONIGHT_LIVE_CAP;

// ============================================
// Timezone primitives
// ============================================

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function zonedFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(timeZone);
  if (cached) return cached;
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    // h23 rather than hour12:false — some ICU builds render midnight as "24"
    // under the latter, which would put the broadcast-day check on the wrong
    // side of its boundary.
    hourCycle: 'h23',
  });
  formatterCache.set(timeZone, fmt);
  return fmt;
}

/** Wall-clock parts of an instant in `timeZone`. */
export function zonedParts(ms: number, timeZone: string): ZonedParts {
  const parts = zonedFormatter(timeZone).formatToParts(new Date(ms));
  const read = (type: string): number => {
    const found = parts.find((p) => p.type === type);
    return found ? Number(found.value) : 0;
  };
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    // Belt and braces for the "24:00" ICU quirk described above.
    hour: read('hour') % 24,
    minute: read('minute'),
  };
}

/** UTC offset of `timeZone` at `ms`, in minutes (positive east of Greenwich). */
export function zoneOffsetMinutes(ms: number, timeZone: string): number {
  const p = zonedParts(ms, timeZone);
  const wallAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  // Compare against the instant floored to the minute — `zonedParts` has no
  // seconds, so anything finer would leak into the offset.
  const flooredMs = Math.floor(ms / 60_000) * 60_000;
  return Math.round((wallAsUtc - flooredMs) / 60_000);
}

/** `YYYY-MM-DD` calendar date of an instant in `timeZone`. */
export function zonedDateKey(ms: number, timeZone: string): string {
  const p = zonedParts(ms, timeZone);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Shifts a `YYYY-MM-DD` key by whole days. */
export function addDaysToDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const shifted = new Date(Date.UTC(y, (m ?? 1) - 1, (d ?? 1) + days));
  return shifted.toISOString().slice(0, 10);
}

/**
 * The instant at which the wall clock in `timeZone` reads
 * `dateKey 00:00 + minutesFromMidnight`. Minutes beyond 1440 roll into the
 * following days, which is how the 24:00/30:00 block bounds are expressed.
 *
 * Two passes because the offset itself depends on the instant we are solving
 * for: the first guess uses the offset at the naive UTC reading, the second
 * re-reads it at the corrected instant. That is what makes the block bounds
 * survive a DST transition inside the window. (None of the configured zones
 * transitions at one of our boundary hours today — Europe shifts at 02:00/03:00
 * local — but a zone-database change must not silently move the evening.)
 */
export function zonedWallTimeToMs(
  dateKey: string,
  minutesFromMidnight: number,
  timeZone: string,
): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  const naive = Date.UTC(y, (m ?? 1) - 1, d ?? 1) + minutesFromMidnight * 60_000;
  const firstPass = naive - zoneOffsetMinutes(naive, timeZone) * 60_000;
  return naive - zoneOffsetMinutes(firstPass, timeZone) * 60_000;
}

// ============================================
// The window
// ============================================

/**
 * `evening` = the page is previewing the coming/current evening.
 * `night` = it is past midnight and the evening that is still running belongs
 * to yesterday's date (broadcast-day convention).
 */
export type TonightMode = 'evening' | 'night';

export interface TonightWindow {
  mode: TonightMode;
  timeZone: string;
  /** Reference-zone calendar date the evening belongs to. */
  dateKey: string;
  /** Instant of `dateKey` 18:00 reference-local. */
  startMs: number;
  /** Instant of `dateKey`+1 06:00 reference-local, exclusive. */
  endMs: number;
  /** Reference-zone UTC offset at `startMs`, in minutes. */
  offsetMinutes: number;
}

/**
 * Which evening the page is about, in the locale's reference zone.
 *
 * `nowMs` should be bucketed by the caller (lib/home/logic.ts `floorToBucket`)
 * so regenerations inside one bucket render byte-identical HTML — Vercel only
 * bills an ISR write when the output changed.
 */
export function resolveTonightWindow(nowMs: number, timeZone: string): TonightWindow {
  const now = zonedParts(nowMs, timeZone);
  const pad = (n: number) => String(n).padStart(2, '0');
  const todayKey = `${now.year}-${pad(now.month)}-${pad(now.day)}`;
  const mode: TonightMode =
    now.hour >= BROADCAST_DAY_START_HOUR ? 'evening' : 'night';
  const dateKey = mode === 'evening' ? todayKey : addDaysToDateKey(todayKey, -1);
  const startMs = zonedWallTimeToMs(dateKey, EVENING_START_HOUR * 60, timeZone);
  const endMs = zonedWallTimeToMs(
    dateKey,
    (24 + BROADCAST_DAY_START_HOUR) * 60,
    timeZone,
  );
  return {
    mode,
    timeZone,
    dateKey,
    startMs,
    endMs,
    offsetMinutes: zoneOffsetMinutes(startMs, timeZone),
  };
}

export interface TonightBlock {
  /** Stable anchor id, e.g. `tonight-18`. */
  id: string;
  /** Minutes from the evening date's local midnight. */
  fromMinutes: number;
  toMinutes: number;
  startMs: number;
  /** Exclusive. */
  endMs: number;
  /** The 00:00–06:00 block — headed by a word, not a clock reading. */
  isNight: boolean;
}

export function buildTonightBlocks(window: TonightWindow): TonightBlock[] {
  const blocks: TonightBlock[] = [];
  for (let i = 0; i < TONIGHT_BLOCK_BOUNDS.length - 1; i++) {
    const fromHour = TONIGHT_BLOCK_BOUNDS[i];
    const toHour = TONIGHT_BLOCK_BOUNDS[i + 1];
    blocks.push({
      id: `tonight-${fromHour}`,
      fromMinutes: fromHour * 60,
      toMinutes: toHour * 60,
      startMs: zonedWallTimeToMs(window.dateKey, fromHour * 60, window.timeZone),
      endMs: zonedWallTimeToMs(window.dateKey, toHour * 60, window.timeZone),
      isNight: fromHour >= 24,
    });
  }
  return blocks;
}

// ============================================
// Slot selection
// ============================================

/** Milliseconds a slot's start must be in the future to still be listed. */
function startsAfter(slot: PublicStreamSlot, ms: number): boolean {
  const start = Date.parse(slot.start_time);
  return Number.isFinite(start) && start > ms;
}

function startMsOf(slot: PublicStreamSlot): number {
  const start = Date.parse(slot.start_time);
  return Number.isFinite(start) ? start : 0;
}

export function isCancelled(slot: Pick<PublicStreamSlot, 'slot_kind'>): boolean {
  return slot.slot_kind === 'cancelled';
}

/**
 * The evening's upcoming slots: inside the window, not started yet, not
 * always-on.
 *
 * Cancelled slots are KEPT — "no stream tonight after all" is exactly the kind
 * of thing a listings page exists to tell you, and SlotCard already renders
 * them struck through. They are excluded from the highlight box and the intro
 * copy instead (see rankSlotsByProminence).
 *
 * Deliberately NOT deduplicated per streamer: a channel with an early and a
 * late stream has two entries in a TV listing, and the blocks are ordered by
 * time, so both read correctly.
 */
export function selectTonightSlots(
  slots: readonly PublicStreamSlot[],
  window: TonightWindow,
  nowMs: number,
  cap: number = TONIGHT_POOL_MAX,
): PublicStreamSlot[] {
  const seen = new Set<string>();
  return slots
    .filter((slot) => {
      if (slot.status === 'live' || slot.is_always_on) return false;
      if (!startsAfter(slot, nowMs)) return false;
      const start = startMsOf(slot);
      if (start < window.startMs || start >= window.endMs) return false;
      if (seen.has(slot.id)) return false;
      seen.add(slot.id);
      return true;
    })
    .sort(
      (a, b) =>
        startMsOf(a) - startMsOf(b) || a.id.localeCompare(b.id),
    )
    .slice(0, cap);
}

/**
 * Distributes the evening's slots over its blocks, keeping each block
 * chronological. Index-aligned with `blocks`; a slot outside every block (only
 * possible if the caller mixes windows) is dropped rather than misfiled.
 */
export function bucketSlotsIntoBlocks(
  slots: readonly PublicStreamSlot[],
  blocks: readonly TonightBlock[],
): PublicStreamSlot[][] {
  const buckets: PublicStreamSlot[][] = blocks.map(() => []);
  for (const slot of slots) {
    const start = startMsOf(slot);
    const index = blocks.findIndex((b) => start >= b.startMs && start < b.endMs);
    if (index === -1) continue;
    buckets[index].push(slot);
  }
  return buckets;
}

/**
 * The live POOL for tonight's opener — one row per streamer, biggest current
 * audience first. This is the filter scope, not the visible set: the section
 * shows the first TONIGHT_LIVE_CAP of them and hides the rest until a filter
 * reveals them (`computeVisibleLiveIds`, shared with the homepage rail).
 *
 * The freshness requirement is the same as the homepage rail
 * (`lib/home/live-rail.ts`) and doubles as the zombie-slot guard: a slot whose
 * streamer went offline without the backend noticing keeps `status='live'`
 * forever and is never sampled again, so `viewer_count` stays null.
 *
 * Unlike the homepage rail there is no unsampled fallback: this section is a
 * teaser above a full listing, so showing nothing is better than showing a
 * stream that ended days ago.
 *
 * The returned order IS the rank order, and the section's default cut is a
 * prefix of it — an invariant the server render depends on (it ships
 * everything past that index `hidden`, so the island reproduces the served
 * HTML on mount).
 */
export function selectAlreadyLive(
  slots: readonly PublicStreamSlot[],
  cap: number = TONIGHT_LIVE_POOL_MAX,
): PublicStreamSlot[] {
  const live = slots.filter(
    (slot) => slot.status === 'live' && typeof slot.viewer_count === 'number',
  );
  const seen = new Set<string>();
  const picked: PublicStreamSlot[] = [];
  for (const slot of [...live].sort(
    (a, b) =>
      (b.viewer_count ?? -1) - (a.viewer_count ?? -1) || a.id.localeCompare(b.id),
  )) {
    if (seen.has(slot.streamer_id)) continue;
    seen.add(slot.streamer_id);
    picked.push(slot);
    if (picked.length >= cap) break;
  }
  return picked;
}

/**
 * Exactly what `TonightLiveRow` renders. A `Pick` of the DTO rather than a
 * parallel shape, so a row that starts reading a new field fails to compile
 * here instead of rendering `undefined` in production — the rule
 * lib/home/slot-payload.ts established for the homepage's deferred pools.
 *
 * No `start_time`/`duration_minutes`: unlike the homepage rail these rows carry
 * no runtime countdown, which is also why this section needs no clock at all.
 */
export type TonightLiveRowSlot = Pick<
  PublicStreamSlot,
  | 'id'
  | 'streamer_id'
  | 'streamer_name'
  | 'title'
  | 'platforms'
  | 'avatar_url'
  | 'is_always_on'
  | 'viewer_count'
>;

/** Prunes a live slot to what the row renders. */
export function toTonightLiveRowSlot(slot: PublicStreamSlot): TonightLiveRowSlot {
  return {
    id: slot.id,
    streamer_id: slot.streamer_id,
    streamer_name: slot.streamer_name,
    title: slot.title,
    platforms: slot.platforms,
    avatar_url: slot.avatar_url,
    is_always_on: slot.is_always_on,
    viewer_count: slot.viewer_count,
  };
}

/**
 * Splits the ranked live pool into the server-rendered head and the deferred
 * tail. Both keep the pool's viewer ranking, which is what lets the island
 * append its matches after the server's and still read as one ranked list (the
 * head is a strict PREFIX, so head matches always outrank tail matches).
 */
export function splitTonightLiveSlots<T>(
  slots: T[],
  ssrCount: number = TONIGHT_LIVE_SSR_COUNT,
): { ssr: T[]; deferred: T[] } {
  const head = Math.max(ssrCount, TONIGHT_LIVE_CAP);
  return { ssr: slots.slice(0, head), deferred: slots.slice(head) };
}

const CONFIDENCE_WEIGHT: Record<string, number> = { high: 3, medium: 2, low: 1 };

/**
 * Editorial ordering for the highlight box and the intro sentence: the biggest
 * names first.
 *
 * `followers` is the follower count per streamer id, from the cached featured
 * sweep (`lib/server/home-featured.ts`) — the site's existing curated pool.
 * Streamers outside it rank below every known one rather than being dropped, so
 * a missing/failed sweep degrades to a confidence-then-time ordering instead of
 * an empty box.
 *
 * Cancelled slots never rank: announcing "X streams tonight" on the strength of
 * a cancellation would contradict the card right below it. Low confidence is
 * excluded for the same reason — the highlight is the page's editorial promise.
 *
 * The `id` tiebreak is load-bearing: ISR regenerations must produce identical
 * markup for identical data (byte-determinism → no billed ISR write).
 */
export function rankSlotsByProminence(
  slots: readonly PublicStreamSlot[],
  followers: ReadonlyMap<string, number>,
): PublicStreamSlot[] {
  const eligible = slots.filter(
    (slot) => !isCancelled(slot) && slot.confidence !== 'low',
  );
  const sorted = [...eligible].sort((a, b) => {
    const fa = followers.get(a.streamer_id) ?? -1;
    const fb = followers.get(b.streamer_id) ?? -1;
    if (fa !== fb) return fb - fa;
    const ca = CONFIDENCE_WEIGHT[a.confidence] ?? 0;
    const cb = CONFIDENCE_WEIGHT[b.confidence] ?? 0;
    if (ca !== cb) return cb - ca;
    return startMsOf(a) - startMsOf(b) || a.id.localeCompare(b.id);
  });
  const seen = new Set<string>();
  const deduped: PublicStreamSlot[] = [];
  for (const slot of sorted) {
    if (seen.has(slot.streamer_id)) continue;
    seen.add(slot.streamer_id);
    deduped.push(slot);
  }
  return deduped;
}

/** The highlight box: the evening's biggest names around prime time. */
export function pickPrimetimeSlots(
  slots: readonly PublicStreamSlot[],
  window: TonightWindow,
  followers: ReadonlyMap<string, number>,
  cap: number = PRIMETIME_CAP,
): PublicStreamSlot[] {
  const from = zonedWallTimeToMs(
    window.dateKey,
    PRIMETIME_START_MINUTES,
    window.timeZone,
  );
  const to = zonedWallTimeToMs(window.dateKey, PRIMETIME_END_MINUTES, window.timeZone);
  const inWindow = slots.filter((slot) => {
    const start = startMsOf(slot);
    return start >= from && start < to;
  });
  return rankSlotsByProminence(inWindow, followers).slice(0, cap);
}

/** Names for the intro sentence, biggest first. */
export function pickHeadlineNames(
  slots: readonly PublicStreamSlot[],
  followers: ReadonlyMap<string, number>,
  cap: number = HEADLINE_NAME_CAP,
): string[] {
  return rankSlotsByProminence(slots, followers)
    .slice(0, cap)
    .map((slot) => slot.streamer_name);
}

/** Prose list of the headline names in the page's locale ("A, B and C"). */
export function formatHeadlineNames(names: string[], locale: string): string {
  return listConjunction(names, locale);
}

// ============================================
// Filters
// ============================================

export interface TonightFilterItem {
  /** Matches the card's `data-tonight-id`. */
  id: string;
  /** Which block's list the card lives in. */
  blockId: string;
  /** Raw category name; '' when the slot has none. */
  category: string;
  /** Normalized language code; '' when unknown. */
  language: string;
  /** Language name in the VIEWER's locale, for the dropdown option. */
  languageLabel: string;
  /** Epoch ms of the start; 0 when unparseable. */
  startMs: number;
}

export interface TonightSelection {
  category: string;
  language: string;
}

export const EMPTY_TONIGHT_SELECTION: TonightSelection = { category: '', language: '' };

export function isTonightSelectionActive(selection: TonightSelection): boolean {
  return selection.category !== '' || selection.language !== '';
}

/**
 * Filter metadata for the whole evening pool. `languageName` resolves a code to
 * the viewer's locale (D6: chrome follows the viewer) and is injected so this
 * module needs no Intl setup.
 */
export function buildTonightFilterItems(
  buckets: readonly (readonly PublicStreamSlot[])[],
  blocks: readonly TonightBlock[],
  languageName: (code: string) => string,
): TonightFilterItem[] {
  const items: TonightFilterItem[] = [];
  buckets.forEach((slots, index) => {
    const blockId = blocks[index]?.id ?? '';
    for (const slot of slots) {
      const language = normalizeLanguageCode(slot.streamer_language) ?? '';
      items.push({
        id: slot.id,
        blockId,
        category: slot.category?.trim() ?? '',
        language,
        languageLabel: language ? languageName(language) : '',
        startMs: startMsOf(slot),
      });
    }
  });
  return items;
}

/**
 * A card whose start has passed. The ISR page can be served minutes-to-hours
 * stale and a tab ages arbitrarily, so an expired prediction would otherwise
 * sit in the listing as a "was expected at …" card. `startMs` 0 means
 * unparseable and is never treated as expired.
 */
export function isTonightItemExpired(item: TonightFilterItem, nowMs: number): boolean {
  return item.startMs > 0 && item.startMs <= nowMs;
}

/**
 * Cards passing the selection. An empty selection matches everything; items
 * without a category/language are only reachable that way, which is why neither
 * dimension offers an "unknown" option (shared rule — see
 * lib/home/filter-options.ts).
 */
export function matchesTonightFilters(
  item: TonightFilterItem,
  selection: TonightSelection,
): boolean {
  return (
    (selection.category === '' || item.category === selection.category) &&
    (selection.language === '' || item.language === selection.language)
  );
}

/**
 * Ids of the unexpired cards passing the selection, grouped by block and in
 * pool order (chronological). Each block's reveal window is a PREFIX of its own
 * list, so "show 12 more" is well defined per block across the server-rendered
 * head and the deferred tail alike.
 */
export function matchingTonightIdsByBlock(
  items: readonly TonightFilterItem[],
  selection: TonightSelection,
  nowMs: number,
): Map<string, string[]> {
  const byBlock = new Map<string, string[]>();
  for (const item of items) {
    if (isTonightItemExpired(item, nowMs)) continue;
    if (!matchesTonightFilters(item, selection)) continue;
    const list = byBlock.get(item.blockId);
    if (list) list.push(item.id);
    else byBlock.set(item.blockId, [item.id]);
  }
  return byBlock;
}

/** How many matching cards a block shows after `steps` reveal clicks. */
export function tonightRevealLimit(steps: number): number {
  if (steps <= 0) return TONIGHT_VISIBLE_PER_BLOCK;
  return TONIGHT_VISIBLE_PER_BLOCK + steps * TONIGHT_REVEAL_STEP;
}

/** Category options over the pool the other dimension already narrowed. */
export function countTonightCategoryOptions(
  items: readonly TonightFilterItem[],
): CountedFilterOption[] {
  return countFilterOptions(
    items,
    (item) => item.category,
    (item) => item.category,
  );
}

/** Language options over the pool the other dimension already narrowed. */
export function countTonightLanguageOptions(
  items: readonly TonightFilterItem[],
): CountedFilterOption[] {
  return countFilterOptions(
    items,
    (item) => item.language,
    (item) => item.languageLabel,
  );
}

// ============================================
// Labels
// ============================================

/**
 * Clock reading of an instant, e.g. "20:00" / "8:00 PM".
 *
 * `timeZone` is the reference zone on the server (deterministic, ISR-safe) and
 * OMITTED on the client, where the runtime zone is the viewer's — that swap is
 * the whole local-relabeling mechanism. Never call it without a zone on the
 * server.
 */
export function formatClockReading(
  ms: number,
  locale: string,
  timeZone?: string,
): string {
  try {
    // The locale goes to Intl unmapped, exactly like the homepage's
    // `formatLineupHour`: English readers get "8:00 PM", German "20:00". The
    // "20:15" brand hook is a German phrasing, not a format to force on en.
    return new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      ...(timeZone ? { timeZone } : {}),
    }).format(new Date(ms));
  } catch {
    return '';
  }
}

/**
 * Short zone name for the "times are in …" note, e.g. "CEST", "GMT+9".
 * Deterministic per (zone, instant) and only changes at a DST transition.
 */
export function formatZoneLabel(ms: number, locale: string, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat(locale, {
      timeZone,
      timeZoneName: 'short',
    }).formatToParts(new Date(ms));
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? timeZone;
  } catch {
    return timeZone;
  }
}

/**
 * The evening's date, e.g. "Wednesday, 5 August". Rendered in the REFERENCE
 * zone from the window's own date key, so it never depends on a runtime clock.
 */
export function formatEveningDate(
  window: TonightWindow,
  locale: string,
): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      // The key already IS the reference-zone date; midday UTC keeps the
      // formatter on that calendar day for every zone it could be read in.
      timeZone: 'UTC',
    }).format(new Date(`${window.dateKey}T12:00:00Z`));
  } catch {
    return window.dateKey;
  }
}
