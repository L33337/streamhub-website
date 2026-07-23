'use client';

// Program-page slot row — wraps the shared SlotCard with the app's slot-kind
// rendering (StreamHub StreamCard.tsx): CANCELLED greys the card out and
// replaces the status line, NEW/UNCERTAIN render as extra badges (UNCERTAIN
// suppressed when cancelled). Rendered client-side only (local-time labels).
//
// UX round 2026-07-23: a compact meta row under the card (feed UpNextMeta
// pattern) — live slots get external watch links (SIBLINGS of the card link,
// never nested anchors), upcoming slots get a relative start label (≤12h,
// pulsing when imminent) + a per-slot .ics export. Cancelled slots get none.

import { CalendarPlus } from 'lucide-react';
import { SlotCard } from '@/components/web/SlotCard';
import { CancelledBadge, NewBadge, UncertainBadge } from '@/components/web/Badges';
import { downloadSlotIcs } from '@/lib/feed/ics';
import {
  buildWatchLinks,
  programRelativeStartLabel,
  toProgramPublicSlot,
} from '@/lib/program/logic';
import type { StreamSlot } from '@/lib/feed/types';
import type { FavoriteStreamerRow } from '@/lib/supabase/favorites';

const IMMINENT_MS = 60 * 60 * 1000;

function WatchPill({ platform, url }: { platform: string; url: string }) {
  const isTwitch = platform === 'twitch';
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center rounded px-2.5 py-1 text-[11px] font-bold tracking-wide text-white transition-colors ${
        isTwitch ? 'bg-twitch hover:bg-[#A266FF]' : 'bg-youtube hover:bg-[#FF3355]'
      }`}
    >
      Watch on {isTwitch ? 'Twitch' : 'YouTube'}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export function ProgramSlotCard({
  slot,
  now,
  channel,
}: {
  slot: StreamSlot;
  now: Date;
  /** Favorite row with twitch_login/youtube_channel_id — drives watch links. */
  channel?: FavoriteStreamerRow;
}) {
  const isCancelled = slot.slotKind === 'cancelled';
  const isNew = slot.slotKind === 'new';
  const showUncertain = slot.isUncertain && !isCancelled;
  const hasBadges = isCancelled || isNew || showUncertain;

  const watchLinks = slot.status === 'live' ? buildWatchLinks(slot, channel) : [];
  const relLabel =
    slot.status === 'upcoming' && !isCancelled
      ? programRelativeStartLabel(slot.startTime, now)
      : null;
  const isImminent =
    relLabel !== null && new Date(slot.startTime).getTime() - now.getTime() <= IMMINENT_MS;
  const showIcs = slot.status === 'upcoming' && !isCancelled;
  const hasMetaRow = watchLinks.length > 0 || relLabel !== null || showIcs;

  // slot_kind travels through toProgramPublicSlot, so SlotCard derives the
  // cancelled styling and SlotStatusText the localized "No stream expected
  // (usually around …)" line — no overrides needed here.
  return (
    <div>
      <SlotCard
        slot={toProgramPublicSlot(slot, now)}
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
      {hasMetaRow && (
        <div className="mt-1 flex items-center justify-between gap-3 px-1">
          <span
            className={`flex items-center gap-1.5 text-xs font-semibold ${
              isImminent ? 'text-accent-cyan' : 'text-text-muted'
            }`}
          >
            {isImminent && (
              <span
                aria-hidden="true"
                className="inline-block h-1.5 w-1.5 rounded-full bg-accent-cyan motion-safe:animate-pulse"
              />
            )}
            {relLabel ?? ''}
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            {watchLinks.map((link) => (
              <WatchPill key={link.platform} platform={link.platform} url={link.url} />
            ))}
            {showIcs && (
              <button
                type="button"
                onClick={() => downloadSlotIcs(slot)}
                aria-label={`Add ${slot.streamerName}'s stream to your calendar`}
                title="Add to calendar (.ics)"
                className="flex h-6 w-6 items-center justify-center rounded-full border border-border-default text-text-muted transition-colors hover:border-accent-cyan/60 hover:text-accent-cyan"
              >
                <CalendarPlus size={12} />
              </button>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
