'use client';

// Filter bar for the game hub's schedule (UX round 2026-07-23). The schedule
// itself stays fully server-rendered (SEO + no duplicated flight payload for
// up to 200 slots) — this client wrapper receives it as `children` and applies
// filtering imperatively by toggling the `hidden` attribute on the
// data-slot/data-day/data-low-bucket markers rendered by GameDaySection.
// React never re-renders those server children, so the DOM mutations are safe.
//
// Known, accepted staleness under active filters: the DayNavBar's per-day
// counts and the day-heading counts keep describing the UNFILTERED schedule.

import { useEffect, useRef, useState } from 'react';

type PlatformFilter = 'all' | 'twitch' | 'youtube';

function chipClass(active: boolean): string {
  return `rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
    active
      ? 'border-accent-cyan/70 bg-background-highlight text-accent-cyan'
      : 'border-border-default bg-background-elevated text-text-secondary hover:border-accent-cyan/60 hover:text-text-primary'
  }`;
}

export function ScheduleFilters({
  platforms,
  hasLow,
  children,
}: {
  /** Platforms present in the schedule; the group renders only with ≥2. */
  platforms: string[];
  /** Whether any low-confidence slot exists (renders the hide toggle). */
  hasLow: boolean;
  children: React.ReactNode;
}) {
  const [platform, setPlatform] = useState<PlatformFilter>('all');
  const [hideLow, setHideLow] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    for (const li of root.querySelectorAll<HTMLElement>('li[data-slot]')) {
      const pf = li.getAttribute('data-pf') ?? '';
      const conf = li.getAttribute('data-conf');
      li.hidden =
        (platform !== 'all' && !pf.includes(platform)) ||
        (hideLow && conf === 'low');
    }
    for (const bucket of root.querySelectorAll<HTMLElement>('details[data-low-bucket]')) {
      const anyVisible = Array.from(
        bucket.querySelectorAll<HTMLElement>('li[data-slot]'),
      ).some((li) => !li.hidden);
      bucket.hidden = !anyVisible;
    }
    for (const day of root.querySelectorAll<HTMLElement>('section[data-day]')) {
      const anyVisible = Array.from(
        day.querySelectorAll<HTMLElement>('li[data-slot]'),
      ).some((li) => !li.hidden);
      day.hidden = !anyVisible;
    }
  }, [platform, hideLow]);

  const showPlatformGroup = platforms.length > 1;
  const showFilters = showPlatformGroup || hasLow;

  return (
    <div>
      {showFilters && (
        <div
          className="mt-3 flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Filter the schedule"
        >
          {showPlatformGroup && (
            <>
              <button
                type="button"
                aria-pressed={platform === 'all'}
                className={chipClass(platform === 'all')}
                onClick={() => setPlatform('all')}
              >
                All platforms
              </button>
              <button
                type="button"
                aria-pressed={platform === 'twitch'}
                className={chipClass(platform === 'twitch')}
                onClick={() => setPlatform('twitch')}
              >
                Twitch
              </button>
              <button
                type="button"
                aria-pressed={platform === 'youtube'}
                className={chipClass(platform === 'youtube')}
                onClick={() => setPlatform('youtube')}
              >
                YouTube
              </button>
            </>
          )}
          {hasLow && (
            <button
              type="button"
              aria-pressed={hideLow}
              className={chipClass(hideLow)}
              onClick={() => setHideLow((v) => !v)}
            >
              Hide low confidence
            </button>
          )}
        </div>
      )}
      <div ref={containerRef}>{children}</div>
    </div>
  );
}
