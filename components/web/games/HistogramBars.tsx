// Phone layout of the game hub's "When is {game} streamed?" chart (UX round
// 2026-09-24). The 7x24 grid needs ~560px and scrolled sideways on phones, so
// below `sm` the same histogram is shown as two bar rows: minutes per weekday
// and minutes per hour of day. Cyan like the grid on purpose: this chart says
// "how much", and the timing pages' violet→gold ramp means "how good" (AGENTS.md
// timing goodness scale).
//
// No 'use client': it renders inside the StreamTimesHeatmap island, which owns
// the timezone shift, and needs no state of its own. Decorative for assistive
// tech: the summary sentence above it carries the finding.

const CYAN = '0, 240, 255';

export function HistogramBars({
  values,
  labels,
  labelEvery = 1,
  caption,
}: {
  values: number[];
  /** One label per bar; every `labelEvery`-th is printed under the axis. */
  labels: readonly string[];
  labelEvery?: number;
  /** Small row caption above the bars ("By weekday"). */
  caption: string;
}) {
  const max = Math.max(0, ...values);
  const peakIndex = max > 0 ? values.indexOf(max) : -1;
  return (
    <figure className="mt-4" aria-hidden="true">
      <figcaption className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
        {caption}
      </figcaption>
      <div className="mt-2 flex h-20 items-end gap-[3px]">
        {values.map((v, i) => {
          // A non-empty bar never collapses to nothing (4 % floor), an empty
          // one shows as a hairline so the axis stays continuous.
          const pct = max > 0 && v > 0 ? Math.max(4, (v / max) * 100) : 0;
          return (
            <div key={i} className="flex h-full min-w-0 flex-1 items-end">
              <div
                className={`w-full rounded-t-[2px] ${pct === 0 ? 'h-px bg-white/10' : ''}`}
                style={
                  pct > 0
                    ? {
                        height: `${pct}%`,
                        backgroundColor: `rgba(${CYAN}, ${i === peakIndex ? 0.92 : 0.4})`,
                      }
                    : undefined
                }
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-[3px]">
        {labels.map((label, i) => (
          <div
            key={i}
            className="min-w-0 flex-1 overflow-visible whitespace-nowrap text-center text-[10px] leading-none text-text-muted"
          >
            {i % labelEvery === 0 ? label : ''}
          </div>
        ))}
      </div>
    </figure>
  );
}
