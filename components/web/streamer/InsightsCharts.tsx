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

// Bars top out below 100% so value labels fit INSIDE the fixed-height chart
// row instead of clipping at its top edge.
const MAX_BAR_PCT = 84;

function Bars({
  cells,
  labels,
  ariaLabel,
  minSamples,
  labelMode,
}: {
  cells: InsightsMedianCell[];
  labels: string[];
  ariaLabel: string;
  minSamples: number;
  /** 'all' = label every bar (7 weekday bars); 'peak' = only the best bar (24 hour bars would collide). */
  labelMode: 'all' | 'peak';
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
                  ? `${labels[i]} · median ${formatStatValue(c.median)} viewers (${c.samples} samples)`
                  : `${labels[i]} · no data`
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
                  {formatStatValue(c.median)}
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
}: {
  weekdayCells: InsightsMedianCell[] | null;
  hourCells: InsightsMedianCell[] | null;
  streamerTimezone: string | null;
  minSamples?: number;
}) {
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
          <h3 className="text-sm font-semibold text-text-primary">Median viewers by weekday</h3>
          <p className="mt-0.5 text-xs text-text-muted">Days follow the UTC calendar.</p>
          <div className="mt-3">
            <Bars
              cells={weekdayCells}
              labels={[...WEEKDAY_LABELS]}
              ariaLabel="Median concurrent viewers by weekday"
              minSamples={minSamples}
              labelMode="all"
            />
          </div>
        </div>
      )}
      {shiftedHours && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-text-primary">Median viewers by hour</h3>
            {streamerShift !== null && (
              <div
                role="group"
                aria-label="Hour chart timezone"
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
                  Your time
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
                  Streamer time
                </button>
              </div>
            )}
          </div>
          <p className="mt-0.5 text-xs text-text-muted">
            {frame === 'streamer' && streamerShift !== null
              ? `Streamer's local time (${streamerTimezone}).`
              : isLocal
                ? 'Your local time.'
                : 'UTC.'}
          </p>
          <div className="mt-3">
            <Bars
              cells={shiftedHours}
              labels={hourLabels}
              ariaLabel="Median concurrent viewers by hour of day"
              minSamples={minSamples}
              labelMode="peak"
            />
          </div>
        </div>
      )}
      {(weekdayCells || shiftedHours) && (
        <div
          className="flex flex-wrap items-center gap-1 text-[10px] text-text-muted lg:col-span-2"
          aria-hidden="true"
        >
          <span className="mr-1">Cold</span>
          {[0, 0.25, 0.5, 0.75, 1].map((g) => (
            <span
              key={g}
              className="h-3 w-3 rounded-[2px]"
              style={{ backgroundColor: timingBarColor(g) }}
            />
          ))}
          <span className="ml-1">Prime time</span>
          <span className="ml-3">faded = few samples</span>
        </div>
      )}
    </div>
  );
}
