'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import type { DayCount } from '@/lib/day-counts';
import { resolveUiLang } from '@/lib/i18n-core';
import { slotLexFor } from '@/lib/i18n-slot';
import { localDateKey, utcDateShortLabel } from '@/lib/format/time';

interface Props {
  days: string[];
  /** Per-day counts keyed by UTC date — build with `toDayCounts` on the server. */
  counts: Record<string, DayCount>;
  todayUtc: string;
  /** Localizes day labels/counts/aria; default 'en' keeps the game-page caller byte-identical. */
  language?: string;
  /**
   * Game-hub UX round (2026-09-24): one-line pills below `sm` ("Today · 22"),
   * the two-line pill from `sm` up. The sticky zone on a phone shrank from
   * 139px (header + two-line nav) towards ~115px. Default false keeps the
   * streamer page's markup byte-identical.
   */
  dense?: boolean;
}

// Client component since the game-hub UX round (2026-07-23): a scroll-spy
// (IntersectionObserver over the #day-<date> sections) highlights the day the
// viewer is currently reading. SSR output is unchanged — no day is active
// until the observer fires, so hydration stays clean.

function subscribeToNothing(): () => void {
  // Intl does not notify on timezone changes; read once at hydration.
  return () => {};
}

export function DayNavBar({ days, counts, todayUtc, language = 'en', dense = false }: Props) {
  const L = slotLexFor(language);
  const lang = resolveUiLang(language);
  const [activeDay, setActiveDay] = useState<string | null>(null);
  // Which day counts as "Today" is the VIEWER's calendar date, not the
  // server's UTC one: between local midnight and UTC midnight those differ,
  // and the pills used to say "Tomorrow" for the day the reader's own phone
  // called today. `todayUtc` stays the SSR snapshot so the prerendered HTML
  // is deterministic and hydration does not mismatch.
  const referenceToday = useSyncExternalStore(
    subscribeToNothing,
    localDateKey,
    () => todayUtc,
  );

  useEffect(() => {
    const sections = days
      .map((d) => document.getElementById(`day-${d}`))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0 || typeof IntersectionObserver === 'undefined') return;
    // Thin observation band in the upper third of the viewport: whichever day
    // section spans it is the one being read. With tall sections at most two
    // ever intersect; the first in DOM order is the topmost one.
    const intersecting = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const day = entry.target.id.replace(/^day-/, '');
          if (entry.isIntersecting) intersecting.add(day);
          else intersecting.delete(day);
        }
        const first = days.find((d) => intersecting.has(d));
        if (first) setActiveDay(first);
      },
      { rootMargin: '-25% 0px -65% 0px', threshold: 0 },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [days]);

  if (dense) {
    return (
      <nav
        aria-label={L.jumpToDayAria}
        className="sticky top-[var(--header-height)] z-10 -mx-4 mt-6 mb-2 border-b border-divider bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:py-3"
      >
        <ul
          className="flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="list"
        >
          {days.map((dateKey) => {
            const day = counts[dateKey] ?? { total: 0, active: 0 };
            const count = day.active;
            const label = utcDateShortLabel(dateKey, referenceToday, lang);
            const pill =
              'inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs sm:flex-col sm:justify-center sm:gap-0';
            if (day.total === 0) {
              return (
                <li key={dateKey}>
                  <span
                    className={`${pill} border-border-default/40 bg-background-elevated/40 text-text-muted opacity-50`}
                    aria-disabled="true"
                    aria-label={`${label}: ${L.noStreamsExpected}`}
                  >
                    <span className="font-semibold">{label}</span>
                    <span aria-hidden="true" className="sm:text-[10px]">
                      –
                    </span>
                  </span>
                </li>
              );
            }
            const isActive = dateKey === activeDay;
            return (
              <li key={dateKey}>
                <a
                  href={`#day-${dateKey}`}
                  aria-current={isActive ? 'true' : undefined}
                  aria-label={`${label}: ${count === 0 ? L.noStreamsExpected : L.nStreams(count)}`}
                  className={`${pill} transition-colors hover:border-accent-cyan/60 hover:bg-background-highlight ${
                    isActive
                      ? 'border-accent-cyan/70 bg-background-highlight'
                      : 'border-border-default bg-background-elevated'
                  }`}
                >
                  <span
                    className={`font-semibold ${isActive ? 'text-accent-cyan' : 'text-text-primary'}`}
                  >
                    {label}
                  </span>
                  <span aria-hidden="true" className="tabular-nums text-accent-cyan sm:hidden">
                    {count === 0 ? <span className="text-text-muted">–</span> : count}
                  </span>
                  <span aria-hidden="true" className="hidden text-[10px] text-accent-cyan sm:inline">
                    {count === 0 ? <span className="text-text-muted">–</span> : L.nStreams(count)}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <nav
      aria-label={L.jumpToDayAria}
      className="sticky top-[var(--header-height)] z-10 -mx-4 mt-8 mb-2 border-b border-divider bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <ul
        className="flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="list"
      >
        {days.map((dateKey) => {
          const day = counts[dateKey] ?? { total: 0, active: 0 };
          // A cancelled slot is a stream that is NOT happening — counting it as
          // "1 stream" made quiet days look busy.
          const count = day.active;
          const label = utcDateShortLabel(dateKey, referenceToday, lang);
          // Still linkable when the only entries are cancellations: the day
          // section exists and says something worth reading.
          const disabled = day.total === 0;
          const dayNum = new Date(dateKey + 'T00:00:00Z').getUTCDate();
          if (disabled) {
            return (
              <li key={dateKey}>
                <span
                  className="inline-flex min-h-11 flex-col items-center justify-center rounded-lg border border-border-default/40 bg-background-elevated/40 px-3 py-1.5 text-xs text-text-muted opacity-50"
                  aria-disabled="true"
                >
                  <span className="font-semibold">{label}</span>
                  <span className="text-[10px]">{dayNum}</span>
                </span>
              </li>
            );
          }
          const isActive = dateKey === activeDay;
          return (
            <li key={dateKey}>
              <a
                href={`#day-${dateKey}`}
                aria-current={isActive ? 'true' : undefined}
                aria-label={count === 0 ? `${label}: ${L.noStreamsExpected}` : undefined}
                className={`inline-flex min-h-11 flex-col items-center justify-center rounded-lg border px-3 py-1.5 text-xs transition-colors hover:border-accent-cyan/60 hover:bg-background-highlight ${
                  isActive
                    ? 'border-accent-cyan/70 bg-background-highlight'
                    : 'border-border-default bg-background-elevated'
                }`}
              >
                <span
                  className={`font-semibold ${isActive ? 'text-accent-cyan' : 'text-text-primary'}`}
                >
                  {label}
                </span>
                <span className="text-[10px] text-accent-cyan">
                  {count === 0 ? (
                    <span aria-hidden="true" className="text-text-muted">
                      –
                    </span>
                  ) : (
                    L.nStreams(count)
                  )}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
