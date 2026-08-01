'use client';

// Timezone-dependent halves of three "Quick facts" cards (section expansion
// 2026-08-01). SSR renders the UTC frame; after hydration the value shifts
// into the viewer's timezone — the useSyncExternalStore pattern of
// StreamTimesHeatmap/BestSlotChips.
//
// Formatting never happens here: the server ships the whole label table
// (weekdayLabels/hourLabels, already in the page's locale) and these
// components only index into it. That keeps Intl locale data off the client
// and makes a server/client disagreement impossible by construction.

import { useSyncExternalStore } from 'react';
import { localUtcOffsetHours } from '@/lib/game-heatmap';
import { shiftSlot } from '@/lib/game-timing';
import { busiestWeekday, peakStartHour } from '@/lib/home/quick-facts';
import type { TimingBestSlot } from '@/lib/server/partner-api';

function subscribe(): () => void {
  return () => {};
}

/** Whole-hour UTC offset of the browser; 0 on the server. */
function useShiftHours(): number {
  return useSyncExternalStore(
    subscribe,
    () => localUtcOffsetHours(),
    () => 0,
  );
}

/** True once hydrated — even at UTC±0, where "local" happens to also be UTC. */
function useIsLocal(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

export function LocalPrimeTime({
  cells,
  hourLabels,
}: {
  cells: number[];
  hourLabels: string[];
}) {
  const peak = peakStartHour(cells, useShiftHours());
  return (
    <span suppressHydrationWarning>{peak ? hourLabels[peak.hour] : '—'}</span>
  );
}

export function LocalBusiestDay({
  cells,
  dayLabels,
}: {
  cells: number[];
  dayLabels: string[];
}) {
  const day = busiestWeekday(cells, useShiftHours());
  return <span suppressHydrationWarning>{day ? dayLabels[day.dow] : '—'}</span>;
}

export function LocalBestSlot({
  slot,
  label,
  dayLabels,
  hourLabels,
  localNote,
  utcNote,
}: {
  slot: TimingBestSlot;
  /** Localized "Best time" — the value after it is two data tokens. */
  label: string;
  dayLabels: string[];
  hourLabels: string[];
  /** Which frame the reading is in. Without it "Friday 11 PM" is unreadable:
   *  SSR shows UTC and the client shows local, three hours apart for some. */
  localNote: string;
  utcNote: string;
}) {
  const shifted = shiftSlot(slot, useShiftHours());
  const frame = useIsLocal() ? localNote : utcNote;
  return (
    <span suppressHydrationWarning>
      {`${label}: ${dayLabels[shifted.dow]} ${hourLabels[shifted.hour]} (${frame})`}
    </span>
  );
}

/** "your local time" / "UTC" — flips with the same store as the value above. */
export function LocalTimeNote({ local, utc }: { local: string; utc: string }) {
  const isLocal = useIsLocal();
  return <span suppressHydrationWarning>{isLocal ? local : utc}</span>;
}
