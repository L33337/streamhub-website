'use client';

import { useSyncExternalStore } from 'react';
import { localNextLabel, localizedNextLabel } from '@/lib/format/time';
import { slotLexFor } from '@/lib/i18n-slot';

function subscribe(): () => void {
  // Locale/timezone are read once at hydration; Intl does not notify on change.
  return () => {};
}

/**
 * Forward pointer on a day with nothing scheduled: "Next stream: Fri 8:00 PM →",
 * linking to the day section that actually has it.
 *
 * Exists because "No streams expected" as the first line under the schedule
 * heading is a dead end for exactly the visitor this page is built for — someone
 * who searched "<streamer> stream schedule" and landed on a quiet day.
 *
 * Server snapshot renders the deterministic UTC form; the browser swaps in
 * viewer-local time after hydration (same pattern as SlotStatusText).
 */
export function NextStreamHint({
  startTime,
  targetDateKey,
  isPredicted,
  language = 'en',
}: {
  startTime: string;
  /** UTC yyyy-mm-dd of the day section to jump to. */
  targetDateKey: string;
  isPredicted: boolean;
  language?: string;
}) {
  const label = useSyncExternalStore(
    subscribe,
    () => localNextLabel(startTime, language),
    () => localizedNextLabel(startTime, language),
  );
  const L = slotLexFor(language);

  return (
    <a
      href={`#day-${targetDateKey}`}
      className="inline-flex items-center gap-1 text-sm text-accent-cyan transition-colors hover:text-accent-cyan/80"
    >
      <span className="text-text-muted">{L.nextStreamPrefix}</span>
      <time dateTime={startTime} suppressHydrationWarning>
        {isPredicted ? `~ ${label}` : label}
      </time>
      <span aria-hidden="true">→</span>
    </a>
  );
}
