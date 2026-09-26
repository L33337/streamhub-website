import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { PublicStreamSlot } from '@/lib/server/partner-api';
import {
  isIcsExportable,
  publicSlotToIcsSlot,
  splitDayForRendering,
} from '@/lib/game-schedule';
import { sizedAvatarUrl } from '@/lib/format/image-size';
import { localeHref, resolveUiLang } from '@/lib/i18n-core';
import { hubLexFor } from '@/lib/i18n-hub';
import { slotLexFor } from '@/lib/i18n-slot';
import { utcDateAbsoluteLabel } from '@/lib/format/time';
import { DayLabel } from '@/components/web/DayLabel';
import { InitialsAvatar } from '@/components/web/InitialsAvatar';
import { NextStreamTime } from '@/components/web/NextStreamTime';
import { ConfidenceBadge, PlatformBadge } from '@/components/web/Badges';
import { SlotCard } from '@/components/web/SlotCard';
import { SlotIcsButton } from '@/components/web/SlotIcsButton';

// Game-hub variant of DaySection (UX round 2026-07-23, reworked 2026-09-24).
//
// Per day: the first FULL_CARDS_PER_DAY high/medium predictions (plus every
// cancelled slot) render as full SlotCards, the remaining high/medium ones as
// compact rows that stay open, and low-confidence predictions collapse into
// compact rows behind a <details> expander — crawlable but closed by default.
// A full card is ~200px on a phone; twelve a day made a 14,000px week.
//
// The data-slot/data-conf/data-pf attributes are the contract with
// ScheduleFilters (client), which toggles the `hidden` attribute; keep them on
// EVERY slot row, compact or full. `data-day-role="hidden"` is the contract
// with CollapsibleSchedule + globals.css (collapsed days 3..7).
//
// M22 P4: this is a SERVER component (rendered as `children` of the client
// ScheduleFilters — passed-through ReactNodes never enter the client bundle),
// so it may read the server-only hub lexicon directly instead of taking a
// dozen string props.

function CompactSlotRow({
  slot,
  language,
  icsAria,
  icsTitle,
}: {
  slot: PublicStreamSlot;
  language: string;
  icsAria: string;
  icsTitle: string;
}) {
  const lang = resolveUiLang(language);
  return (
    // Logical padding (ps/pe) so the row mirrors correctly in Arabic.
    <div className="flex items-center gap-2 rounded-lg border border-border-default/60 bg-background-elevated/60 py-1.5 pe-1.5 ps-2.5">
      <Link
        href={localeHref(lang, `/schedule/${encodeURIComponent(slot.id)}`)}
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
        {/* Two lines on phones (time · name · confidence, then title), one
            line from sm: up. Nothing is duplicated between the layouts. */}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2.5">
          <span className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-text-secondary">
              <NextStreamTime
                startTime={slot.start_time}
                isPredicted={slot.is_predicted}
                language={language}
              />
            </span>
            {/* min-w-0 so this is the element that gives up width. */}
            <span className="min-w-0 truncate text-xs font-semibold text-text-primary group-hover:text-accent-cyan">
              {slot.streamer_name}
            </span>
            <ConfidenceBadge level={slot.confidence} size="sm" language={language} />
          </span>
          <span className="flex min-w-0 items-center gap-2 sm:flex-1">
            <span className="min-w-0 flex-1 truncate text-xs text-text-muted">
              {slot.title}
            </span>
            <span className="flex shrink-0 items-center gap-1">
              {slot.platforms.map((p) => (
                <PlatformBadge key={p} platform={p} size="xs" />
              ))}
            </span>
          </span>
        </span>
      </Link>
      {isIcsExportable(slot) && (
        <SlotIcsButton slot={publicSlotToIcsSlot(slot)} ariaLabel={icsAria} title={icsTitle} />
      )}
    </div>
  );
}

function SlotRowItem({
  slot,
  children,
}: {
  slot: PublicStreamSlot;
  children: React.ReactNode;
}) {
  return (
    <li
      data-slot
      data-conf={slot.confidence}
      data-pf={slot.platforms.join(' ')}
      className="min-w-0"
    >
      {children}
    </li>
  );
}

