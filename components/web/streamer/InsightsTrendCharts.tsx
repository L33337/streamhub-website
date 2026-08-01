'use client';

// 2026-08-01 insights expansion: two trend charts for the streamer insights
// page.
//
// MonthlyTrendChart — median-CCV columns per calendar month with the sampled
// peak as a second, lighter marker (one axis, one unit: viewers). Streams
// per month ride as a muted count row under the axis labels; full numbers
// live in the tooltip. The running month and pre-tracking months render
// faded — a partial month must not read as a slump (or a spike).
//
// FollowerGrowthChart — single-series SVG line (2px, area wash, end dot with
// a surface ring) over the daily follower snapshots, with a nearest-point
// hover/tap tooltip. Single series → no legend box (the section title names
// it); the y baseline is the series min (a follower count on a zero axis
// would be a flat line), made explicit by the min/max tick labels.

import { useMemo, useRef, useState } from 'react';
import type {
  InsightsFollowerPoint,
  InsightsMonthlyTrendEntry,
} from '@/lib/server/partner-api';
import { formatCompactNumber, formatStatValue } from '@/lib/format/number';
import {
  usableMonthlyTrend,
  type MonthlyTrendView,
} from '@/lib/streamer-insights';

// Bars top out below 100% so cap labels fit inside the fixed-height row
// (same convention as InsightsCharts).
const MAX_BAR_PCT = 80;

function trendTooltip(m: MonthlyTrendView): string {
  const parts = [m.longLabel];
  if (m.median !== null) parts.push(`median ${formatStatValue(m.median)} viewers`);
  if (m.peak !== null) parts.push(`peak ${formatStatValue(m.peak)}`);
  parts.push(`${m.streams} stream${m.streams === 1 ? '' : 's'}`);
  parts.push(`${formatStatValue(m.hours)} h live`);
  if (m.isCurrent) parts.push('month still running');
  if (m.isPreTracking) parts.push('before tracking started — partial');
  return parts.join(' · ');
}

