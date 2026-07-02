/**
 * Slim placeholder for a day with no scheduled or predicted streams, so the
 * 7-day structure on the streamer page stays readable instead of days silently
 * disappearing. Keeps the h2 outline and the `day-…` anchor in parity with
 * DaySection.
 */
export function EmptyDayRow({ dateKey, label }: { dateKey: string; label: string }) {
  return (
    <section
      id={`day-${dateKey}`}
      aria-labelledby={`heading-${dateKey}`}
      className="mt-8 scroll-mt-[calc(var(--header-height)+5rem)] border-b border-dashed border-divider pb-3"
    >
      <h2
        id={`heading-${dateKey}`}
        className="flex items-baseline gap-3 text-lg font-semibold text-text-secondary"
      >
        {label}
        <span className="text-sm font-normal text-text-muted">
          No streams expected
        </span>
      </h2>
    </section>
  );
}
