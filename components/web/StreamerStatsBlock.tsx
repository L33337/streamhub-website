import type { PublicStreamer, PublicStreamerStats } from '@/lib/server/partner-api';
import { formatDuration } from '@/lib/format/time';
import { resolveUiLang } from '@/lib/i18n-core';
import { uiLexFor } from '@/lib/i18n-ui';
import { dirFor } from '@/lib/seo';
import { statsLeadSentence, statsTimezoneLabel } from '@/lib/streamer-stats';
import { WeekdayTimesTable } from './WeekdayTimesTable';

interface Props {
  streamer: PublicStreamer;
  stats: PublicStreamerStats;
  // M22 (D6): UI strings follow the viewer's locale; defaults to the
  // streamer's language for pre-M22 call sites.
  uiLanguage?: string | null;
}

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
export function StreamerStatsBlock({ streamer, stats, uiLanguage }: Props) {
  const ui = uiLanguage ?? streamer.language;
  const lang = resolveUiLang(ui);
  const L = uiLexFor(ui).stats;
  const proseDir = dirFor(ui);
  const tzLabel = statsTimezoneLabel(stats, ui);

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
        {statsLeadSentence(streamer.name, stats, ui)}
      </p>

      {stats.weekdays.length > 0 && (
        <WeekdayTimesTable
          weekdays={stats.weekdays}
          timezone={stats.timezone}
          tzLabel={tzLabel}
          language={lang}
          labels={{
            caption: L.caption(streamer.name, tzLabel),
            colDay: L.colDay,
            colTime: L.colTime,
            colDuration: L.colDuration,
            usuallyNoStream: L.usuallyNoStream,
            yourTime: L.tzToggleYour,
            toggleAria: L.tzToggleAria,
            allTimesIn: `${L.allTimesIn(tzLabel)}${
              stats.timezone !== 'UTC' ? ` (${stats.timezone})` : ''
            }.`,
          }}
        />
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

      {/* The zone statement moved up next to the table (it governs how every
          number there is read); the footnote keeps only the sample basis. */}
      <p className="mt-4 text-xs text-text-muted" dir={proseDir}>
        {L.basedOn(stats.sample_size, stats.window_days)}
      </p>
    </section>
  );
}
