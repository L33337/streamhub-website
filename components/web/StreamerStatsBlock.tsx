import type {
  PublicStreamer,
  PublicStreamerStats,
  PublicStreamerStatsWeekday,
  StatsWeekday,
} from '@/lib/server/partner-api';
import { formatDuration } from '@/lib/format/time';
import { resolveUiLang, weekdayLong } from '@/lib/i18n-core';
import { uiLexFor } from '@/lib/i18n-ui';
import { dirFor } from '@/lib/seo';
import { statsLeadSentence, statsTimezoneLabel } from '@/lib/streamer-stats';

interface Props {
  streamer: PublicStreamer;
  stats: PublicStreamerStats;
}

// ISO order Mon→Sun; labels come from Intl (weekdayLong) in the streamer's
// language — 'Monday'…'Sunday' for the English default.
const WEEKDAY_KEYS: StatsWeekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

/**
 * "When does {name} stream?" — typical weekly streaming pattern computed from
 * the last 28 days of broadcast history (Partner API /stats). This is the
 * page's substantial evergreen content: it renders even when nothing is
 * scheduled, which is exactly when the 7-day schedule above is empty. Times
 * arrive as streamer-local "HH:MM" strings; the semantic <table> keeps the
 * weekly raster extractable for search-result snippets.
 *
 * Localized to the streamer's language (body-localization 2026-07); prose
 * blocks carry dir for RTL languages while the table/tiles stay LTR.
 *
 * Callers only render this when stats are available (`getStreamerStats`
 * collapses has_stats:false and errors to null), so no empty state here.
 */
export function StreamerStatsBlock({ streamer, stats }: Props) {
  const lang = resolveUiLang(streamer.language);
  const L = uiLexFor(streamer.language).stats;
  const proseDir = dirFor(streamer.language);
  const tzLabel = statsTimezoneLabel(stats, streamer.language);
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
        {L.heading(streamer.name)}
      </h2>
      <p className="mt-3 text-text-secondary" dir={proseDir}>
        {statsLeadSentence(streamer.name, stats, streamer.language)}
      </p>

      {stats.weekdays.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-xl bg-background-elevated p-1 gradient-border">
          <table className="w-full text-sm">
            <caption className="sr-only">{L.caption(streamer.name, tzLabel)}</caption>
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                <th scope="col" className="px-3 py-2 font-semibold">
                  {L.colDay}
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  {L.colTime}
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  {L.colDuration}
                </th>
              </tr>
            </thead>
            <tbody>
              {WEEKDAY_KEYS.map((key, isoIndex) => {
                const day = byWeekday.get(key);
                return (
                  <tr key={key} className="border-t border-divider">
                    <th
                      scope="row"
                      className="px-3 py-2 text-left font-medium text-text-primary"
                    >
                      {weekdayLong(isoIndex, lang)}
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
                        {L.usuallyNoStream}
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
              {L.streamsPerWeek}
            </div>
            <div className="mt-1 text-lg font-bold text-text-primary">
              {stats.streams_per_week}
            </div>
          </div>
        )}
        {stats.typical_duration_minutes !== null && (
          <div className="rounded-xl bg-background-elevated p-3">
            <div className="text-xs uppercase tracking-wider text-text-muted">
              {L.typicalLength}
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
            {L.topCategories}
          </h3>
          <p className="mt-2 text-sm text-text-secondary">
            {stats.top_categories
              .map((c) => `${c.category} (${c.share_percent}%)`)
              .join(' · ')}
          </p>
        </div>
      )}

      <p className="mt-4 text-xs text-text-muted" dir={proseDir}>
        {L.basedOn(stats.sample_size, stats.window_days)} {L.allTimesIn(tzLabel)}
        {stats.timezone !== 'UTC' ? ` (${stats.timezone})` : ''}.
      </p>
    </section>
  );
}
