'use client';

import { useSyncExternalStore } from 'react';
import { localizedNextLabel } from '@/lib/format/time';
import { nextStreamLabel } from '@/lib/next-stream';
import { slotLexFor } from '@/lib/i18n-slot';

function subscribe(): () => void {
  return () => {};
}

/**
 * Compact "Next stream" timestamp for the /rankings tables. Server snapshot
 * renders the deterministic UTC form ("Today 20:00 UTC"); the client swaps in
 * the browser-local form ("Today 8:00 PM") after hydration — same
 * useSyncExternalStore pattern as SlotStatusText. Predicted (AI) times carry
 * a "~" prefix and an explanatory title.
 *
 * `language` (M22 P4) localizes the Today/Tomorrow/weekday words and the
 * title attributes; the default 'en' keeps every existing caller
 * byte-identical (nextStreamLabel is the original English client path).
 */
export function NextStreamTime({
  startTime,
  isPredicted,
  language = 'en',
}: {
  startTime: string;
  isPredicted: boolean;
  language?: string;
}) {
  const text = useSyncExternalStore(
    subscribe,
    () =>
      language === 'en'
        ? nextStreamLabel(startTime)
        : localizedNextLabel(startTime, language, {
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }),
    () => localizedNextLabel(startTime, language),
  );
  const L = slotLexFor(language);
  return (
    <time
      dateTime={startTime}
      suppressHydrationWarning
      title={isPredicted ? L.nextTimePredictedTitle : L.nextTimeAnnouncedTitle}
    >
      {isPredicted ? `~ ${text}` : text}
    </time>
  );
}
