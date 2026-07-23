'use client';

// Per-slot "Add to calendar" button (game-hub UX round 2026-07-23). Same
// .ics builder as the feed/Program exports (lib/feed/ics.ts — shared UIDs, so
// re-imports update instead of duplicating). Rendered as a SIBLING of the
// SlotCard link, never inside it (no nested interactive elements).

import { CalendarPlus } from 'lucide-react';
import { downloadSlotIcs, type IcsSlot } from '@/lib/feed/ics';

export function SlotIcsButton({
  slot,
  className = '',
}: {
  slot: IcsSlot;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => downloadSlotIcs(slot)}
      aria-label={`Add ${slot.streamerName}'s stream to your calendar`}
      title="Add to calendar (.ics)"
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border-default bg-background-elevated/90 text-text-muted transition-colors hover:border-accent-cyan/60 hover:text-accent-cyan ${className}`}
    >
      <CalendarPlus size={12} />
    </button>
  );
}
