'use client';

import { useSyncExternalStore } from 'react';
import type { PublicStreamSlot } from '@/lib/server/partner-api';
import { getStatusText } from '@/lib/format/slot-status';

function subscribe(): () => void {
  return () => {};
}

// `language` localizes the status phrasing on the streamer page; the default
// 'en' keeps every existing caller byte-identical.
export function SlotStatusText({
  slot,
  language = 'en',
}: {
  slot: PublicStreamSlot;
  language?: string;
}) {
  const text = useSyncExternalStore(
    subscribe,
    () => getStatusText(slot, false, language),
    () => getStatusText(slot, true, language),
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
