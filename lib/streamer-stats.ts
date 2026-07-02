import type { PublicStreamerStats } from '@/lib/server/partner-api';
import { timezoneCityLabel } from '@/lib/format/time';

// --- Typical-streaming-times copy -----------------------------------------------
//
// The lead sentence is shared between the StreamerStatsBlock and the
// "When does {name} usually stream?" FAQ item so the page answers the query
// with one consistent, crawlable phrasing. All times inside `stats` are
// already streamer-local strings from the Partner API — no conversion here.

/** "(New York time)" / "(UTC)" parenthetical for the streamer's zone. */
export function statsTimezoneLabel(stats: PublicStreamerStats): string {
  return stats.timezone === 'UTC' ? 'UTC' : `${timezoneCityLabel(stats.timezone)} time`;
}

/**
 * "{name} usually streams N days per week, typically between HH:MM and HH:MM
 * (Berlin time)." — the direct answer to "when does {name} stream?".
 */
export function statsLeadSentence(name: string, stats: PublicStreamerStats): string {
  const days = Math.max(1, Math.round(stats.active_days_per_week ?? 1));
  const dayWord = days === 1 ? 'day' : 'days';
  const base = `${name} usually streams ${days} ${dayWord} per week`;
  if (stats.typical_start && stats.typical_end) {
    return `${base}, typically between ${stats.typical_start} and ${stats.typical_end} (${statsTimezoneLabel(stats)}).`;
  }
  return `${base}.`;
}
