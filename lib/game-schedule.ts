// Pure helpers for the game hub's schedule section (game-hub UX round
// 2026-07-23). Kept out of the page component so they stay unit-testable
// (lib/__tests__/game-schedule.test.ts).

import type { PublicStreamSlot } from '@/lib/server/partner-api';
import type { IcsSlot } from '@/lib/feed/ics';

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
