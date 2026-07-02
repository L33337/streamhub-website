'use client';

import { useSyncExternalStore } from 'react';
import type { PublicStreamSlot } from '@/lib/server/partner-api';
import { getStatusText } from '@/lib/format/slot-status';

function subscribe(): () => void {
  return () => {};
}

export function SlotStatusText({ slot }: { slot: PublicStreamSlot }) {
  const text = useSyncExternalStore(
    subscribe,
    () => getStatusText(slot, false),
    () => getStatusText(slot, true),
  );
  if (slot.status === 'upcoming') {
    // Machine-readable start time for crawlers; the visible text is the
    // humanized dual-timezone label from getStatusText.
    return (
      <time dateTime={slot.start_time} suppressHydrationWarning>
        {text}
      </time>
    );
  }
  return <span suppressHydrationWarning>{text}</span>;
}
