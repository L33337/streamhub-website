'use client';

// "When is {game} streamed?" weekday×hour heatmap (game-hub UX round
// 2026-07-23). Sequential single-hue encoding (accent cyan over the dark
// surface, sqrt intensity — see lib/game-heatmap.ts), 2px cell gaps, per-cell
// native tooltips, a Less→More legend and a text summary so the insight never
// depends on color alone. SSR renders the deterministic UTC frame; after
// hydration the grid shifts into the viewer's timezone (same
// useSyncExternalStore pattern as SlotStatusText/NextStreamTime).

import { useMemo, useSyncExternalStore } from 'react';
import {
  HEATMAP_DAY_LABELS,
  buildHeatmapView,
  heatmapIntensity,
  localUtcOffsetHours,
  peakBandLabel,
} from '@/lib/game-heatmap';

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
}: {
  category: string;
  /** 168 minutes-per-cell values, UTC frame, weekday 0 = Monday. */
  histogram: number[];
}) {
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
  const peak = peakBandLabel(view);

  return (
    <div>
      <p className="mt-1 text-sm text-text-secondary" suppressHydrationWarning>
        {peak ? (
          <>
            Most {category} streams run on{' '}
            <span className="font-semibold text-text-primary">{peak}</span>
            {isLocal ? ' (your local time)' : ' (UTC)'} — based on the last 4
            weeks of tracked broadcasts.
          </>
        ) : (
          <>Based on the last 4 weeks of tracked broadcasts.</>
        )}
      </p>
      <div className="mt-4 overflow-x-auto">
        <div
          className="min-w-[560px]"
          role="img"
          aria-label={
            peak
              ? `Weekly streaming heatmap for ${category}. Busiest window: ${peak}.`
              : `Weekly streaming heatmap for ${category}.`
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
                {HEATMAP_DAY_LABELS[day]}
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
                    title={`${HEATMAP_DAY_LABELS[day]} ${String(hour).padStart(2, '0')}:00–${String((hour + 1) % 24).padStart(2, '0')}:00 · ${
                      minutes >= 60
                        ? `${(minutes / 60).toFixed(1)}h`
                        : `${Math.round(minutes)}min`
                    } streamed in 4 weeks`}
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
            <span className="mr-1">Less</span>
            <span className="h-3 w-3 rounded-[2px] bg-white/[0.04]" />
            {LEGEND_STEPS.map((t) => (
              <span
                key={t}
                className="h-3 w-3 rounded-[2px]"
                style={{ backgroundColor: `rgba(${CYAN}, ${0.08 + 0.84 * t})` }}
              />
            ))}
            <span className="ml-1">More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
