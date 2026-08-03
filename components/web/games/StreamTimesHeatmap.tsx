'use client';

// "When is {game} streamed?" weekday×hour heatmap (game-hub UX round
// 2026-07-23). Sequential single-hue encoding (accent cyan over the dark
// surface, sqrt intensity — see lib/game-heatmap.ts), 2px cell gaps, per-cell
// native tooltips, a Less→More legend and a text summary so the insight never
// depends on color alone. SSR renders the deterministic UTC frame; after
// hydration the grid shifts into the viewer's timezone (same
// useSyncExternalStore pattern as SlotStatusText/NextStreamTime).
//
// M22 P4: all visible strings arrive as server-resolved labels (the hub
// lexicon is server-only). Text around the peak value ships as PLACEHOLDER
// TEMPLATES ({peak}, {tz}, {day}, {from}, {to}, {amount}) because the peak
// only exists after the client-side timezone shift. The English defaults keep
// any label-less caller byte-identical.

import { useMemo, useSyncExternalStore } from 'react';
import {
  HEATMAP_DAY_LABELS,
  buildHeatmapView,
  heatmapIntensity,
  localUtcOffsetHours,
  peakBandLabel,
} from '@/lib/game-heatmap';

export interface HeatmapLabels {
  /** Template with {peak} (rendered bold) and {tz}. */
  summary: string;
  summaryEmpty: string;
  /** {tz} replacements; leading space significant: " (your local time)". */
  tzLocal: string;
  tzUtc: string;
  aria: string;
  /** aria variant with a {peak} placeholder. */
  ariaWithPeak: string;
  /** Cell tooltip template: {day} {from}–{to} · {amount}. */
  tooltip: string;
  legendLess: string;
  legendMore: string;
  /** Short row labels, ISO order Mon..Sun. */
  dayShort: readonly string[];
  /** Peak-band day names ("Mondays" / "montags"), ISO order Mon..Sun. */
  dayNames: readonly string[];
}

const EN_LABELS: HeatmapLabels = {
  summary:
    'Most {category} streams run on {peak}{tz} — based on the last 4 weeks of tracked broadcasts.',
  summaryEmpty: 'Based on the last 4 weeks of tracked broadcasts.',
  tzLocal: ' (your local time)',
  tzUtc: ' (UTC)',
  aria: 'Weekly streaming heatmap for {category}.',
  ariaWithPeak: 'Weekly streaming heatmap for {category}. Busiest window: {peak}.',
  tooltip: '{day} {from}–{to} · {amount} streamed in 4 weeks',
  legendLess: 'Less',
  legendMore: 'More',
  dayShort: HEATMAP_DAY_LABELS,
  dayNames: [
    'Mondays',
    'Tuesdays',
    'Wednesdays',
    'Thursdays',
    'Fridays',
    'Saturdays',
    'Sundays',
  ],
};

function subscribe(): () => void {
  return () => {};
}

// Matches --color-accent-cyan in globals.css; inline because the alpha ramp
// needs the raw channel values.
const CYAN = '0, 240, 255';

const HOUR_TICKS = new Set([0, 6, 12, 18]);
const LEGEND_STEPS = [0.15, 0.4, 0.7, 1];

export function StreamTimesHeatmap({
  category,
  histogram,
  labels: labelsProp,
}: {
  category: string;
  /** 168 minutes-per-cell values, UTC frame, weekday 0 = Monday. */
  histogram: number[];
  labels?: HeatmapLabels;
}) {
  const labels = labelsProp ?? EN_LABELS;
  // Server snapshot: UTC (shift 0). Client snapshot: the browser's rounded
  // whole-hour offset — constant within a session, so the store is stable.
  const shift = useSyncExternalStore(
    subscribe,
    () => localUtcOffsetHours(),
    () => 0,
  );
  // True after hydration (client snapshot) — even for viewers at UTC±0,
  // where "your local time" is simply also UTC.
  const isLocal = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const view = useMemo(() => buildHeatmapView(histogram, shift), [histogram, shift]);
  const peak = peakBandLabel(view, labels.dayNames);

  // Split the summary template at {peak} so the peak renders in its own bold
  // span; the {tz} suffix lives in the tail on every language.
  const summaryParts = labels.summary
    .replace('{category}', category)
    .split('{peak}');
  const summaryTail = (summaryParts[1] ?? '').replace(
    '{tz}',
    isLocal ? labels.tzLocal : labels.tzUtc,
  );

  return (
    <div>
      <p className="mt-1 text-sm text-text-secondary" suppressHydrationWarning>
        {peak ? (
          <>
            {summaryParts[0]}
            <span className="font-semibold text-text-primary">{peak}</span>
            {summaryTail}
          </>
        ) : (
          <>{labels.summaryEmpty}</>
        )}
      </p>
      <div className="mt-4 overflow-x-auto">
        <div
          className="min-w-[560px]"
          role="img"
          aria-label={
            peak
              ? labels.ariaWithPeak.replace('{category}', category).replace('{peak}', peak)
              : labels.aria.replace('{category}', category)
          }
        >
          {/* Hour tick row */}
          <div
            className="grid gap-[2px]"
            style={{ gridTemplateColumns: '2.25rem repeat(24, minmax(0, 1fr))' }}
            aria-hidden="true"
          >
            <div />
            {Array.from({ length: 24 }, (_, hour) => (
              <div key={hour} className="pb-1 text-[10px] leading-none text-text-muted">
                {HOUR_TICKS.has(hour) ? `${hour}` : ''}
              </div>
            ))}
          </div>
          {view.grid.map((row, day) => (
            <div
              key={day}
              className="mt-[2px] grid gap-[2px]"
              style={{ gridTemplateColumns: '2.25rem repeat(24, minmax(0, 1fr))' }}
              aria-hidden="true"
            >
              <div className="flex items-center pr-1 text-[10px] leading-none text-text-muted">
                {labels.dayShort[day]}
              </div>
              {row.map((minutes, hour) => {
                const t = heatmapIntensity(minutes, view.max);
                return (
                  <div
                    key={hour}
                    className={`h-4 rounded-[2px] ${t === 0 ? 'bg-white/[0.04]' : ''}`}
                    style={
                      t > 0
                        ? { backgroundColor: `rgba(${CYAN}, ${0.08 + 0.84 * t})` }
                        : undefined
                    }
                    title={labels.tooltip
                      .replace('{day}', labels.dayShort[day])
                      .replace('{from}', `${String(hour).padStart(2, '0')}:00`)
                      .replace('{to}', `${String((hour + 1) % 24).padStart(2, '0')}:00`)
                      .replace(
                        '{amount}',
                        minutes >= 60
                          ? `${(minutes / 60).toFixed(1)}h`
                          : `${Math.round(minutes)}min`,
                      )}
                  />
                );
              })}
            </div>
          ))}
          {/* Legend */}
          <div
            className="mt-3 flex items-center gap-1 text-[10px] text-text-muted"
            aria-hidden="true"
          >
            <span className="mr-1">{labels.legendLess}</span>
            <span className="h-3 w-3 rounded-[2px] bg-white/[0.04]" />
            {LEGEND_STEPS.map((t) => (
              <span
                key={t}
                className="h-3 w-3 rounded-[2px]"
                style={{ backgroundColor: `rgba(${CYAN}, ${0.08 + 0.84 * t})` }}
              />
            ))}
            <span className="ml-1">{labels.legendMore}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
