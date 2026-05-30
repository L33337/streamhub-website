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
  return <span suppressHydrationWarning>{text}</span>;
}
