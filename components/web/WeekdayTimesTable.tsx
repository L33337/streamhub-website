'use client';

import { useState, useSyncExternalStore } from 'react';
import type { PublicStreamerStatsWeekday, StatsWeekday } from '@/lib/server/partner-api';
import { formatDuration, safeTimeZone } from '@/lib/format/time';
import { toViewerWeekdayTime } from '@/lib/format/zoned-time';
import { resolveUiLang, weekdayLong, weekdayShort } from '@/lib/i18n-core';

function subscribe(): () => void {
  // The viewer's zone is read once at hydration; Intl does not notify on change.
  return () => {};
}

function readViewerZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

// ISO order Mon→Sun; labels come from Intl (weekdayLong) in the UI language.
const WEEKDAY_KEYS: StatsWeekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

interface Props {
  weekdays: PublicStreamerStatsWeekday[];
  /** Streamer's IANA home zone (or 'UTC') — the zone the API's times are in. */
  timezone: string;
  /** Localized label for that zone, e.g. "Berlin time" or "UTC". */
  tzLabel: string;
  language: string;
  labels: {
    caption: string;
    colDay: string;
    colTime: string;
    colDuration: string;
    usuallyNoStream: string;
    /** "Your time" — the viewer-local option. */
    yourTime: string;
    /** Group label, e.g. "Show times in". */
    toggleAria: string;
    /** Static zone line shown when no conversion is possible/needed. */
    allTimesIn: string;
  };
}

/**
 * Typical-streaming-times table with a viewer/streamer timezone switch.
 *
 * The API hands us wall-clock times in the STREAMER's zone. Left as-is they
 * contradict the schedule above, which shows viewer-local times — the visitor
 * has to do the arithmetic themselves, which is exactly the job this site is
 * supposed to do.
 *
 * Rendering rules:
 * - SSR and first hydration render the raw streamer-local strings, so the
 *   server HTML is deterministic/ISR-cacheable and hydration matches exactly.
 * - An effect then switches to viewer time, but ONLY when the viewer's zone
 *   actually differs from the streamer's — same-zone visitors see no flash and
 *   no pointless toggle.
 * - A conversion that moves the start across midnight prefixes the real
 *   weekday, so a "Monday" row can honestly read "Sun 7:00 PM".
 */
export function WeekdayTimesTable({
  weekdays,
  timezone,
  tzLabel,
  language,
  labels,
}: Props) {
  const lang = resolveUiLang(language);
  const streamerZone = safeTimeZone(timezone);
  // null while server-rendering and during hydration — that is what keeps the
  // first paint deterministic; React re-renders with the real zone right after.
  const viewerZone = useSyncExternalStore(subscribe, readViewerZone, () => null);
  const [override, setOverride] = useState<'streamer' | 'viewer' | null>(null);

  // Only worth converting (and only worth offering a switch) when the two zones
  // actually differ — a Berlin viewer on a Berlin streamer gets neither.
  const canConvert =
    streamerZone !== null && viewerZone !== null && viewerZone !== streamerZone;
  const mode: 'streamer' | 'viewer' = override ?? (canConvert ? 'viewer' : 'streamer');
  const converting = mode === 'viewer' && canConvert;

  const byWeekday = new Map<StatsWeekday, PublicStreamerStatsWeekday>(
    weekdays.map((d) => [d.weekday, d]),
  );

  function renderTime(day: PublicStreamerStatsWeekday, isoIndex: number) {
    if (converting) {
      const opts = { viewerZone: viewerZone ?? undefined };
      const start = toViewerWeekdayTime(day.start, isoIndex, streamerZone, lang, opts);
      const end = toViewerWeekdayTime(day.end, isoIndex, streamerZone, lang, opts);
      if (start && end) {
        return (
          <>
            {start.shiftedWeekday !== null && (
              <span className="mr-1 text-text-muted">
                {weekdayShort(start.shiftedWeekday, lang)}
              </span>
            )}
            {start.time} – {end.time}
          </>
        );
      }
      // Unparseable time or unusable zone — fall through to the raw values
      // rather than showing nothing.
    }
    return `${day.start} – ${day.end}`;
  }

  return (
    <div className="mt-4">
      {/* Timezone context sits directly above the table instead of in a
          footnote below it — it changes how every number here is read. */}
      {canConvert ? (
        <div
          className="mb-2 flex flex-wrap items-center gap-2 text-xs"
          role="group"
          aria-label={labels.toggleAria}
        >
          <span className="text-text-muted">{labels.toggleAria}</span>
          <button
            type="button"
            aria-pressed={mode === 'viewer'}
            onClick={() => setOverride('viewer')}
            className={chipClass(mode === 'viewer')}
          >
            {labels.yourTime}
          </button>
          <button
            type="button"
            aria-pressed={mode === 'streamer'}
            onClick={() => setOverride('streamer')}
            className={chipClass(mode === 'streamer')}
          >
            {tzLabel}
          </button>
        </div>
      ) : (
        <p className="mb-2 text-xs text-text-muted">{labels.allTimesIn}</p>
      )}

      <div className="overflow-x-auto rounded-xl bg-background-elevated p-1 gradient-border">
        <table className="w-full text-sm">
          <caption className="sr-only">{labels.caption}</caption>
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
              <th scope="col" className="px-3 py-2 font-semibold">
                {labels.colDay}
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                {labels.colTime}
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                {labels.colDuration}
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
                      <td className="px-3 py-2 text-accent-cyan" suppressHydrationWarning>
                        {renderTime(day, isoIndex)}
                      </td>
                      <td className="px-3 py-2 text-text-secondary">
                        ~{formatDuration(day.duration_minutes)}
                      </td>
                    </>
                  ) : (
                    <td colSpan={2} className="px-3 py-2 text-text-muted">
                      {labels.usuallyNoStream}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function chipClass(active: boolean): string {
  return `rounded-lg border px-2.5 py-1 font-semibold transition-colors ${
    active
      ? 'border-accent-cyan/70 bg-background-highlight text-accent-cyan'
      : 'border-border-default bg-background-elevated text-text-secondary hover:border-accent-cyan/60 hover:text-text-primary'
  }`;
}
