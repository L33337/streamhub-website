'use client';

// M24 streamer insights: median-viewers bars by weekday and by hour, with a
// viewer-TZ / streamer-TZ toggle on the HOUR chart (exact cell rotation).
// Weekday bars stay UTC-labelled on purpose: day-level aggregates cannot be
// shifted across midnight without the underlying samples (site convention:
// "days follow the UTC calendar"). SSR renders the UTC frame; hydration
// switches to the viewer's timezone — useSyncExternalStore pattern.

import { useMemo, useState, useSyncExternalStore } from 'react';
import type { InsightsMedianCell } from '@/lib/server/partner-api';
import { localUtcOffsetHours } from '@/lib/game-heatmap';
import {
  WEEKDAY_LABELS,
  shiftHourCells,
  tzOffsetHours,
} from '@/lib/streamer-insights';

function subscribe(): () => void {
  return () => {};
}

function Bars({
  cells,
  labels,
  ariaLabel,
  minSamples,
}: {
  cells: InsightsMedianCell[];
  labels: string[];
  ariaLabel: string;
  minSamples: number;
}) {
  const max = Math.max(1, ...cells.map((c) => (c.median !== null ? c.median : 0)));
  return (
    <div>
      <div className="flex h-28 items-end gap-1" role="img" aria-label={ariaLabel}>
        {cells.map((c, i) => {
          const thin = c.median !== null && c.samples < minSamples;
          return (
            <div
              key={i}
              className="relative flex h-full flex-1 items-end"
              title={
                c.median !== null
                  ? `${labels[i]} · median ${Math.round(c.median)} viewers (${c.samples} samples)`
                  : `${labels[i]} · no data`
              }
            >
              {c.median !== null ? (
                <div
                  aria-hidden="true"
                  className={`mx-auto w-4/5 rounded-t-[3px] ${
                    thin ? 'bg-accent-cyan/30' : 'bg-accent-cyan/80'
                  }`}
                  style={{
                    height: `${Math.max(4, Math.round((c.median / max) * 100))}%`,
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
            />
          </div>
        </div>
      )}
    </div>
  );
}
