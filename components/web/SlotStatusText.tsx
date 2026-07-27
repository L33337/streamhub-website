'use client';

import { useSyncExternalStore } from 'react';
import type { PublicStreamSlot } from '@/lib/server/partner-api';
import { getStatusParts } from '@/lib/format/slot-status';

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
    () => getStatusParts(slot, false, language).primary,
    () => getStatusParts(slot, true, language).primary,
  );
  // The streamer's own clock is pinned to their fixed home zone, so it is
  // identical on both sides of hydration and needs no store subscription.
  const streamerTime = getStatusParts(slot, true, language).secondary;

  const primary =
    slot.status === 'upcoming' ? (
      // Machine-readable start time for crawlers; the visible text is the
      // humanized viewer-local label from getStatusParts.
      <time dateTime={slot.start_time} suppressHydrationWarning>
        {text}
      </time>
    ) : (
      <span suppressHydrationWarning>{text}</span>
    );

  if (!streamerTime) return primary;
  return (
    <>
      {primary}
      {/* Muted on purpose: viewer time is the answer, the streamer's clock is
          context. Two visually equal times read as two competing answers. */}
      <span className="text-text-muted"> · {streamerTime}</span>
    </>
  );
}
