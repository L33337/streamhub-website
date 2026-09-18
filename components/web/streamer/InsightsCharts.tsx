'use client';

// M24 streamer insights: median-viewers bars by weekday and by hour, with a
// viewer-TZ / streamer-TZ toggle on the HOUR chart (exact cell rotation).
// Bars share the best-time heatmap's heat scale (timingBarColor + winsorized
// band): the hotter a bar glows (violet → gold), the stronger the hour —
// timingBarColor is the floored variant so even the coldest bar stays
// visible as a mark. Weekday bars stay UTC-labelled on purpose: day-level
// aggregates cannot be shifted across midnight without the underlying
// samples (site convention: "days follow the UTC calendar"). SSR renders the
// UTC frame; hydration switches to the viewer's timezone —
// useSyncExternalStore pattern.

import { useMemo, useState, useSyncExternalStore } from 'react';
import type { InsightsMedianCell } from '@/lib/server/partner-api';
import { localUtcOffsetHours } from '@/lib/game-heatmap';
import { formatStatValue } from '@/lib/format/number';
import { timingBarColor, timingGoodness, timingScaleOf } from '@/lib/game-timing';
import {
  WEEKDAY_LABELS,
  shiftHourCells,
  tzOffsetHours,
} from '@/lib/streamer-insights';

function subscribe(): () => void {
  return () => {};
}

/**
 * Every visible string of the chart, injectable so a localized host page
 * (the wiki, viewer-locale UI) can pass its lexicon; the insights page keeps
 * the English defaults below. Parameterized entries are `{placeholder}`
 * TEMPLATES rather than functions: the object arrives as a prop from a
 * server component, and functions cannot cross that boundary.
 */
export interface InsightsChartLabels {
  weekdayHeading: string;
  weekdayNote: string;
  hourHeading: string;
  tzGroupAria: string;
  yourTime: string;
  streamerTime: string;
  /** `{tz}` */
  streamerTimeNote: string;
  yourTimeNote: string;
  utcNote: string;
  legendCold: string;
  legendPrime: string;
  legendFaded: string;
  weekdayAria: string;
  hourAria: string;
  /** `{label}`, `{median}`, `{samples}` */
  tooltip: string;
  /** `{label}` */
  noData: string;
}

export const DEFAULT_INSIGHTS_CHART_LABELS: InsightsChartLabels = {
  weekdayHeading: 'Median viewers by weekday',
  weekdayNote: 'Days follow the UTC calendar.',
  hourHeading: 'Median viewers by hour',
  tzGroupAria: 'Hour chart timezone',
  yourTime: 'Your time',
  streamerTime: 'Streamer time',
  streamerTimeNote: "Streamer's local time ({tz}).",
  yourTimeNote: 'Your local time.',
  utcNote: 'UTC.',
  legendCold: 'Cold',
  legendPrime: 'Prime time',
  legendFaded: 'faded = few samples',
  weekdayAria: 'Median concurrent viewers by weekday',
  hourAria: 'Median concurrent viewers by hour of day',
  tooltip: '{label} · median {median} viewers ({samples} samples)',
  noData: '{label} · no data',
};

/** `{key}` substitution for the label templates above. */
export function fillTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) =>
    key in vars ? String(vars[key]) : m,
  );
}

// Bars top out below 100% so value labels fit INSIDE the fixed-height chart
// row instead of clipping at its top edge.
const MAX_BAR_PCT = 84;

