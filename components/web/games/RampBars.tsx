// M24 "How long should you stream?" bar row — median concurrent viewers by
// hour into the stream. Hour-into-stream is timezone-free, so this is a plain
// server component (no island). Bars with a null median (below the sample
// threshold) render as dashed placeholders, visually distinct from "low".
//
// `secondary` draws a comparison series behind the primary bars (insights
// page: streamer vs their main category). The peak bar is highlighted and
// carries a value label — without at least one number the chart shows a shape
// but answers nothing (and touch users can't reach the title tooltips).
//
// Colors (2026-08-01 redesign): primary = viz violet with the peak in
// viz-bright — identity charts speak violet, cyan stays site chrome. The
// secondary backdrop is viz-benchmark (desaturated slate) at 55%: the old
// white/10 sat at 1.35:1 against the page and was effectively invisible,
// which killed the chart's whole point ("compared with the category").

import { RAMP_CELLS, rampBarLabel } from '@/lib/game-timing';
import { formatStatValue } from '@/lib/format/number';

// Bars top out below 100% so the peak value label fits INSIDE the fixed-height
// chart row instead of clipping at its top edge.
const MAX_BAR_PCT = 86;

export function RampBars({
  primary,
  primaryLabel,
  secondary,
  secondaryLabel,
}: {
  primary: (number | null)[];
  primaryLabel: string;
  secondary?: (number | null)[] | null;
  secondaryLabel?: string;
}) {
  const max = Math.max(
    1,
    ...primary.filter((v): v is number => v !== null),
    ...(secondary ?? []).filter((v): v is number => v !== null),
  );
  const heightPct = (v: number) => Math.max(4, Math.round((v / max) * MAX_BAR_PCT));

  let peakIdx = -1;
  let peak = -1;
  primary.forEach((v, i) => {
    if (v !== null && v > peak) {
      peak = v;
      peakIdx = i;
    }
  });

  return (
    <div>
      <div
        className="flex h-32 items-end gap-1 sm:gap-1.5"
        role="img"
        aria-label={`Median viewers by hour into the stream (${primaryLabel})`}
      >
        {Array.from({ length: RAMP_CELLS }, (_, i) => {
          const p = primary[i] ?? null;
          const s = secondary?.[i] ?? null;
          const isPeak = i === peakIdx;
          return (
            <div
              key={i}
              className="relative flex h-full flex-1 items-end"
              title={
                p !== null
                  ? `${rampBarLabel(i)} · ${formatStatValue(p)} median viewers${
                      s !== null ? ` (${secondaryLabel ?? 'category'}: ${formatStatValue(s)})` : ''
                    }`
                  : `${rampBarLabel(i)} · not enough data`
              }
            >
              {p !== null && isPeak && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-[-6px] z-20 text-center text-[10px] font-semibold leading-none text-text-primary"
                  style={{ bottom: `calc(${heightPct(p)}% + 3px)` }}
                >
                  {formatStatValue(p)}
                </span>
              )}
              {s !== null && (
                <div
                  aria-hidden="true"
                  className="absolute bottom-0 left-0 right-0 rounded-t-[3px] bg-viz-benchmark/55"
                  style={{ height: `${heightPct(s)}%` }}
                />
              )}
              {p !== null ? (
                <div
                  aria-hidden="true"
                  className={`relative z-10 mx-auto w-3/5 rounded-t-[3px] ${
                    isPeak ? 'bg-viz-bright' : 'bg-viz'
                  }`}
                  style={{ height: `${heightPct(p)}%` }}
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="relative z-10 mx-auto h-2 w-3/5 rounded-t-[3px] border border-dashed border-white/15"
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-1 text-[10px] leading-none text-text-muted sm:gap-1.5" aria-hidden="true">
        {Array.from({ length: RAMP_CELLS }, (_, i) => (
          <div key={i} className="flex-1 text-center">
            {i % 2 === 0 || i === RAMP_CELLS - 1 ? rampBarLabel(i) : ''}
          </div>
        ))}
      </div>
      {secondary && (
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-viz" /> {primaryLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-viz-benchmark/55" />{' '}
            {secondaryLabel ?? 'Category'}
          </span>
        </p>
      )}
    </div>
  );
}
