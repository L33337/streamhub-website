import type { PublicStreamerStats, StatsWeekday } from '@/lib/server/partner-api';
import { timezoneCityLabel } from '@/lib/format/time';
import { resolveUiLang, weekdayShort } from '@/lib/i18n-core';
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

/** The API's weekday keys carry no order of their own. */
const WEEKDAY_ISO_INDEX: Record<StatsWeekday, number> = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
  saturday: 5,
  sunday: 6,
};

/**
 * The days the streamer actually streams, as a localized short list in ISO
 * order: "Tue, Thu, Sat". null when the stats carry no weekday rows.
 *
 * This is the meta description's counterpart to the weekday table: the body can
 * afford `statsLeadSentence`'s "3 days per week" because the table right below
 * it names them, but a description has no table — and "3 days per week" is a
 * non-answer to "when does X stream?", for a reader and for an LLM quoting the
 * page. Naming the days costs about the same characters as counting them.
 *
 * A plain comma list rather than an `Intl.ListFormat` conjunction ("Tue, Thu
 * and Sat"): the conjunction spends description budget on a word that makes the
 * list harder, not easier, to lift back out as data.
 */
export function activeWeekdayList(
  stats: PublicStreamerStats,
  language: string | null = null,
): string | null {
  const lang = resolveUiLang(language);
  const isoIndexes = [
    ...new Set(
      stats.weekdays
        .map((d) => WEEKDAY_ISO_INDEX[d.weekday])
        .filter((i): i is number => i !== undefined),
    ),
  ].sort((a, b) => a - b);
  if (isoIndexes.length === 0) return null;
  return isoIndexes.map((i) => weekdayShort(i, lang)).join(', ');
}
