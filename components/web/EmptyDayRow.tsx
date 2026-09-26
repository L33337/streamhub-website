import type { PublicStreamSlot } from '@/lib/server/partner-api';
import { slotLexFor } from '@/lib/i18n-slot';
import { DayLabel } from './DayLabel';
import { EmptyDayList } from './EmptyDayList';
import { NextStreamHint } from './NextStreamHint';

export interface EmptyDay {
  /** UTC day key, `YYYY-MM-DD`. */
  dateKey: string;
  /** Full UTC-referenced label ("Today", "Sat, Sep 26"). */
  label: string;
  /** Weekday-only UTC-referenced label ("Sat") for runs of several days. */
  shortLabel: string;
}

/**
 * Slim placeholder for days with no scheduled or predicted streams, so the
 * 7-day structure on the streamer page stays readable instead of days silently
 * disappearing. Keeps the h2 outline and the `day-…` anchors in parity with
 * DaySection. `language` localizes the placeholder text (default 'en').
 *
 * Consecutive empty days fold into ONE row since the streamer-page UX round
 * (2026-09-26): a streamer on a break rendered seven "No streams expected"
 * rows (~620 px on a phone). A run reads "Sun, Mon, Tue, Wed · No streams
 * expected"; a single day keeps its full label. Every day of the run keeps an
 * anchor (`day-<date>`), so deep links and the day pills still resolve.
 *
 * `nextSlot` turns the row from a dead end into a pointer at the next stream —
 * passed only for the run holding today (repeating it would be noise).
 */
export function EmptyDayRow({
  days,
  todayUtc,
  language = 'en',
  nextSlot = null,
  collapsed = false,
}: {
  days: EmptyDay[];
  /** Server UTC date: past days drop out of a run after hydration. */
  todayUtc: string;
  language?: string;
  nextSlot?: PublicStreamSlot | null;
  /** Past the schedule's truncation cut — hidden until the reader expands. */
  collapsed?: boolean;
}) {
  const [first, ...rest] = days;
  if (!first) return null;
  const single = rest.length === 0;
  return (
    <section
      id={`day-${first.dateKey}`}
      data-day-role={collapsed ? 'hidden' : undefined}
      aria-labelledby={`heading-${first.dateKey}`}
      className="mt-8 scroll-mt-[calc(var(--header-height)+5rem)] border-b border-dashed border-divider pb-3"
    >
      {rest.map((d) => (
        <span
          key={d.dateKey}
          id={`day-${d.dateKey}`}
          className="block scroll-mt-[calc(var(--header-height)+5rem)]"
          aria-hidden="true"
        />
      ))}
      <h2
        id={`heading-${first.dateKey}`}
        className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-lg font-semibold text-text-secondary"
      >
        {single ? (
          <DayLabel dateKey={first.dateKey} serverLabel={first.label} language={language} />
        ) : (
          <EmptyDayList days={days} todayUtc={todayUtc} language={language} />
        )}
        <span className="text-sm font-normal text-text-muted">
          {slotLexFor(language).noStreamsExpected}
        </span>
      </h2>
      {nextSlot && (
        <p className="mt-1">
          <NextStreamHint
            startTime={nextSlot.start_time}
            targetDateKey={nextSlot.start_time.slice(0, 10)}
            isPredicted={nextSlot.is_predicted}
            language={language}
          />
        </p>
      )}
    </section>
  );
}
