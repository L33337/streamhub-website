// Per-day stream counts for the sticky day navigation (streamer page + game
// hub). Deliberately NOT inside components/web/DayNavBar.tsx: that file is
// 'use client', and a function exported from a client module cannot be called
// from a server component ("Attempted to call toDayCounts() from the server
// but toDayCounts is on the client") — it can only be rendered or passed as a
// prop. Both callers are server components, so the reducer lives here.

import type { PublicStreamSlot } from '@/lib/server/partner-api';

/** Per-day counts the nav renders. `total` drives linkability, `active` the label. */
export interface DayCount {
  /** Entries in the day section at all — a cancellation-only day is still linkable. */
  total: number;
  /** Streams actually expected: cancellations excluded, so quiet days read quiet. */
  active: number;
}

/**
 * Reduce a day-grouped slot map to the two numbers the nav needs.
 *
 * DayNavBar is a client component, so ANY prop it receives is serialized into
 * the RSC flight payload verbatim. Passing the grouped map shipped every field
 * of every slot (title, reasoning, thumbnail_url, …) into the HTML a second
 * time, on top of the markup the schedule already renders — 155 KB of the
 * 1,195 KB /game/fortnite document, which Bing flagged as "Html size is too
 * long" (1 MB soft limit) on 2026-08-01. Counts cost ~30 bytes per day.
 */
export function toDayCounts(
  days: string[],
  grouped: Map<string, PublicStreamSlot[]>,
): Record<string, DayCount> {
  const counts: Record<string, DayCount> = {};
  for (const day of days) {
    const slots = grouped.get(day) ?? [];
    counts[day] = {
      total: slots.length,
      active: slots.filter((s) => s.slot_kind !== 'cancelled').length,
    };
  }
  return counts;
}
