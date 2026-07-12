import type { PublicStreamerStats } from '@/lib/server/partner-api';
import { timezoneCityLabel } from '@/lib/format/time';
import { uiLexFor } from '@/lib/i18n-ui';

// --- Typical-streaming-times copy -----------------------------------------------
//
// The lead sentence is shared between the StreamerStatsBlock and the
// "When does {name} usually stream?" FAQ item so the page answers the query
// with one consistent, crawlable phrasing. All times inside `stats` are
// already streamer-local strings from the Partner API — no conversion here.
// Localized to the streamer's language via lib/i18n-ui.ts; the default
// (language = null) renders the original English wording byte-identically.

/** "New York time" / "UTC" label for the streamer's zone, localized. */
export function statsTimezoneLabel(
  stats: PublicStreamerStats,
  language: string | null = null,
): string {
  if (stats.timezone === 'UTC') return 'UTC';
  return uiLexFor(language).stats.cityTime(timezoneCityLabel(stats.timezone));
}

/**
 * "{name} usually streams N days per week, typically between HH:MM and HH:MM
 * (Berlin time)." — the direct answer to "when does {name} stream?".
 */
export function statsLeadSentence(
  name: string,
  stats: PublicStreamerStats,
  language: string | null = null,
): string {
  const days = Math.max(1, Math.round(stats.active_days_per_week ?? 1));
  const times =
    stats.typical_start && stats.typical_end
      ? {
          start: stats.typical_start,
          end: stats.typical_end,
          tzLabel: statsTimezoneLabel(stats, language),
        }
      : null;
  return uiLexFor(language).stats.leadSentence(name, days, times);
}
