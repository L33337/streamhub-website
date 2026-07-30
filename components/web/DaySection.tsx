import type { PublicStreamSlot } from '@/lib/server/partner-api';
import { slotLexFor } from '@/lib/i18n-slot';
import { resolveUiLang } from '@/lib/i18n-core';
import { utcDateAbsoluteLabel } from '@/lib/format/time';
import { DayLabel } from './DayLabel';
import { SlotCard } from './SlotCard';

interface Props {
  dateKey: string;
  /** UTC-referenced day label; DayLabel re-decides Today/Tomorrow per viewer. */
  label: string;
  slots: PublicStreamSlot[];
  /** Localizes counts/aria + the nested SlotCards; default 'en' keeps the game-page caller byte-identical. */
  language?: string;
  /**
   * Truncation markers for the streamer page (see CollapsibleSchedule +
   * globals.css). `startIndex` is this section's offset into the flattened
   * 7-day slot list; slots past `truncateAt` collapse, the one exactly at it
   * stays half-visible. Null/omitted → no markers at all, so every other caller
   * renders byte-identically.
   */
  startIndex?: number;
  truncateAt?: number | null;
}

export function DaySection({
  dateKey,
  label,
  slots,
  language = 'en',
  startIndex = 0,
  truncateAt = null,
}: Props) {
  const L = slotLexFor(language);
  const absoluteLabel = utcDateAbsoluteLabel(dateKey, resolveUiLang(language));
  // Cancelled slots are streams that are NOT happening — they belong in the
  // list (that is the news) but not in the count.
  const realCount = slots.filter((s) => s.slot_kind !== 'cancelled').length;

  const slotRole = (index: number): 'peek' | 'hidden' | undefined => {
    if (truncateAt === null) return undefined;
    const global = startIndex + index;
    if (global < truncateAt) return undefined;
    return global === truncateAt ? 'peek' : 'hidden';
  };
  // Whole section collapses once even its first slot is past the cut — keeping
  // the heading would leave a dangling date with nothing under it.
  const dayRole =
    truncateAt !== null && startIndex > truncateAt ? 'hidden' : undefined;

  return (
    <section
      id={`day-${dateKey}`}
      data-day-role={dayRole}
      aria-labelledby={`heading-${dateKey}`}
      className="mt-10 scroll-mt-[calc(var(--header-height)+5rem)]"
    >
      <h2
        id={`heading-${dateKey}`}
        className="text-2xl font-bold text-white mb-4 flex items-baseline gap-3"
      >
        <DayLabel dateKey={dateKey} serverLabel={label} language={language} />
        <span className="text-sm font-normal text-text-muted">
          {realCount === 0 ? L.noStreamsExpected : L.nStreams(realCount)}
        </span>
      </h2>
      {/* Absolute date, not the relative word: the visible heading becomes
          viewer-relative after hydration, and an aria label that still said
          "Tomorrow" would then contradict it. */}
      <ul className="grid gap-3" aria-label={L.streamsOnAria(absoluteLabel)}>
        {slots.map((slot, i) => (
          // `min-w-0`: a grid item defaults to `min-width:auto`, so the card's
          // truncating status line stretched the track past the viewport.
          <li key={slot.id} data-slot-role={slotRole(i)} className="min-w-0">
            <SlotCard slot={slot} language={language} />
          </li>
        ))}
      </ul>
    </section>
  );
}
