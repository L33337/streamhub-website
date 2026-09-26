'use client';

// Per-slot "Add to calendar" button (game-hub UX round 2026-07-23). Same
// .ics builder as the feed/Program exports (lib/feed/ics.ts — shared UIDs, so
// re-imports update instead of duplicating). Rendered as a SIBLING of the
// SlotCard link, never inside it (no nested interactive elements).

import { CalendarPlus } from 'lucide-react';
import { downloadSlotIcs, type IcsSlot } from '@/lib/feed/ics';

//
// Game-hub UX round (2026-09-24): the visible disc stays 24px, but a ::before
// extends the hit area to 44px (the site's tap-target floor) without moving
// anything in the layout. Labels come in as props — this is a client component
// and the hub lexicon is server-only; the English defaults keep any
// label-less caller unchanged.
export function SlotIcsButton({
  slot,
  className = '',
  ariaLabel,
  title = 'Add to calendar (.ics)',
}: {
  slot: IcsSlot;
  className?: string;
  ariaLabel?: string;
  title?: string;
}) {
  // The ::before needs a positioned button. An overlay caller already passes
  // `absolute`; adding `relative` too would leave the winner to stylesheet order.
  const position = /\b(absolute|fixed)\b/.test(className) ? '' : 'relative';
  return (
    <button
      type="button"
      onClick={() => downloadSlotIcs(slot)}
      aria-label={ariaLabel ?? `Add ${slot.streamerName}'s stream to your calendar`}
      title={title}
      className={`${position} flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border-default bg-background-elevated/90 text-text-muted transition-colors before:absolute before:-inset-2.5 before:content-[''] hover:border-accent-cyan/60 hover:text-accent-cyan ${className}`}
    >
      <CalendarPlus size={12} />
    </button>
  );
}
