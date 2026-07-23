'use client';

import { useEffect, useState } from 'react';
import type { PublicStreamSlot } from '@/lib/server/partner-api';
import { resolveUiLang } from '@/lib/i18n-core';
import { slotLexFor } from '@/lib/i18n-slot';
import { utcDateShortLabel } from '@/lib/format/time';

interface Props {
  days: string[];
  grouped: Map<string, PublicStreamSlot[]>;
  todayUtc: string;
  /** Localizes day labels/counts/aria; default 'en' keeps the game-page caller byte-identical. */
  language?: string;
}

// Client component since the game-hub UX round (2026-07-23): a scroll-spy
// (IntersectionObserver over the #day-<date> sections) highlights the day the
// viewer is currently reading. SSR output is unchanged — no day is active
// until the observer fires, so hydration stays clean.

export function DayNavBar({ days, grouped, todayUtc, language = 'en' }: Props) {
  const L = slotLexFor(language);
  const lang = resolveUiLang(language);
  const [activeDay, setActiveDay] = useState<string | null>(null);

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

  return (
    <nav
      aria-label={L.jumpToDayAria}
      className="sticky top-[var(--header-height)] z-10 -mx-4 mt-8 mb-2 border-b border-divider bg-background/95 px-4 py-3 backdrop-blur"
    >
      <ul className="flex gap-2 overflow-x-auto" role="list">
        {days.map((dateKey) => {
          const count = grouped.get(dateKey)?.length ?? 0;
          const label = utcDateShortLabel(dateKey, todayUtc, lang);
          const disabled = count === 0;
          const dayNum = new Date(dateKey + 'T00:00:00Z').getUTCDate();
          if (disabled) {
            return (
              <li key={dateKey}>
                <span
                  className="inline-flex flex-col items-center rounded-lg border border-border-default/40 bg-background-elevated/40 px-3 py-1.5 text-xs text-text-muted opacity-50"
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
                className={`inline-flex flex-col items-center rounded-lg border px-3 py-1.5 text-xs transition-colors hover:border-accent-cyan/60 hover:bg-background-highlight ${
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
                  {L.nStreams(count)}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
