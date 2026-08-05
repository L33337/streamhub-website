'use client';

// The two timezone-dependent scraps of /tonight that live OUTSIDE the block
// listing: the "all times …" note under the dateline, and the clock reading on
// a prime-time highlight card.
//
// Both follow the same contract as TonightBlocks: the SERVER renders the
// locale's reference zone (deterministic — one prerendered page serves every
// timezone), and after hydration the viewer's own zone takes over. Unlike
// components/web/LocalTime.tsx, the server snapshot here is the REFERENCE ZONE,
// not UTC, so a card's time always agrees with the block heading above it.

import { useSyncExternalStore } from 'react';
import { formatClockReading } from '@/lib/tonight/logic';

function subscribe(): () => void {
  // Intl does not notify on timezone changes, and the page is not long-lived
  // enough for a DST flip to matter here — read once at hydration.
  return () => {};
}

/**
 * The viewer's UTC offset in minutes at `atMs`, or the reference offset before
 * hydration. Comparing the two is what tells us whether anything needs to
 * change at all — for every German visitor on /de it does not, and the server's
 * markup stands.
 */
function useIsShifted(atMs: number, referenceOffsetMinutes: number): boolean {
  const offset = useSyncExternalStore(
    subscribe,
    () => -new Date(atMs).getTimezoneOffset(),
    () => referenceOffsetMinutes,
  );
  return offset !== referenceOffsetMinutes;
}

/**
 * "All times CEST" until we know better, "All times in your timezone" once the
 * viewer turns out to be somewhere else. Without this line a reader has no way
 * to tell which of the two frames the page is showing — and they are hours
 * apart for most of the world.
 */
export function TonightTimesNote({
  zoneNote,
  localNote,
  atMs,
  referenceOffsetMinutes,
}: {
  zoneNote: string;
  localNote: string;
  atMs: number;
  referenceOffsetMinutes: number;
}) {
  const shifted = useIsShifted(atMs, referenceOffsetMinutes);
  return <span suppressHydrationWarning>{shifted ? localNote : zoneNote}</span>;
}

/**
 * A start time on a highlight card. `ssr` is the reference-zone reading the
 * server already produced, kept verbatim for matching viewers so the common
 * case renders no swap.
 */
export function TonightClock({
  startIso,
  ssr,
  locale,
  referenceOffsetMinutes,
}: {
  startIso: string;
  ssr: string;
  locale: string;
  referenceOffsetMinutes: number;
}) {
  const startMs = Date.parse(startIso);
  const parsed = Number.isFinite(startMs);
  // Epoch rather than `Date.now()` for the unparseable case: the hook must be
  // called unconditionally, its answer is unused in that branch, and reading a
  // clock during render is impure (react-hooks/purity).
  const shifted = useIsShifted(parsed ? startMs : 0, referenceOffsetMinutes);
  const label = shifted && parsed ? formatClockReading(startMs, locale) || ssr : ssr;
  return (
    <time dateTime={startIso} suppressHydrationWarning>
      {label}
    </time>
  );
}
