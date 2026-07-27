import type { PublicStreamSlot } from '@/lib/server/partner-api';
import { slotLexFor } from '@/lib/i18n-slot';
import { NextStreamHint } from './NextStreamHint';

/**
 * Slim placeholder for a day with no scheduled or predicted streams, so the
 * 7-day structure on the streamer page stays readable instead of days silently
 * disappearing. Keeps the h2 outline and the `day-…` anchor in parity with
 * DaySection. `language` localizes the placeholder text (default 'en').
 *
 * `nextSlot` turns the row from a dead end into a pointer at the next stream —
 * passed only for today (repeating it on every empty day would be noise).
 */
export function EmptyDayRow({
  dateKey,
  label,
  language = 'en',
  nextSlot = null,
  collapsed = false,
}: {
  dateKey: string;
  label: string;
  language?: string;
  nextSlot?: PublicStreamSlot | null;
  /** Past the schedule's truncation cut — hidden until the reader expands. */
  collapsed?: boolean;
}) {
  return (
    <section
      id={`day-${dateKey}`}
      data-day-role={collapsed ? 'hidden' : undefined}
      aria-labelledby={`heading-${dateKey}`}
      className="mt-8 scroll-mt-[calc(var(--header-height)+5rem)] border-b border-dashed border-divider pb-3"
    >
      <h2
        id={`heading-${dateKey}`}
        className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-lg font-semibold text-text-secondary"
      >
        {label}
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
