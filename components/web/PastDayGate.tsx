'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { isPastUtcDay, utcTodayKey } from '@/lib/format/time';

function subscribeToNothing(): () => void {
  return () => {};
}

/**
 * Hides a day section once its UTC day is over (streamer-page UX round,
 * 2026-09-26). The streamer and game pages are ISR snapshots; one served a
 * day after it was rendered started with "Wed, Sep 23 — No streams expected"
 * above "Today". The server snapshot always renders the children, so the HTML
 * stays deterministic; the browser drops the day after hydration, together
 * with its pill in <DayNavBar>.
 */
export function PastDayGate({
  dateKey,
  todayUtc,
  children,
}: {
  dateKey: string;
  /** The server's UTC date — the snapshot the page was rendered for. */
  todayUtc: string;
  children: ReactNode;
}) {
  const clientTodayUtc = useSyncExternalStore(subscribeToNothing, utcTodayKey, () => todayUtc);
  if (isPastUtcDay(dateKey, clientTodayUtc)) return null;
  return <>{children}</>;
}