export function MonthlyTrendChart({
  trend,
  trackedSince,
}: {
  trend: InsightsMonthlyTrendEntry[] | null;
  trackedSince: string | null;
}) {
  const months = useMemo(
    () => usableMonthlyTrend(trend, trackedSince),
    [trend, trackedSince],
  );
  if (!months) return null;

  // Scale on medians; peaks join the scale only up to 3× the median max — a
  // single raid/event spike (real prod case: 137K peak over a 9K median)
  // must not flatten every bar. Peaks beyond the cap pin to the top edge;
  // the tooltip carries the true number.
  const maxMedian = Math.max(1, ...months.map((m) => m.median ?? 0));
  const maxPeak = Math.max(0, ...months.map((m) => m.peak ?? 0));
  const max = Math.max(maxMedian, Math.min(maxPeak, 3 * maxMedian));
  const heightPct = (v: number) =>
    Math.max(4, Math.min(MAX_BAR_PCT + 8, Math.round((v / max) * MAX_BAR_PCT)));
  const hasFaded = months.some((m) => m.isCurrent || m.isPreTracking);

  return (
    <div>
      <div
        className="flex h-36 items-end gap-2 sm:gap-3"
        role="img"
        aria-label="Median and peak concurrent viewers per month"
      >
        {months.map((m) => {
          const faded = m.isCurrent || m.isPreTracking;
          // When the peak marker sits within label height of the bar cap,
          // the value label moves above the dot instead of colliding with it.
          const barPct = m.median !== null ? heightPct(m.median) : 0;
          const peakPct = m.peak !== null ? heightPct(m.peak) : null;
          const labelBottom =
            peakPct !== null && peakPct - barPct < 10
              ? `calc(${peakPct}% + 10px)`
              : `calc(${barPct}% + 4px)`;
          return (
            <div
              key={m.month}
              className="relative flex h-full flex-1 items-end justify-center"
              title={trendTooltip(m)}
            >
              {m.median !== null ? (
                <>
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-[-6px] z-10 text-center text-[10px] leading-none text-text-muted"
                    style={{ bottom: labelBottom }}
                  >
                    {formatStatValue(m.median)}
                  </span>
                  {m.peak !== null && m.peak > m.median && (
                    <span
                      aria-hidden="true"
                      className={`absolute left-1/2 z-10 h-2 w-2 -translate-x-1/2 rounded-full bg-accent-cyan/45 ring-2 ring-background ${
                        faded ? 'opacity-40' : ''
                      }`}
                      style={{ bottom: `${heightPct(m.peak)}%` }}
                    />
                  )}
                  <div
                    aria-hidden="true"
                    className={`w-full max-w-6 rounded-t-[4px] bg-accent-cyan ${
                      faded ? 'opacity-40' : ''
                    }`}
                    style={{ height: `${heightPct(m.median)}%` }}
                  />
                </>
              ) : (
                <div
                  aria-hidden="true"
                  className="mb-0 h-1.5 w-full max-w-6 rounded-t-[3px] border border-dashed border-white/15"
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-2 sm:gap-3" aria-hidden="true">
        {months.map((m) => (
          <div key={m.month} className="flex-1 text-center leading-tight">
            <span className="block text-[10px] text-text-muted">
              {m.label}
              {m.isCurrent ? '*' : ''}
            </span>
            <span className="block text-[10px] text-text-muted/70">
              {m.streams > 0 ? `${m.streams}×` : '—'}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-text-muted">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-accent-cyan" />
          median viewers
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-accent-cyan/45" />
          sampled peak
        </span>
        <span>&times; = streams that month</span>
        {hasFaded && <span>faded = partial month</span>}
      </div>
    </div>
  );
}

// ============================================
// Follower growth
// ============================================

const W = 640;
const H = 150;
const PAD_X = 4;
const PAD_TOP = 12;
const PAD_BOTTOM = 6;

interface FollowerChartPoint extends InsightsFollowerPoint {
  x: number;
  y: number;
}

function formatDay(date: string): string {
  const t = formatTrendMonthDay(date);
  return t ?? date;
}

function formatTrendMonthDay(date: string): string | null {
  const m = Number(date.slice(5, 7));
  const d = Number(date.slice(8, 10));
  const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (!Number.isFinite(m) || m < 1 || m > 12 || !Number.isFinite(d)) return null;
  return `${SHORT[m - 1]} ${d}`;
}

export function FollowerGrowthChart({ points }: { points: InsightsFollowerPoint[] }) {
  const [active, setActive] = useState<FollowerChartPoint | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const view = useMemo(() => {
    if (points.length < 2) return null;
    const t0 = Date.parse(`${points[0].date}T00:00:00Z`);
    const t1 = Date.parse(`${points[points.length - 1].date}T00:00:00Z`);
    const span = Math.max(1, t1 - t0);
    const counts = points.map((p) => p.count);
    const min = Math.min(...counts);
    const max = Math.max(...counts);
    const range = Math.max(1, max - min);
    const mapped: FollowerChartPoint[] = points.map((p) => ({
      ...p,
      x:
        PAD_X +
        ((Date.parse(`${p.date}T00:00:00Z`) - t0) / span) * (W - 2 * PAD_X),
      y:
        PAD_TOP +
        (1 - (p.count - min) / range) * (H - PAD_TOP - PAD_BOTTOM),
    }));
    const line = mapped.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const area = `${line} L${mapped[mapped.length - 1].x.toFixed(1)},${H} L${mapped[0].x.toFixed(1)},${H} Z`;
    return { mapped, line, area, min, max };
  }, [points]);

  if (!view) return null;
  const last = view.mapped[view.mapped.length - 1];

  const pick = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * W;
    let nearest = view.mapped[0];
    for (const p of view.mapped) {
      if (Math.abs(p.x - x) < Math.abs(nearest.x - x)) nearest = p;
    }
    setActive(nearest);
  };

  return (
    <div className="relative">
      <div className="flex items-baseline justify-between text-[10px] text-text-muted" aria-hidden="true">
        <span>{formatCompactNumber(view.max)}</span>
        <span className="font-semibold text-text-secondary">
          {formatCompactNumber(last.count)} now
        </span>
      </div>
      {/* Dots live as HTML overlays in % coordinates: the SVG is stretched
          (preserveAspectRatio none), which would squash circles into
          ellipses. */}
      <div className="relative mt-1">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="block h-36 w-full text-accent-cyan"
          role="img"
          aria-label={`Follower count from ${formatDay(points[0].date)} to ${formatDay(last.date)}`}
          preserveAspectRatio="none"
          onMouseMove={(e) => pick(e.clientX)}
          onMouseLeave={() => setActive(null)}
          onTouchStart={(e) => pick(e.touches[0]?.clientX ?? 0)}
          onTouchMove={(e) => pick(e.touches[0]?.clientX ?? 0)}
        >
          <path d={view.area} fill="currentColor" opacity={0.1} />
          <path
            d={view.line}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {active && active !== last && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-cyan ring-2 ring-background"
            style={{ left: `${(active.x / W) * 100}%`, top: `${(active.y / H) * 100}%` }}
          />
        )}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-cyan ring-2 ring-background"
          style={{ left: `${(last.x / W) * 100}%`, top: `${(last.y / H) * 100}%` }}
        />
      </div>
      <div className="flex items-baseline justify-between text-[10px] text-text-muted" aria-hidden="true">
        <span>{formatDay(points[0].date)}</span>
        <span>{formatCompactNumber(view.min)} low</span>
        <span>{formatDay(last.date)}</span>
      </div>
      {active && (
        <div
          className="pointer-events-none absolute top-6 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-border-default bg-background-elevated px-2 py-1 text-[11px] text-text-primary shadow-lg"
          style={{
            left: `clamp(60px, ${(active.x / W) * 100}%, calc(100% - 60px))`,
          }}
        >
          {formatDay(active.date)} · {active.count.toLocaleString('en-US')} followers
        </div>
      )}
    </div>
  );
}
