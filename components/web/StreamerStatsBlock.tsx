import type {
  PublicStreamer,
  PublicStreamerStats,
  PublicStreamerStatsWeekday,
  StatsWeekday,
} from '@/lib/server/partner-api';
import { formatDuration } from '@/lib/format/time';
import { statsLeadSentence, statsTimezoneLabel } from '@/lib/streamer-stats';

interface Props {
  streamer: PublicStreamer;
  stats: PublicStreamerStats;
}

const WEEKDAYS: Array<{ key: StatsWeekday; label: string }> = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

/**
 * "When does {name} stream?" — typical weekly streaming pattern computed from
 * the last 28 days of broadcast history (Partner API /stats). This is the
 * page's substantial evergreen content: it renders even when nothing is
 * scheduled, which is exactly when the 7-day schedule above is empty. Times
 * arrive as streamer-local "HH:MM" strings; the semantic <table> keeps the
 * weekly raster extractable for search-result snippets.
 *
 * Callers only render this when stats are available (`getStreamerStats`
 * collapses has_stats:false and errors to null), so no empty state here.
 */
export function StreamerStatsBlock({ streamer, stats }: Props) {
  const byWeekday = new Map<StatsWeekday, PublicStreamerStatsWeekday>(
    stats.weekdays.map((d) => [d.weekday, d]),
  );

  return (
    <section
      id="typical-stream-times"
      aria-labelledby="stats-heading"
      className="mt-16 border-t border-divider pt-8"
    >
      <h2 id="stats-heading" className="text-2xl font-bold text-white">
        When does {streamer.name} stream?
      </h2>
      <p className="mt-3 text-text-secondary">{statsLeadSentence(streamer.name, stats)}</p>

      {stats.weekdays.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-xl bg-background-elevated p-1 gradient-border">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Typical streaming times for {streamer.name} by weekday, shown in{' '}
              {statsTimezoneLabel(stats)}
            </caption>
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                <th scope="col" className="px-3 py-2 font-semibold">
                  Day
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Typical time
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Duration
                </th>
              </tr>
            </thead>
            <tbody>
              {WEEKDAYS.map(({ key, label }) => {
                const day = byWeekday.get(key);
                return (
                  <tr key={key} className="border-t border-divider">
                    <th
                      scope="row"
                      className="px-3 py-2 text-left font-medium text-text-primary"
                    >
                      {label}
                    </th>
                    {day ? (
                      <>
                        <td className="px-3 py-2 text-accent-cyan">
                          {day.start} – {day.end}
                        </td>
                        <td className="px-3 py-2 text-text-secondary">
                          ~{formatDuration(day.duration_minutes)}
                        </td>
                      </>
                    ) : (
                      <td colSpan={2} className="px-3 py-2 text-text-muted">
                        Usually no stream
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-md">
        {stats.streams_per_week !== null && (
          <div className="rounded-xl bg-background-elevated p-3">
            <div className="text-xs uppercase tracking-wider text-text-muted">
              Streams per week
            </div>
            <div className="mt-1 text-lg font-bold text-text-primary">
              {stats.streams_per_week}
            </div>
          </div>
        )}
        {stats.typical_duration_minutes !== null && (
          <div className="rounded-xl bg-background-elevated p-3">
            <div className="text-xs uppercase tracking-wider text-text-muted">
              Typical stream length
            </div>
            <div className="mt-1 text-lg font-bold text-text-primary">
              ~{formatDuration(stats.typical_duration_minutes)}
            </div>
          </div>
        )}
      </div>

      {stats.top_categories.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
            Most streamed categories
          </h3>
          <p className="mt-2 text-sm text-text-secondary">
            {stats.top_categories
              .map((c) => `${c.category} (${c.share_percent}%)`)
              .join(' · ')}
          </p>
        </div>
      )}

      <p className="mt-4 text-xs text-text-muted">
        Based on {stats.sample_size} streams over the last {stats.window_days} days. All times
        shown in {statsTimezoneLabel(stats)}
        {stats.timezone !== 'UTC' ? ` (${stats.timezone})` : ''}.
      </p>
    </section>
  );
}
