'use client';

// M24: compact top-3 best-slot chips (game-hub preview + /best-time
// recommendation row). SSR renders the UTC frame; after hydration the slots
// shift into the viewer's timezone — same useSyncExternalStore pattern as
// StreamTimesHeatmap.

import { useSyncExternalStore } from 'react';
import type { TimingBestSlot } from '@/lib/server/partner-api';
import { localUtcOffsetHours } from '@/lib/game-heatmap';
import { formatSlotLabel, shiftSlot } from '@/lib/game-timing';
import { formatStatValue } from '@/lib/format/number';

function subscribe(): () => void {
  return () => {};
}

export function BestSlotChips({ slots }: { slots: TimingBestSlot[] }) {
  const shift = useSyncExternalStore(
    subscribe,
    () => localUtcOffsetHours(),
    () => 0,
  );
  const isLocal = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  if (slots.length === 0) return null;
  return (
    <div suppressHydrationWarning>
      <ol className="flex flex-wrap gap-2" aria-label="Best time slots">
        {slots.slice(0, 3).map((slot, i) => {
          const local = shiftSlot(slot, shift);
          return (
            <li
              key={`${slot.dow}-${slot.hour}`}
              className="flex items-baseline gap-2 rounded-full border border-border-default bg-background-elevated px-3 py-1.5 text-sm"
            >
              <span className="text-xs font-bold text-accent-cyan">#{i + 1}</span>
              <span className="font-semibold text-text-primary">
                {formatSlotLabel(local.dow, local.hour)}
              </span>
              <span className="whitespace-nowrap text-xs text-text-muted">
                {`~${formatStatValue(slot.score)} viewers/channel`}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-1.5 text-xs text-text-muted">
        {isLocal ? 'Times shown in your local timezone.' : 'Times shown in UTC.'}
      </p>
    </div>
  );
}
