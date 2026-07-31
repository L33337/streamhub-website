// M24 "How long should you stream?" bar row — median concurrent viewers by
// hour into the stream. Hour-into-stream is timezone-free, so this is a plain
// server component (no island). Bars with a null median (below the sample
// threshold) render as dashed placeholders, visually distinct from "low".
//
// `secondary` draws a comparison series behind the primary bars (insights
// page: streamer vs their main category).

import { RAMP_CELLS, rampBarLabel } from '@/lib/game-timing';

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
  const heightPct = (v: number) => Math.max(4, Math.round((v / max) * 100));

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
          return (
            <div
              key={i}
              className="relative flex h-full flex-1 items-end"
              title={
                p !== null
                  ? `${rampBarLabel(i)} · ${Math.round(p)} median viewers${
                      s !== null ? ` (${secondaryLabel ?? 'category'}: ${Math.round(s)})` : ''
                    }`
                  : `${rampBarLabel(i)} · not enough data`
              }
            >
              {s !== null && (
                <div
                  aria-hidden="true"
                  className="absolute bottom-0 left-0 right-0 rounded-t-[3px] bg-white/10"
                  style={{ height: `${heightPct(s)}%` }}
                />
              )}
              {p !== null ? (
                <div
                  aria-hidden="true"
                  className="relative z-10 mx-auto w-3/5 rounded-t-[3px] bg-accent-cyan/80"
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
            <span className="h-2.5 w-2.5 rounded-[2px] bg-accent-cyan/80" /> {primaryLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-white/10" />{' '}
            {secondaryLabel ?? 'Category'}
          </span>
        </p>
      )}
    </div>
  );
}
