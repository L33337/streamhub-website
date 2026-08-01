import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { PublicStreamSlot } from '@/lib/server/partner-api';
import {
  isIcsExportable,
  publicSlotToIcsSlot,
  splitCollapsibleSlots,
} from '@/lib/game-schedule';
import { sizedAvatarUrl } from '@/lib/format/image-size';
import { resolveUiLang } from '@/lib/i18n-core';
import { utcDateAbsoluteLabel } from '@/lib/format/time';
import { DayLabel } from '@/components/web/DayLabel';
import { InitialsAvatar } from '@/components/web/InitialsAvatar';
import { NextStreamTime } from '@/components/web/NextStreamTime';
import { PlatformBadge } from '@/components/web/Badges';
import { SlotCard } from '@/components/web/SlotCard';
import { SlotIcsButton } from '@/components/web/SlotIcsButton';

// Game-hub variant of DaySection (UX round 2026-07-23): high/medium slots keep
// the full SlotCard (plus a per-slot .ics button overlaid as a DOM sibling of
// the card link), low-confidence predictions collapse into compact rows behind
// a <details> expander — crawlable but closed by default, so a 60-slot week
// stops being a wall of identical cards. The data-slot/data-conf/data-pf
// attributes are the contract with ScheduleFilters (client) which toggles the
// `hidden` attribute; keep them in sync.

function CompactSlotRow({ slot }: { slot: PublicStreamSlot }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border-default/60 bg-background-elevated/60 py-1.5 pl-2.5 pr-1.5">
      <Link
        href={`/schedule/${encodeURIComponent(slot.id)}`}
        prefetch={false}
        className="group flex min-w-0 flex-1 items-center gap-2.5"
        aria-label={`${slot.streamer_name}: ${slot.title}`}
      >
        {slot.avatar_url ? (
          <Image
            src={sizedAvatarUrl(slot.avatar_url, 24)}
            alt={slot.streamer_name}
            width={24}
            height={24}
            unoptimized
            className="shrink-0 rounded-full border border-border-default"
          />
        ) : (
          <InitialsAvatar name={slot.streamer_name} size={24} className="shrink-0" />
        )}
        <span className="shrink-0 text-xs tabular-nums text-text-secondary">
          <NextStreamTime startTime={slot.start_time} isPredicted={slot.is_predicted} />
        </span>
        {/* min-w-0 so this is the element that gives up width — without it the
            flex row grew past the card instead of shortening the name. */}
        <span className="min-w-0 truncate text-xs font-semibold text-text-primary group-hover:text-accent-cyan">
          {slot.streamer_name}
        </span>
        <span className="hidden min-w-0 flex-1 truncate text-xs text-text-muted sm:inline">
          {slot.title}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-1">
          {slot.platforms.map((p) => (
            <PlatformBadge key={p} platform={p} size="sm" />
          ))}
        </span>
      </Link>
      {isIcsExportable(slot) && <SlotIcsButton slot={publicSlotToIcsSlot(slot)} />}
    </div>
  );
}

export function GameDaySection({
  dateKey,
  label,
  slots,
  hiddenCount = 0,
  language = 'en',
}: {
  dateKey: string;
  /** UTC-referenced day label; DayLabel re-decides Today/Tomorrow per viewer. */
  label: string;
  slots: PublicStreamSlot[];
  /**
   * Slots this day has but the page does not render (page-weight cap — see
   * `capDaySlots`). Counted in the heading so the day never under-reports
   * itself, and surfaced as a line of copy so the omission is visible rather
   * than silent.
   */
  hiddenCount?: number;
  language?: string;
}) {
  const { full, low } = splitCollapsibleSlots(slots);
  const totalCount = slots.length + hiddenCount;
  const absoluteLabel = utcDateAbsoluteLabel(dateKey, resolveUiLang(language));
  return (
    <section
      id={`day-${dateKey}`}
      data-day
      aria-labelledby={`heading-${dateKey}`}
      className="mt-10 scroll-mt-[calc(var(--header-height)+5rem)]"
    >
      <h2
        id={`heading-${dateKey}`}
        className="mb-4 flex items-baseline gap-3 text-2xl font-bold text-white"
      >
        <DayLabel dateKey={dateKey} serverLabel={label} language={language} />
        <span className="text-sm font-normal text-text-muted">
          {totalCount} stream{totalCount === 1 ? '' : 's'}
        </span>
      </h2>
      {full.length > 0 && (
        <ul className="grid gap-3" aria-label={`Streams on ${absoluteLabel}`}>
          {full.map((slot) => (
            <li
              key={slot.id}
              data-slot
              data-conf={slot.confidence}
              data-pf={slot.platforms.join(' ')}
            >
              <div className="relative">
                <SlotCard slot={slot} />
                {isIcsExportable(slot) && (
                  <SlotIcsButton
                    slot={publicSlotToIcsSlot(slot)}
                    className="absolute right-2 top-2"
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {low.length > 0 && (
        <details data-low-bucket className="group mt-3">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg border border-border-default/60 bg-background-elevated/40 px-3 py-2 text-sm text-text-muted transition-colors hover:border-accent-cyan/60 hover:text-accent-cyan [&::-webkit-details-marker]:hidden">
            <ChevronRight
              size={14}
              aria-hidden="true"
              className="shrink-0 transition-transform group-open:rotate-90"
            />
            {low.length} more prediction{low.length === 1 ? '' : 's'} with low
            confidence
          </summary>
          <ul className="mt-2 grid gap-1.5" aria-label={`Low-confidence predictions on ${label}`}>
            {low.map((slot) => (
              <li
                key={slot.id}
                data-slot
                data-conf={slot.confidence}
                data-pf={slot.platforms.join(' ')}
              >
                <CompactSlotRow slot={slot} />
              </li>
            ))}
          </ul>
        </details>
      )}
      {hiddenCount > 0 && (
        <p className="mt-3 text-xs text-text-muted">
          {hiddenCount} more prediction{hiddenCount === 1 ? '' : 's'} for this
          day {hiddenCount === 1 ? 'is' : 'are'} not shown. Open a streamer&apos;s
          page for their full schedule.
        </p>
      )}
    </section>
  );
}