export function GameDaySection({
  dateKey,
  label,
  slots,
  hiddenCount = 0,
  collapsed = false,
  language = 'en',
}: {
  dateKey: string;
  /** UTC-referenced day label; DayLabel re-decides Today/Tomorrow per viewer. */
  label: string;
  slots: PublicStreamSlot[];
  /**
   * Slots this day has but the page does not render (page-weight cap — see
   * `capDaySlots`). The heading then says "12 of 22 streams", so the day never
   * under-reports itself.
   */
  hiddenCount?: number;
  /** Starts collapsed behind the page's "Show all 7 days" toggle. */
  collapsed?: boolean;
  language?: string;
}) {
  const { full, compact, low } = splitDayForRendering(slots);
  const totalCount = slots.length + hiddenCount;
  const lang = resolveUiLang(language);
  const G = hubLexFor(language).game;
  const S = slotLexFor(language);
  const absoluteLabel = utcDateAbsoluteLabel(dateKey, lang);
  return (
    <section
      id={`day-${dateKey}`}
      data-day
      data-day-role={collapsed ? 'hidden' : undefined}
      aria-labelledby={`heading-${dateKey}`}
      className="mt-8 scroll-mt-[calc(var(--header-height)+5rem)]"
    >
      {/* h3: the schedule section's own h2 ("Upcoming X streams") sits above. */}
      <h3
        id={`heading-${dateKey}`}
        className="mb-3 flex items-baseline gap-3 text-lg font-bold text-white"
      >
        <DayLabel dateKey={dateKey} serverLabel={label} language={language} />
        <span className="text-sm font-normal text-text-muted">
          {hiddenCount > 0 ? G.dayCountShown(slots.length, totalCount) : S.nStreams(totalCount)}
        </span>
      </h3>
      {full.length > 0 && (
        <ul className="grid gap-3" aria-label={S.streamsOnAria(absoluteLabel)}>
          {full.map((slot) => (
            <SlotRowItem key={slot.id} slot={slot}>
              <div className="relative">
                <SlotCard slot={slot} language={language} reserveTopRight plainTitle />
                {isIcsExportable(slot) && (
                  <SlotIcsButton
                    slot={publicSlotToIcsSlot(slot)}
                    ariaLabel={G.icsAria(slot.streamer_name)}
                    title={G.icsTitle}
                    className="absolute right-2 top-2"
                  />
                )}
              </div>
            </SlotRowItem>
          ))}
        </ul>
      )}
      {compact.length > 0 && (
        <ul
          className={`grid gap-1.5 ${full.length > 0 ? 'mt-3' : ''}`}
          aria-label={S.streamsOnAria(absoluteLabel)}
        >
          {compact.map((slot) => (
            <SlotRowItem key={slot.id} slot={slot}>
              <CompactSlotRow
                slot={slot}
                language={language}
                icsAria={G.icsAria(slot.streamer_name)}
                icsTitle={G.icsTitle}
              />
            </SlotRowItem>
          ))}
        </ul>
      )}
      {low.length > 0 && (
        <details data-low-bucket className="group mt-3">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-lg border border-border-default/60 bg-background-elevated/40 px-3 py-2 text-sm text-text-muted transition-colors hover:border-accent-cyan/60 hover:text-accent-cyan [&::-webkit-details-marker]:hidden">
            <ChevronRight
              size={14}
              aria-hidden="true"
              className="shrink-0 transition-transform group-open:rotate-90 rtl:rotate-180 rtl:group-open:rotate-90"
            />
            {G.moreLowConfidence(low.length)}
          </summary>
          <ul className="mt-2 grid gap-1.5" aria-label={G.lowConfAria(label)}>
            {low.map((slot) => (
              <SlotRowItem key={slot.id} slot={slot}>
                <CompactSlotRow
                  slot={slot}
                  language={language}
                  icsAria={G.icsAria(slot.streamer_name)}
                  icsTitle={G.icsTitle}
                />
              </SlotRowItem>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
