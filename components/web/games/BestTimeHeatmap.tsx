'use client';

// M24 "Best time to stream {game}" heatmap with an Opportunity / Viewers /
// Competition mode switcher. Same island pattern as StreamTimesHeatmap: SSR
// renders the deterministic UTC frame, after hydration the grid shifts into
// the viewer's timezone (useSyncExternalStore). Cells with no data (observed
// on < 2 distinct days) render visually distinct from "low" — dotted outline
// instead of a fill — because a sampling gap is NOT "nobody watches then".

import { useMemo, useState, useSyncExternalStore } from 'react';
import { localUtcOffsetHours } from '@/lib/game-heatmap';
import {
  TIMING_DAY_LABELS,
  buildOpportunityView,
  cellValueForMode,
  formatSlotLabel,
  timingIntensity,
  type TimingMode,
} from '@/lib/game-timing';

function subscribe(): () => void {
  return () => {};
}

// Mode hues over the dark surface: opportunity = cyan (brand), viewers =
// violet, competition = pink (more = harder, so the "hot" reading flips).
const MODE_META: Record<TimingMode, { label: string; rgb: string; legend: string }> = {
  opportunity: {
    label: 'Opportunity',
    rgb: '0, 240, 255',
    legend: 'viewers per live channel — brighter = better time to stream',
  },
  viewers: {
    label: 'Viewers',
    rgb: '167, 139, 250',
    legend: 'average concurrent viewers — brighter = more people watching',
  },
  streamers: {
    label: 'Competition',
    rgb: '244, 114, 182',
    legend: 'average live channels — brighter = more competition',
  },
};

const HOUR_TICKS = new Set([0, 6, 12, 18]);
const LEGEND_STEPS = [0.15, 0.4, 0.7, 1];
const MODES: TimingMode[] = ['opportunity', 'viewers', 'streamers'];

function formatCellValue(value: number, mode: TimingMode): string {
  if (mode === 'streamers') return `${Math.round(value * 10) / 10} live channels`;
  if (mode === 'viewers') return `${Math.round(value)} avg viewers`;
  return `${Math.round(value * 10) / 10} viewers per channel`;
}

export function BestTimeHeatmap({
  category,
  viewersHistogram,
  streamersHistogram,
  daysHistogram,
}: {
  category: string;
  viewersHistogram: (number | null)[];
  streamersHistogram: (number | null)[];
  daysHistogram: (number | null)[] | null;
}) {
  const shift = useSyncExternalStore(
    subscribe,
    () => localUtcOffsetHours(),
    () => 0,
  );
  const isLocal = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [mode, setMode] = useState<TimingMode>('opportunity');

  const view = useMemo(
    () => buildOpportunityView(viewersHistogram, streamersHistogram, daysHistogram, shift),
    [viewersHistogram, streamersHistogram, daysHistogram, shift],
  );
  const meta = MODE_META[mode];
  const top = view.topSlots[0] ?? null;

  return (
    <div>
      <p className="mt-1 text-sm text-text-secondary" suppressHydrationWarning>
        {top ? (
          <>
            The best opportunity window is{' '}
            <span className="font-semibold text-text-primary">
              {formatSlotLabel(top.dow, top.hour)}
            </span>
            {isLocal ? ' (your local time)' : ' (UTC)'} — ~{Math.round(top.viewers)} viewers
            spread across ~{Math.round(top.streamers * 10) / 10} live{' '}
            {top.streamers >= 1.95 ? 'channels' : 'channel'}.
          </>
        ) : (
          <>Based on hourly viewer samples of tracked {category} channels.</>
        )}
      </p>

      {/* Mode switcher — real buttons, 44px touch height on phones */}
      <div
        role="group"
        aria-label="Heatmap metric"
        className="mt-4 inline-flex flex-wrap gap-1 rounded-lg border border-border-default bg-background-elevated p-1"
      >
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            aria-pressed={mode === m}
            className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              mode === m
                ? 'bg-background-highlight text-text-primary'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {MODE_META[m].label}
          </button>
        ))}
      </div>
      <p className="mt-1 text-xs text-text-muted">{meta.legend}</p>

      <div className="mt-3 overflow-x-auto">
        <div
          className="min-w-[560px]"
          role="img"
          aria-label={
            top
              ? `Weekly ${meta.label.toLowerCase()} heatmap for ${category}. Best window: ${formatSlotLabel(top.dow, top.hour)}.`
              : `Weekly ${meta.label.toLowerCase()} heatmap for ${category}.`
          }
        >
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
                {TIMING_DAY_LABELS[day]}
              </div>
              {row.map((cell, hour) => {
                const value = cellValueForMode(cell, mode);
                const noData = value === null;
                const t = timingIntensity(value, view.max[mode]);
                return (
                  <div
                    key={hour}
                    className={`h-4 rounded-[2px] ${
                      noData
                        ? 'border border-dashed border-white/10'
                        : t === 0
                          ? 'bg-white/[0.06]'
                          : ''
                    }`}
                    style={
                      !noData && t > 0
                        ? { backgroundColor: `rgba(${meta.rgb}, ${0.08 + 0.84 * t})` }
                        : undefined
                    }
                    title={
                      noData
                        ? `${TIMING_DAY_LABELS[day]} ${String(hour).padStart(2, '0')}:00 · not enough data yet`
                        : `${TIMING_DAY_LABELS[day]} ${String(hour).padStart(2, '0')}:00–${String((hour + 1) % 24).padStart(2, '0')}:00 · ${formatCellValue(value, mode)}${cell.days >= 2 ? ` (${cell.days} observed ${cell.days === 1 ? 'day' : 'days'})` : ''}`
                    }
                  />
                );
              })}
            </div>
          ))}
          {/* Legend */}
          <div
            className="mt-3 flex flex-wrap items-center gap-1 text-[10px] text-text-muted"
            aria-hidden="true"
          >
            <span className="mr-1">Less</span>
            <span className="h-3 w-3 rounded-[2px] bg-white/[0.06]" />
            {LEGEND_STEPS.map((t) => (
              <span
                key={t}
                className="h-3 w-3 rounded-[2px]"
                style={{ backgroundColor: `rgba(${meta.rgb}, ${0.08 + 0.84 * t})` }}
              />
            ))}
            <span className="ml-1 mr-3">More</span>
            <span className="h-3 w-3 rounded-[2px] border border-dashed border-white/10" />
            <span className="ml-1">No data</span>
          </div>
        </div>
      </div>
    </div>
  );
}
