// Program-page slot row — wraps the shared SlotCard with the app's slot-kind
// rendering (StreamHub StreamCard.tsx): CANCELLED greys the card out and
// replaces the status line, NEW/UNCERTAIN render as extra badges (UNCERTAIN
// suppressed when cancelled). Rendered client-side only (local-time labels).

import { SlotCard } from '@/components/web/SlotCard';
import { CancelledBadge, NewBadge, UncertainBadge } from '@/components/web/Badges';
import { getHourLabel, toProgramPublicSlot } from '@/lib/program/logic';
import type { StreamSlot } from '@/lib/feed/types';

export function ProgramSlotCard({ slot, now }: { slot: StreamSlot; now: Date }) {
  const isCancelled = slot.slotKind === 'cancelled';
  const isNew = slot.slotKind === 'new';
  const showUncertain = slot.isUncertain && !isCancelled;
  const hasBadges = isCancelled || isNew || showUncertain;
  const localHour = new Date(slot.startTime).getHours();

  return (
    <SlotCard
      slot={toProgramPublicSlot(slot, now)}
      appearance={isCancelled ? 'cancelled' : 'default'}
      statusOverride={
        isCancelled
          ? `No stream expected (usually around ${getHourLabel(localHour)})`
          : undefined
      }
      topBadges={
        hasBadges ? (
          <span className="flex shrink-0 items-center gap-1">
            {isCancelled && <CancelledBadge />}
            {isNew && <NewBadge />}
            {showUncertain && <UncertainBadge />}
          </span>
        ) : undefined
      }
    />
  );
}
