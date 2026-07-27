'use client';

import { useSyncExternalStore } from 'react';
import type { PublicStreamSlot } from '@/lib/server/partner-api';
import { localNextLabel, localizedNextLabel } from '@/lib/format/time';
import { slotLexFor } from '@/lib/i18n-slot';
import { SlotIcsButton } from './SlotIcsButton';
import { WatchButtons } from './WatchButtons';

function subscribe(): () => void {
  return () => {};
}

interface Props {
  /** Non-null while the streamer is on air. */
  liveSlot: PublicStreamSlot | null;
  /** Earliest real upcoming slot that has a rendered day section, else null. */
  nextSlot: PublicStreamSlot | null;
  twitchLogin: string | null;
  youtubeChannelId: string | null;
  language?: string;
}

/**
 * The one answer a visitor arriving from "<streamer> stream schedule" came for,
 * placed above the fold.
 *
 * Everything needed for it was already on the page — but spread across the day
 * sections below, so the first screen answered "who is this" instead of "when".
 * Live streamers get the watch action promoted from a small platform badge to a
 * real button; offline ones get the next start in their own timezone plus a
 * calendar export, which is the natural conversion moment.
 *
 * Times follow the SSR/hydration split used everywhere else on this page: the
 * server renders the deterministic UTC form, the browser swaps in viewer-local.
 */
export function HeroNextStream({
  liveSlot,
  nextSlot,
  twitchLogin,
  youtubeChannelId,
  language = 'en',
}: Props) {
  const L = slotLexFor(language);
  const target = nextSlot?.start_time ?? '';
  const label = useSyncExternalStore(
    subscribe,
    () => (target ? localNextLabel(target, language) : ''),
    () => (target ? localizedNextLabel(target, language) : ''),
  );

  if (liveSlot) {
    return (
      <WatchButtons
        twitchLogin={twitchLogin}
        youtubeChannelId={youtubeChannelId}
        grow={false}
        language={language}
        className="mt-3 flex flex-col gap-2 sm:flex-row sm:gap-3"
      />
    );
  }

  if (!nextSlot) return null;

  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl border border-accent-cyan/30 bg-accent-cyan/5 px-3 py-2.5">
      {/* Anchor, not a router link: the target day section is on this page.
          The next stream is by definition the first slot, so it is never one of
          the collapsed ones — and CollapsibleSchedule expands anyway if it is. */}
      <a
        href={`#day-${nextSlot.start_time.slice(0, 10)}`}
        className="group min-w-0 flex-1"
      >
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-xs text-text-muted">{L.nextStreamPrefix}</span>
          <time
            dateTime={nextSlot.start_time}
            suppressHydrationWarning
            className="text-base font-bold text-accent-cyan"
          >
            {nextSlot.is_predicted ? `~ ${label}` : label}
          </time>
          <span
            aria-hidden="true"
            className="text-accent-cyan transition-transform group-hover:translate-x-0.5"
          >
            →
          </span>
        </span>
        {nextSlot.category && (
          <span className="mt-0.5 block truncate text-xs text-text-secondary">
            {nextSlot.category}
          </span>
        )}
      </a>
      {/* Sibling of the link, never nested inside it. */}
      <SlotIcsButton
        slot={{
          id: nextSlot.id,
          streamerName: nextSlot.streamer_name,
          streamTitle: nextSlot.title,
          startTime: nextSlot.start_time,
          duration: nextSlot.duration_minutes,
          // The feed's slot type models "no category" as undefined, the partner
          // API DTO as null.
          category: nextSlot.category ?? undefined,
        }}
        className="h-8 w-8"
      />
    </div>
  );
}
