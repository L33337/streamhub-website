'use client';

import { useSyncExternalStore } from 'react';
import { localizedNextLabel } from '@/lib/format/time';
import { nextStreamLabel } from '@/lib/next-stream';

function subscribe(): () => void {
  return () => {};
}

/**
 * Compact "Next stream" timestamp for the /rankings tables. Server snapshot
 * renders the deterministic UTC form ("Today 20:00 UTC"); the client swaps in
 * the browser-local form ("Today 8:00 PM") after hydration — same
 * useSyncExternalStore pattern as SlotStatusText. Predicted (AI) times carry
 * a "~" prefix and an explanatory title.
 */
export function NextStreamTime({
  startTime,
  isPredicted,
}: {
  startTime: string;
  isPredicted: boolean;
}) {
  const text = useSyncExternalStore(
    subscribe,
    () => nextStreamLabel(startTime),
    () => localizedNextLabel(startTime),
  );
  return (
    <time
      dateTime={startTime}
      suppressHydrationWarning
      title={isPredicted ? 'AI-predicted start time' : 'Announced schedule start'}
    >
      {isPredicted ? `~ ${text}` : text}
    </time>
  );
}
