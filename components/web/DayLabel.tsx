'use client';

import { useSyncExternalStore } from 'react';
import { resolveUiLang } from '@/lib/i18n-core';
import { localDateKey, utcDateLabel, utcDateShortLabel } from '@/lib/format/time';

/**
 * "Today" / "Tomorrow" / "Thu, Jul 30" for a UTC day key, decided against the
 * VIEWER's calendar date rather than the server's.
 *
 * Why this exists: the schedule is grouped into UTC days, and the day headings
 * used to call the day "today" when it matched the server's UTC date. Between
 * local midnight and UTC midnight those disagree — at 00:13 in Berlin the page
 * labelled a section "Tomorrow" while the slot rows inside it said "Thu, Jul 30
 * · around 7pm your time" and the reader's own phone said Thu, Jul 30. One page,
 * two calendars.
 *
 * `serverLabel` is the UTC-referenced string the server already computed: it is
 * the SSR snapshot, so prerendered HTML stays deterministic and cacheable, and
 * hydration swaps in the viewer-referenced wording without a mismatch warning
 * (same pattern as LocalTime / SlotStatusText).
 */
export function DayLabel({
  dateKey,
  serverLabel,
  language = 'en',
  short = false,
}: {
  /** UTC day key, `YYYY-MM-DD`. */
  dateKey: string;
  /** UTC-referenced label rendered on the server and during hydration. */
  serverLabel: string;
  language?: string;
  /** Weekday only ("Thu") instead of weekday + date — for the narrow day pills. */
  short?: boolean;
}) {
  const lang = resolveUiLang(language);
  const label = useSyncExternalStore(
    subscribe,
    () =>
      short
        ? utcDateShortLabel(dateKey, localDateKey(), lang)
        : utcDateLabel(dateKey, localDateKey(), lang),
    () => serverLabel,
  );
  return <span suppressHydrationWarning>{label}</span>;
}

function subscribe(): () => void {
  // The viewer's timezone is read once at hydration; Intl does not notify on
  // changes. A date rollover mid-session is not worth a ticking clock here —
  // the surrounding schedule data is ISR-cached anyway.
  return () => {};
}
