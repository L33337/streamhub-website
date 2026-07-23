// Pure Program-page logic — port of the mobile app's Program tab pipeline
// (StreamHub: src/hooks/useStreamSlots.ts + src/utils/streamUtils.ts +
// src/utils/dateUtils.ts + src/hooks/useFavorites.ts). Status and dedupe
// primitives are reused from lib/feed/logic.ts (already ported for M16) —
// do not duplicate them here.
//
// Every function takes explicit `now`/`selectedDate` params so tests are
// deterministic. All day/hour math uses LOCAL Date getters on purpose (app
// parity: the viewer's local timezone defines the day) — callers must only
// run this client-side after mount (ProgramClient renders a skeleton until
// then, so SSR never produces timezone-dependent markup).
//
// Deliberate difference from the feed's deriveLiveAndUpNext: cancelled slots
// are KEPT — the Program page renders them greyed out with a CANCELLED badge
// (app parity), while the feed excludes them from Up Next.

import {
  calculateStreamStatus,
  deduplicateStreamerSlots,
  relativeStartLabel,
  sortSlotsByStartTime,
} from '@/lib/feed/logic';
import { toPublicStreamSlot } from '@/lib/feed/transforms';
import type { Platform, PublicStreamSlot } from '@/lib/server/partner-api';
import type { StreamSlot } from '@/lib/feed/types';
import type { FavoriteStreamerRow } from '@/lib/supabase/favorites';
import type { ProgramDay, ProgramSection } from './types';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const MISSED_WINDOW_MS = 6 * 60 * 60 * 1000;
// Two missed 10-min enrichment sweeps + margin (app streamUtils.ts).
const VIEWER_STALE_MS = 25 * MINUTE_MS;
/** Relative "In 45 min" labels only inside this window (feed Up Next parity). */
const RELATIVE_START_WINDOW_MS = 12 * HOUR_MS;

/** '12am' | '4pm' — port of app dateUtils.getHourLabel. */
export function getHourLabel(hour: number): string {
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  if (hour < 12) return `${hour}am`;
  return `${hour - 12}pm`;
}