function Bars({
  cells,
  labels,
  ariaLabel,
  minSamples,
  labelMode,
  tooltip,
  noData,
  lang,
}: {
  cells: InsightsMedianCell[];
  labels: string[];
  ariaLabel: string;
  minSamples: number;
  /** 'all' = label every bar (7 weekday bars); 'peak' = only the best bar (24 hour bars would collide). */
  labelMode: 'all' | 'peak';
  tooltip: InsightsChartLabels['tooltip'];
  noData: InsightsChartLabels['noData'];
  lang: string;
}) {
  const max = Math.max(1, ...cells.map((c) => (c.median !== null ? c.median : 0)));
  // Best bar = highest median among cells with a trustworthy sample count —
  // thin-sample spikes already render dimmed and must not win the highlight.
  let bestIdx = -1;
  let best = -1;
  cells.forEach((c, i) => {
    if (c.median !== null && c.samples >= minSamples && c.median > best) {
      best = c.median;
      bestIdx = i;
    }
  });
  // Heat fill, same winsorized band as the best-time heatmap. The band is
  // built from TRUSTWORTHY bars only, so a thin-sample spike can neither
  // glow gold nor push every solid bar to the cold end (falls back to all
  // observed bars when nothing qualifies yet).
  const qualified = cells
    .filter((c) => c.median !== null && c.samples >= minSamples)
    .map((c) => c.median as number);
  const observed = cells.filter((c) => c.median !== null).map((c) => c.median as number);
  const scale = timingScaleOf(qualified.length > 0 ? qualified : observed);
  const heightPct = (v: number) => Math.max(4, Math.round((v / max) * MAX_BAR_PCT));
  return (
    <div>
      <div className="flex h-28 items-end gap-1" role="img" aria-label={ariaLabel}>
        {cells.map((c, i) => {
          const thin = c.median !== null && c.samples < minSamples;
          const isBest = i === bestIdx;
          const showLabel =
            c.median !== null && (labelMode === 'all' ? !thin : isBest);
          return (
            <div
              key={i}
              className="relative flex h-full flex-1 items-end"
              title={
                c.median !== null
                  ? fillTemplate(tooltip, {
                      label: labels[i],
                      median: formatStatValue(c.median, lang),
                      samples: c.samples,
                    })
                  : fillTemplate(noData, { label: labels[i] })
              }
            >
              {showLabel && c.median !== null && (
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-[-8px] z-10 text-center text-[10px] leading-none ${
                    isBest ? 'font-semibold text-text-primary' : 'text-text-muted'
                  }`}
                  style={{ bottom: `calc(${heightPct(c.median)}% + 3px)` }}
                >
                  {formatStatValue(c.median, lang)}
                </span>
              )}
              {c.median !== null ? (
                <div
                  aria-hidden="true"
                  className={`mx-auto w-4/5 rounded-t-[3px] ${
                    // Thin bars keep their color but render faded — the value
                    // is real, the confidence is not.
                    thin ? 'opacity-40' : ''
                  }`}
                  style={{
                    height: `${heightPct(c.median)}%`,
                    backgroundColor: timingBarColor(
                      timingGoodness(c.median, scale, 'viewers') ?? 0.5,
                    ),
                  }}
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="mx-auto h-1.5 w-4/5 rounded-t-[3px] border border-dashed border-white/15"
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-1 text-[10px] leading-none text-text-muted" aria-hidden="true">
        {labels.map((l, i) => (
          <div key={i} className="flex-1 truncate text-center">
            {labels.length > 12 ? (i % 3 === 0 ? l : '') : l}
          </div>
        ))}
      </div>
    </div>
  );
}

export function InsightsCharts({
  weekdayCells,
  hourCells,
  streamerTimezone,
  minSamples = 5,
  labels: labelsProp,
  weekdayLabels = WEEKDAY_LABELS,
  lang = 'en',
}: {
  weekdayCells: InsightsMedianCell[] | null;
  hourCells: InsightsMedianCell[] | null;
  streamerTimezone: string | null;
  minSamples?: number;
  /** Viewer-locale strings (wiki page); defaults to the English insights copy. */
  labels?: Partial<InsightsChartLabels>;
  /** Monday-first short weekday names; default English abbreviations. */
  weekdayLabels?: readonly string[];
  /** Number-format locale for bar value labels. */
  lang?: string;
}) {
  const L: InsightsChartLabels = { ...DEFAULT_INSIGHTS_CHART_LABELS, ...labelsProp };
  const viewerShift = useSyncExternalStore(
    subscribe,
    () => localUtcOffsetHours(),
    () => 0,
  );
  const isLocal = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const streamerShift = useMemo(
    () => (streamerTimezone ? tzOffsetHours(streamerTimezone) : null),
    [streamerTimezone],
  );
  const [frame, setFrame] = useState<'viewer' | 'streamer'>('viewer');

  const shift = frame === 'streamer' && streamerShift !== null ? streamerShift : viewerShift;
  const shiftedHours = useMemo(
    () => (hourCells ? shiftHourCells(hourCells, shift) : null),
    [hourCells, shift],
  );
  const hourLabels = useMemo(
    () => Array.from({ length: 24 }, (_, h) => `${h}`),
    [],
  );

  return (
    <div className="grid gap-8 lg:grid-cols-2" suppressHydrationWarning>
      {weekdayCells && (
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{L.weekdayHeading}</h3>
          <p className="mt-0.5 text-xs text-text-muted">{L.weekdayNote}</p>
          <div className="mt-3">
            <Bars
              cells={weekdayCells}
              labels={[...weekdayLabels]}
              ariaLabel={L.weekdayAria}
              minSamples={minSamples}
              labelMode="all"
              tooltip={L.tooltip}
              noData={L.noData}
              lang={lang}
            />
          </div>
        </div>
      )}
      {shiftedHours && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-text-primary">{L.hourHeading}</h3>
            {streamerShift !== null && (
              <div
                role="group"
                aria-label={L.tzGroupAria}
                className="inline-flex gap-1 rounded-lg border border-border-default bg-background-elevated p-0.5"
              >
                <button
                  type="button"
                  onClick={() => setFrame('viewer')}
                  aria-pressed={frame === 'viewer'}
                  className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
                    frame === 'viewer'
                      ? 'bg-background-highlight text-text-primary'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {L.yourTime}
                </button>
                <button
                  type="button"
                  onClick={() => setFrame('streamer')}
                  aria-pressed={frame === 'streamer'}
                  className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
                    frame === 'streamer'
                      ? 'bg-background-highlight text-text-primary'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {L.streamerTime}
                </button>
              </div>
            )}
          </div>
          <p className="mt-0.5 text-xs text-text-muted">
            {frame === 'streamer' && streamerShift !== null
              ? fillTemplate(L.streamerTimeNote, { tz: streamerTimezone ?? '' })
              : isLocal
                ? L.yourTimeNote
                : L.utcNote}
          </p>
          <div className="mt-3">
            <Bars
              cells={shiftedHours}
              labels={hourLabels}
              ariaLabel={L.hourAria}
              minSamples={minSamples}
              labelMode="peak"
              tooltip={L.tooltip}
              noData={L.noData}
              lang={lang}
            />
          </div>
        </div>
      )}
      {(weekdayCells || shiftedHours) && (
        <div
          className="flex flex-wrap items-center gap-1 text-[10px] text-text-muted lg:col-span-2"
          aria-hidden="true"
        >
          <span className="mr-1">{L.legendCold}</span>
          {[0, 0.25, 0.5, 0.75, 1].map((g) => (
            <span
              key={g}
              className="h-3 w-3 rounded-[2px]"
              style={{ backgroundColor: timingBarColor(g) }}
            />
          ))}
          <span className="ml-1">{L.legendPrime}</span>
          <span className="ml-3">{L.legendFaded}</span>
        </div>
      )}
    </div>
  );
}
