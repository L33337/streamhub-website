'use client';

import { useSyncExternalStore } from 'react';
import { isPastUtcDay, utcTodayKey } from '@/lib/format/time';
import { DayLabel } from './DayLabel';

function subscribe(): () => void {
  return () => {};
}

/**
 * The "Sun, Mon, Tue" heading of a folded run of empty days (EmptyDayRow).
 * Drops days whose UTC date is over once hydrated, like DayNavBar and
 * PastDayGate — a stale snapshot must not open the run with "Yesterday". The
 * server snapshot renders every day.
 */
export function EmptyDayList({
  days,
  todayUtc,
  language,
}: {
  days: { dateKey: string; shortLabel: string }[];
  todayUtc: string;
  language: string;
}) {
  const clientTodayUtc = useSyncExternalStore(subscribe, utcTodayKey, () => todayUtc);
  const visible = days.filter((d) => !isPastUtcDay(d.dateKey, clientTodayUtc));
  return (
    <span>
      {visible.map((d, i) => (
        <span key={d.dateKey}>
          {i > 0 ? ', ' : null}
          <DayLabel dateKey={d.dateKey} serverLabel={d.shortLabel} language={language} short />
        </span>
      ))}
    </span>
  );
}
