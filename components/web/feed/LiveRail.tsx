'use client';

import type { HomeLiveEntry } from '@/lib/feed/types';
import { toPublicStreamSlot } from '@/lib/feed/transforms';
import { SlotCard } from '@/components/web/SlotCard';

/**
 * Horizontal Live Now rail (M16): favorites' live slots first, then live
 * FEATURED suggestions. Reuses SlotCard via the PublicStreamSlot adapter —
 * clicking navigates to /schedule/{id} (existing modal route); the wrapper
 * click-capture logs the tap first.
 */
export function LiveRail({
  entries,
  onSlotTap,
}: {
  entries: HomeLiveEntry[];
  onSlotTap: (entry: HomeLiveEntry) => void;
}) {
  // Overflow scrolling lives in the RailScroller wrapper (FeedClient) since
  // the 2026-07-22 UX round — this list only lays the cards out.
  return (
    <ul className="flex gap-3 pb-2" aria-label="Live now">
      {entries.map((entry) => (
        <li
          key={`live-${entry.slot.id}`}
          className="relative w-[320px] shrink-0 sm:w-[380px]"
          onClickCapture={() => onSlotTap(entry)}
        >
          <SlotCard slot={toPublicStreamSlot(entry.slot)} />
          {entry.isFeaturedSuggestion && (
            <span className="absolute right-2 top-2 rounded bg-accent-purple px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white">
              FEATURED
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
