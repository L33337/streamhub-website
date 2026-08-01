'use client';

// M24 "Best time to stream {game}" heatmap with an Opportunity / Viewers /
// Competition mode switcher. Same island pattern as StreamTimesHeatmap: SSR
// renders the deterministic UTC frame, after hydration the grid shifts into
// the viewer's timezone (useSyncExternalStore). Cells with no data (observed
// on < 2 distinct days) render visually distinct from "low" — dotted outline
// instead of a fill — because a sampling gap is NOT "nobody watches then".
//
// Cell values surface two ways: native `title` tooltips (desktop hover) AND a
// tap-to-select detail line under the grid — touch devices have no hover, so
// without the detail line phones could see the colors but never the numbers.
// The best-opportunity cell starts selected (ring), which also answers "where
// IS that window?" without hunting for the hottest cell.

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { localUtcOffsetHours } from '@/lib/game-heatmap';
import { formatStatValue } from '@/lib/format/number';
import { useHScrollFade } from '@/lib/use-h-scroll-fade';
import {
  TIMING_DAY_LABELS,
  TIMING_DAY_NAMES,
  buildOpportunityView,
  cellValueForMode,
  formatSlotLabel,
  timingCellColor,
  timingGoodness,
  type TimingMode,
} from '@/lib/game-timing';

function subscribe(): () => void {
  return () => {};
}

// One semantic scale for every mode: the heat ramp — cold violet = bad hour
// for a streamer, glowing gold = prime time. Competition inverts its raw
// values inside timingGoodness (fewer live channels = hotter), so the glow
// ALWAYS reads "favorable for you" and the legend never flips direction
// between modes.
const MODE_META: Record<TimingMode, { label: string; legend: string }> = {
  opportunity: {
    label: 'Opportunity',
    legend: 'viewers per live channel — the brighter the glow, the better your shot at getting discovered',
  },
  viewers: {
    label: 'Viewers',
    legend: 'average concurrent viewers — gold = everyone’s watching, dark = quiet hours',
  },
  streamers: {
    label: 'Competition',
    legend: 'average live channels — gold = the field is clear, dark = crowded',
  },
};

const HOUR_TICKS = new Set([0, 6, 12, 18]);
// Goodness steps for the legend swatches, cold (violet) → glowing (gold).
const LEGEND_STEPS = [0, 0.25, 0.5, 0.75, 1];
const MODES: TimingMode[] = ['opportunity', 'viewers', 'streamers'];
// Grid geometry shared by render + initial-scroll math: the day-label column
// is 2.25rem = 36px, cells split the rest evenly.
const DAY_LABEL_PX = 36;

