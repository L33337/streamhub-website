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
  sortSlotsByStartTime,
} from '@/lib/feed/logic';
import { toPublicStreamSlot } from '@/lib/feed/transforms';
import type { PublicStreamSlot } from '@/lib/server/partner-api';
import type { StreamSlot } from '@/lib/feed/types';
import type { FavoriteStreamerRow } from '@/lib/supabase/favorites';
import type { ProgramDay, ProgramSection } from './types';

const MINUTE_MS = 60 * 1000;
const MISSED_WINDOW_MS = 6 * 60 * 60 * 1000;
// Two missed 10-min enrichment sweeps + margin (app streamUtils.ts).
const VIEWER_STALE_MS = 25 * MINUTE_MS;

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
