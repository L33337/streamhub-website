'use client';

import { useSyncExternalStore } from 'react';
import { formatUtcTime } from '@/lib/format/time';

function subscribe(): () => void {
  // The user's locale is read once at hydration; Intl does not notify on
  // changes, so the subscribe function is a no-op.
  return () => {};
}

function getClientSnapshot(utcIso: string): string {
  try {
    return new Date(utcIso).toLocaleString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  } catch {
    return formatUtcTime(utcIso);
  }
}

export function LocalTime({ utcIso }: { utcIso: string }) {
  const local = useSyncExternalStore(
    subscribe,
    () => getClientSnapshot(utcIso),
    () => formatUtcTime(utcIso),
  );
  return (
    <time dateTime={utcIso} suppressHydrationWarning>
      {local}
    </time>
  );
}