function formatCellValue(value: number, mode: TimingMode): string {
  if (mode === 'streamers') return `${formatStatValue(value)} live channels`;
  if (mode === 'viewers') return `${formatStatValue(value)} avg viewers`;
  return `${formatStatValue(value)} viewers per channel`;
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
  // null = follow the best-opportunity cell (default selection).
  const [picked, setPicked] = useState<{ day: number; hour: number } | null>(null);

  const view = useMemo(
    () => buildOpportunityView(viewersHistogram, streamersHistogram, daysHistogram, shift),
    [viewersHistogram, streamersHistogram, daysHistogram, shift],
  );
  const meta = MODE_META[mode];
  const top = view.topSlots[0] ?? null;

  // Effective selection: user pick wins; otherwise the best cell. Both live
  // in the SHIFTED frame, so a pick stays on the same wall-clock cell.
  const selected = picked ?? (top ? { day: top.dow, hour: top.hour } : null);
  const selectedCell = selected ? view.grid[selected.day]?.[selected.hour] ?? null : null;

  const { ref: scrollRef, fade } = useHScrollFade<HTMLDivElement>();

  // Initial scroll: when the grid overflows (phones), start centered on the
  // best window instead of hour 0 — otherwise the evening hours, where most
  // best slots live, are invisible and nothing hints that they exist.
  const didInitialScroll = useRef(false);
  useEffect(() => {
    // Wait for the post-hydration re-render (isLocal flips true) — before it,
    // `top` is still the UTC-frame slot and we would center the wrong hour.
    if (!isLocal) return;
    const el = scrollRef.current;
    if (!el || didInitialScroll.current || !top) return;
    didInitialScroll.current = true;
    if (el.scrollWidth <= el.clientWidth + 8) return;
    const cellW = (el.scrollWidth - DAY_LABEL_PX) / 24;
    const target = DAY_LABEL_PX + (top.hour + 0.5) * cellW - el.clientWidth / 2;
    el.scrollLeft = Math.max(0, Math.min(target, el.scrollWidth - el.clientWidth));
  }, [isLocal, scrollRef, top]);

  return (
    <div>
      <p className="mt-1 text-sm text-text-secondary" suppressHydrationWarning>
        {top ? (
          <>
            The best opportunity window is{' '}
            <span className="font-semibold text-text-primary">
              {formatSlotLabel(top.dow, top.hour)}
            </span>
            {isLocal ? ' (your local time)' : ' (UTC)'} — ~{formatStatValue(top.viewers)}{' '}
            viewers spread across ~{formatStatValue(top.streamers)} live{' '}
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

      <div className="relative mt-3">
        <div ref={scrollRef} className="overflow-x-auto">
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
              <div className="sticky left-0 z-[1] bg-background" />
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
                {/* Sticky day labels: the initial scroll centers the best
                    window, so without them phones would see cells with no way
                    to tell which row is which day. */}
                <div className="sticky left-0 z-[1] flex items-center bg-background pr-1 text-[10px] leading-none text-text-muted">
                  {TIMING_DAY_LABELS[day]}
                </div>
                {row.map((cell, hour) => {
                  const value = cellValueForMode(cell, mode);
                  const noData = value === null;
                  const goodness = timingGoodness(value, view.scale[mode], mode);
                  const isSelected = selected?.day === day && selected?.hour === hour;
                  return (
                    <div
                      key={hour}
                      onClick={() => setPicked({ day, hour })}
                      className={`h-4 cursor-pointer rounded-[2px] ${
                        noData
                          ? 'border border-dashed border-white/10'
                          : goodness === null
                            ? 'bg-white/[0.06]'
                            : ''
                      } ${isSelected ? 'ring-1 ring-white/90' : ''}`}
                      style={{
                        touchAction: 'manipulation',
                        ...(!noData && goodness !== null
                          ? { backgroundColor: timingCellColor(goodness) }
                          : {}),
                      }}
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
          </div>
        </div>
        {/* Right edge-fade only: scroll affordance for phones (grid min-width
            560px). No left fade — the sticky day-label column IS the left
            context and a fade would just dim it. */}
        {fade.right && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent"
          />
        )}
      </div>

      {/* Legend — OUTSIDE the scroll container so it never scrolls half
          off-screen with the grid. */}
      <div
        className="mt-3 flex flex-wrap items-center gap-1 text-[10px] text-text-muted"
        aria-hidden="true"
      >
        <span className="mr-1">Cold</span>
        {LEGEND_STEPS.map((g) => (
          <span
            key={g}
            className="h-3 w-3 rounded-[2px]"
            style={{ backgroundColor: timingCellColor(g) }}
          />
        ))}
        <span className="ml-1 mr-3">Prime time</span>
        <span className="h-3 w-3 rounded-[2px] border border-dashed border-white/10" />
        <span className="ml-1">No data</span>
      </div>

      {/* Detail line for the selected cell — the only way touch users can
          read exact values. Defaults to the best-opportunity window. */}
      {selected && selectedCell && (
        <p className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-border-default bg-background-elevated px-3 py-2 text-xs text-text-secondary">
          <span className="font-semibold text-text-primary">
            {`${TIMING_DAY_NAMES[selected.day]} ${String(selected.hour).padStart(2, '0')}:00–${String((selected.hour + 1) % 24).padStart(2, '0')}:00`}
          </span>
          {selectedCell.score !== null ? (
            <span>
              {/* Template literal — adjacent JSX text nodes drop spaces. */}
              {`~${formatStatValue(selectedCell.score)} viewers/channel`}
            </span>
          ) : null}
          {selectedCell.viewers !== null ? (
            <span>{`~${formatStatValue(selectedCell.viewers)} viewers`}</span>
          ) : null}
          {selectedCell.streamers !== null ? (
            <span>{`~${formatStatValue(selectedCell.streamers)} live channels`}</span>
          ) : null}
          {selectedCell.days >= 2 ? (
            <span className="text-text-muted">{`${selectedCell.days} observed days`}</span>
          ) : (
            <span className="text-text-muted">not enough data yet</span>
          )}
          {picked === null && (
            <span className="text-text-muted">· best window — tap any cell for details</span>
          )}
        </p>
      )}
    </div>
  );
}
