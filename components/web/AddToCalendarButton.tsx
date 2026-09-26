'use client';

// Labelled "Add to calendar" button for the slot detail page (streamer-page UX
// round, 2026-09-26). Same .ics builder and UIDs as SlotIcsButton and the
// feed/Program exports (lib/feed/ics.ts), so a re-import updates the event.

import { CalendarPlus } from 'lucide-react';
import { downloadSlotIcs, type IcsSlot } from '@/lib/feed/ics';

export function AddToCalendarButton({ slot, label }: { slot: IcsSlot; label: string }) {
  return (
    <button
      type="button"
      onClick={() => downloadSlotIcs(slot)}
      className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border-default bg-background-elevated px-4 text-sm font-semibold text-text-primary transition-colors hover:border-accent-cyan/60 hover:text-accent-cyan"
    >
      <CalendarPlus size={16} aria-hidden="true" />
      {label}
    </button>
  );
}