export function getEndTime(startTime: string, durationMinutes: number): Date {
  return new Date(new Date(startTime).getTime() + durationMinutes * MINUTE_MS);
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** "8:00 PM" — app dateUtils.formatTime (en-US, gated pages are English). */
export function formatLocalTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/** "8:00 PM – 10:00 PM" for the Missed rows. */
export function formatLocalTimeRange(startTime: string, durationMinutes: number): string {
  return `${formatLocalTime(startTime)} – ${formatLocalTime(getEndTime(startTime, durationMinutes))}`;
}

/** Date-chip label: 'today' or 'Jan 5' (app useTimeFilter semantics). */
export function formatDateChipLabel(selectedDate: Date, now: Date): string {
  if (isSameLocalDay(selectedDate, now)) return 'today';
  return selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** yyyy-mm-dd in LOCAL time — native date-input value AND day-strip key. */
export function toLocalDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromLocalDateInputValue(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Local midnight of a date — day-arithmetic base for the helpers below. */
function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// ---------------------------------------------------------------------------
// Day strip (UX round 2026-07-23) — predictions reach ~7 days out, so a
// 7-day strip replaces the picker as the primary day navigation.
// ---------------------------------------------------------------------------

export interface StripDay {
  date: Date;
  /** yyyy-mm-dd — stable key + equality with the selected date. */
  key: string;
  /** 'Today' | 'Tomorrow' | 'Sat 26'. */
  label: string;
}

export function buildStripDays(now: Date, count = 7): StripDay[] {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    // Composed manually — Intl's weekday+day ordering is locale-data-driven
    // (Node renders "9 Thu") and we want a stable "Thu 9".
    const label =
      i === 0
        ? 'Today'
        : i === 1
          ? 'Tomorrow'
          : `${date.toLocaleDateString('en-US', { weekday: 'short' })} ${date.getDate()}`;
    return { date, key: toLocalDateInputValue(date), label };
  });
}

/** 'Today' | 'Tomorrow' | 'Thu, Jul 30' — empty-state jump button label. */
export function formatDayButtonLabel(date: Date, now: Date): string {
  const dayDiff = Math.round(
    (startOfLocalDay(date).getTime() - startOfLocalDay(now).getTime()) / DAY_MS,
  );
  if (dayDiff <= 0) return 'Today';
  if (dayDiff === 1) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * Port of app streamUtils.filterSlotsByDate: slots on the selected local day,
 * plus previous-day slots starting at 21:00+ (late-evening carry-over).
 * Always-on live slots show on ALL dates; regular live slots only when the
 * selected date is today. Expects status already recomputed.
 */
export function filterSlotsByDate(
  slots: StreamSlot[],
  selectedDate: Date,
  now: Date,
): StreamSlot[] {
  const prevDay = new Date(selectedDate);
  prevDay.setDate(prevDay.getDate() - 1);

  return slots.filter((slot) => {
    if (slot.status === 'live' && slot.isAlwaysOn) return true;
    if (slot.status === 'live') return isSameLocalDay(selectedDate, now);

    const slotDate = new Date(slot.startTime);
    if (isSameLocalDay(slotDate, selectedDate)) return true;
    return isSameLocalDay(slotDate, prevDay) && slotDate.getHours() >= 21;
  });
}

/**
 * "Missed" (app useStreamSlots completedSlots): only when viewing today —
 * real slots (not AI predictions) that already ended, with the end within
 * the last 6 hours. Computed over the FULL fetched set (not the date-filtered
 * one) so an overnight stream that started yesterday still counts.
 */
export function computeMissedSlots(
  slots: StreamSlot[],
  selectedDate: Date,
  now: Date,
): StreamSlot[] {
  if (!isSameLocalDay(selectedDate, now)) return [];
  const windowFloor = now.getTime() - MISSED_WINDOW_MS;
  return sortSlotsByStartTime(
    slots.filter((slot) => {
      if (slot.isAiPrediction) return false;
      if (calculateStreamStatus(slot, now) !== 'offline') return false;
      return getEndTime(slot.startTime, slot.duration).getTime() >= windowFloor;
    }),
  );
}

/** Group upcoming slots by LOCAL start hour, sections ascending by hour. */
export function groupUpcomingByHour(upcoming: StreamSlot[]): ProgramSection[] {
  const byHour = new Map<number, StreamSlot[]>();
  for (const slot of sortSlotsByStartTime(upcoming)) {
    const hour = new Date(slot.startTime).getHours();
    const list = byHour.get(hour) ?? [];
    list.push(slot);
    byHour.set(hour, list);
  }
  return [...byHour.entries()]
    .sort(([a], [b]) => a - b)
    .map(([hour, slots]) => ({
      id: `hour-${hour}`,
      title: getHourLabel(hour),
      type: 'upcoming' as const,
      hour,
      slots,
    }));
}

/**
 * "Offline today" (app useFavorites + program.tsx listData): favorites with
 * no slot starting on the ACTUAL current day (deliberately today, not the
 * selected date — app parity), minus streamers already visible in the
 * live/upcoming/missed sections.
 */
export function deriveOfflineFavorites(
  favorites: FavoriteStreamerRow[],
  allSlots: StreamSlot[],
  activeStreamerIds: Set<string>,
  now: Date,
): FavoriteStreamerRow[] {
  const streamingToday = new Set(
    allSlots
      .filter((slot) => isSameLocalDay(new Date(slot.startTime), now))
      .map((slot) => slot.streamerId),
  );
  return favorites.filter(
    (s) => !streamingToday.has(s.id) && !activeStreamerIds.has(s.id),
  );
}

/**
 * Full pipeline (app useStreamSlots useMemo): recompute status → date filter
 * → dedupe → live/upcoming split → 'Live Now' + hour sections → missed →
 * offline favorites.
 */
export function buildProgramDay(
  slots: StreamSlot[],
  favorites: FavoriteStreamerRow[],
  selectedDate: Date,
  now: Date,
): ProgramDay {
  const withStatus = slots.map((slot) => ({
    ...slot,
    status: calculateStreamStatus(slot, now),
  }));

  const daySlots = filterSlotsByDate(withStatus, selectedDate, now);
  const deduped = deduplicateStreamerSlots(daySlots);

  const live = sortSlotsByStartTime(deduped.filter((s) => s.status === 'live'));
  const upcoming = sortSlotsByStartTime(deduped.filter((s) => s.status === 'upcoming'));

  const sections: ProgramSection[] = [];
  if (live.length > 0) {
    sections.push({ id: 'live', title: 'Live Now', type: 'live', hour: null, slots: live });
  }
  sections.push(...groupUpcomingByHour(upcoming));

  const missedSlots = computeMissedSlots(withStatus, selectedDate, now);

  const activeStreamerIds = new Set<string>();
  sections.forEach((section) =>
    section.slots.forEach((slot) => activeStreamerIds.add(slot.streamerId)),
  );
  missedSlots.forEach((slot) => activeStreamerIds.add(slot.streamerId));

  const offlineFavorites = deriveOfflineFavorites(
    favorites,
    withStatus,
    activeStreamerIds,
    now,
  );

  return { sections, missedSlots, offlineFavorites };
}

/**
 * Whether a slot's live viewer count is trustworthy enough to render (app
 * streamUtils.isViewerCountFresh): live, positive count, sample < 25 min old.
 */
export function isViewerCountFresh(slot: StreamSlot, now: Date): boolean {
  if (calculateStreamStatus(slot, now) !== 'live') return false;
  if (typeof slot.viewerCount !== 'number' || slot.viewerCount <= 0) return false;
  if (!slot.viewerCountUpdatedAt) return false;
  const updatedAt = new Date(slot.viewerCountUpdatedAt).getTime();
  if (Number.isNaN(updatedAt)) return false;
  return now.getTime() - updatedAt < VIEWER_STALE_MS;
}

/**
 * Scroll target for the 4pm/8pm chips: the first upcoming section at or after
 * the target local hour, else the last upcoming section, else null.
 */
export function findScrollTargetSection(
  sections: ProgramSection[],
  targetHour: number,
): string | null {
  const upcoming = sections.filter((s) => s.type === 'upcoming' && s.hour !== null);
  if (upcoming.length === 0) return null;
  const match = upcoming.find((s) => (s.hour as number) >= targetHour);
  return (match ?? upcoming[upcoming.length - 1]).id;
}

/**
 * toPublicStreamSlot + the viewer-count freshness guard, so SlotCard's
 * "N watching" pill only shows trustworthy numbers. Client-side only (the
 * guard uses the client clock — same authority the app uses).
 */
export function toProgramPublicSlot(slot: StreamSlot, now: Date): PublicStreamSlot {
  return {
    ...toPublicStreamSlot(slot),
    viewer_count: isViewerCountFresh(slot, now) ? (slot.viewerCount as number) : null,
  };
}

// ---------------------------------------------------------------------------
// UX round 2026-07-23 — pure helpers for the Program page additions.
// ---------------------------------------------------------------------------

/**
 * The earliest upcoming, non-cancelled slot of a streamer (any day) — turns
 * the dead-end "No stream today" row into "Next: Tomorrow ~8pm". Cancelled
 * slots are skipped (they announce the ABSENCE of a stream); uncertain slots
 * count (still a prediction).
 */
export function findNextExpectedSlot(
  slots: StreamSlot[],
  streamerId: string,
  now: Date,
): StreamSlot | null {
  let best: StreamSlot | null = null;
  for (const slot of slots) {
    if (slot.streamerId !== streamerId) continue;
    if (slot.slotKind === 'cancelled') continue;
    const startMs = new Date(slot.startTime).getTime();
    if (Number.isNaN(startMs) || startMs <= now.getTime()) continue;
    if (calculateStreamStatus(slot, now) !== 'upcoming') continue;
    if (!best || startMs < new Date(best.startTime).getTime()) best = slot;
  }
  return best;
}

/** 'Tomorrow ~8pm' | 'Thu ~8pm' (<7 days) | 'Jul 30' (further out). */
export function formatNextExpectedLabel(slot: StreamSlot, now: Date): string {
  const start = new Date(slot.startTime);
  const dayDiff = Math.round(
    (startOfLocalDay(start).getTime() - startOfLocalDay(now).getTime()) / DAY_MS,
  );
  const hour = `~${getHourLabel(start.getHours())}`;
  if (dayDiff <= 0) return `Today ${hour}`;
  if (dayDiff === 1) return `Tomorrow ${hour}`;
  if (dayDiff < 7) {
    return `${start.toLocaleDateString('en-US', { weekday: 'short' })} ${hour}`;
  }
  return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Earliest local day strictly after `selectedDate` that has at least one
 * upcoming, non-cancelled slot — the empty state's "Next streams: Thu →"
 * target. Upcoming slots are always in the future, so the result can never
 * be a past day even when `selectedDate` is.
 */
export function findNextDayWithStreams(
  slots: StreamSlot[],
  selectedDate: Date,
  now: Date,
): Date | null {
  const floor = startOfLocalDay(selectedDate).getTime();
  let best: Date | null = null;
  for (const slot of slots) {
    if (slot.slotKind === 'cancelled') continue;
    if (calculateStreamStatus(slot, now) !== 'upcoming') continue;
    const day = startOfLocalDay(new Date(slot.startTime));
    if (day.getTime() <= floor) continue;
    if (!best || day.getTime() < best.getTime()) best = day;
  }
  return best;
}

/**
 * Where the "now" line sits between today's sections: the number of sections
 * that are in the past or running (Live Now + hour groups at or before the
 * current hour). Section-granular on purpose — a boundary-hour group can mix
 * just-passed and imminent slots. Null when not viewing today or the day has
 * no sections (the empty state owns that case).
 */
export function nowLineIndex(
  sections: ProgramSection[],
  selectedDate: Date,
  now: Date,
): number | null {
  if (!isSameLocalDay(selectedDate, now)) return null;
  if (sections.length === 0) return null;
  const currentHour = now.getHours();
  let index = 0;
  for (const section of sections) {
    if (section.type === 'live' || (section.hour !== null && section.hour <= currentHour)) {
      index += 1;
    } else {
      break;
    }
  }
  return index;
}

export type ProgramTimeChip = 'now' | 'hour-16' | 'hour-20';

/**
 * Scroll-spy → chip mapping: which time chip represents the section currently
 * at the top of the viewport. Early hours & Live Now map to 'now' — but only
 * when viewing today ('now' has no meaning on another day). 4pm covers 16–19,
 * 8pm covers 20+.
 */
export function activeChipForSection(
  sectionId: string | null,
  sections: ProgramSection[],
  isToday: boolean,
): ProgramTimeChip | null {
  if (!sectionId) return isToday ? 'now' : null;
  const section = sections.find((s) => s.id === sectionId);
  if (!section) return isToday ? 'now' : null;
  if (section.hour !== null && section.hour >= 20) return 'hour-20';
  if (section.hour !== null && section.hour >= 16) return 'hour-16';
  return isToday ? 'now' : null;
}

/**
 * Relative start label for a Program card ("In 45 min" / "Starting now").
 * Null outside the 12h window and for slots more than a minute overdue —
 * the status line already says "was expected around …" there.
 */
export function programRelativeStartLabel(startTime: string, now: Date): string | null {
  const diffMs = new Date(startTime).getTime() - now.getTime();
  if (Number.isNaN(diffMs)) return null;
  if (diffMs > RELATIVE_START_WINDOW_MS) return null;
  if (diffMs < -MINUTE_MS) return null;
  return relativeStartLabel(startTime, now);
}

/** 'just now' | '3 min ago' | '1h 05m ago' — freshness label next to Refresh. */
export function formatUpdatedAgo(lastUpdatedMs: number, nowMs: number): string {
  const diffMins = Math.floor(Math.max(0, nowMs - lastUpdatedMs) / MINUTE_MS);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  const hours = Math.floor(diffMins / 60);
  const minutes = diffMins % 60;
  return minutes === 0
    ? `${hours}h ago`
    : `${hours}h ${String(minutes).padStart(2, '0')}m ago`;
}

export interface WatchLink {
  platform: Platform;
  url: string;
}

/**
 * External watch links for a LIVE slot, limited to the platforms the slot is
 * actually live on. YouTube deep-links via /live (lands on the running
 * stream); Twitch channel URLs are canonical logins (no encoding needed —
 * same convention as WatchButtons/DiscoverCard).
 */
export function buildWatchLinks(
  slot: StreamSlot,
  channel: { twitch_login: string | null; youtube_channel_id: string | null } | undefined,
): WatchLink[] {
  if (!channel) return [];
  const links: WatchLink[] = [];
  if (slot.platforms.includes('twitch') && channel.twitch_login) {
    links.push({ platform: 'twitch', url: `https://twitch.tv/${channel.twitch_login}` });
  }
  if (slot.platforms.includes('youtube') && channel.youtube_channel_id) {
    links.push({
      platform: 'youtube',
      url: `https://youtube.com/channel/${channel.youtube_channel_id}/live`,
    });
  }
  return links;
}
