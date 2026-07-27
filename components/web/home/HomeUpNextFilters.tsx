'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { HomeUpsellSheet, type UpsellSheetStrings } from './HomeUpsellSheet';

/**
 * Category chips + collapse state over the server-rendered "Today's lineup"
 * (homepage rebuild 2026-07-27). Same philosophy as ScheduleFilters and the
 * streamer page's CollapsibleBio: the slots stay fully server-rendered (SEO),
 * this wrapper only toggles `hidden` attributes and a purely visual clamp.
 *
 * - Chips filter via `li[data-home-cat]` hidden-toggling across BOTH lists.
 * - Cards whose `data-home-start` has passed are hidden too (re-checked every
 *   minute): the ISR page can be served stale, and an expired prediction
 *   would otherwise sit in "Today's lineup" as a "was expected at …" card.
 * - `moreChildren` (slot 5+) renders inside a clamped peek zone — ~half a
 *   card row visible under a fade — until the toggle expands it. The clipped
 *   region is `inert` while collapsed so keyboard/AT users can't land on
 *   invisible cards; the markup itself stays in the DOM for crawlers.
 * - Picking a category auto-expands: the match may live entirely in the
 *   collapsed region, and a filter over a clipped list reads as broken.
 * - The locked "My favorites" chip is implicit hook I3 (upsell sheet).
 */
export function HomeUpNextFilters({
  categories,
  allLabel,
  favoritesLabel,
  showAllLabel,
  showLessLabel,
  upsellStrings,
  children,
  moreChildren,
}: {
  categories: string[];
  allLabel: string;
  favoritesLabel: string;
  /** Resolved server-side, e.g. "Show all 24 streams". */
  showAllLabel: string;
  showLessLabel: string;
  upsellStrings: UpsellSheetStrings;
  children: React.ReactNode;
  moreChildren: React.ReactNode | null;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  // Clock for the expiry check. `now` never reaches the render output — the
  // hiding happens as a DOM mutation in the effect below, so the initializer
  // is hydration-safe (FeedClient nowTick pattern).
  const [now, setNow] = useState(() => Date.now());
  const containerRef = useRef<HTMLDivElement>(null);
  const moreId = useId();

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.querySelectorAll<HTMLElement>('li[data-home-cat]').forEach((item) => {
      const startMs = Number(item.dataset.homeStart);
      const expired = Number.isFinite(startMs) && startMs > 0 && startMs <= now;
      item.hidden =
        expired || (selected !== null && item.dataset.homeCat !== selected);
    });
  }, [selected, now]);

  const chipClass = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
      active
        ? 'border-accent-cyan bg-accent-cyan text-background'
        : 'border-border-default bg-background-elevated text-text-secondary hover:border-accent-cyan/50 hover:text-white'
    }`;

  const collapsed = moreChildren !== null && !expanded;

  return (
    <div ref={containerRef}>
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelected(null)}
          aria-pressed={selected === null}
          className={chipClass(selected === null)}
        >
          {allLabel}
        </button>
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() =>
              setSelected((current) => {
                const next = current === category ? null : category;
                if (next !== null) setExpanded(true);
                return next;
              })
            }
            aria-pressed={selected === category}
            className={chipClass(selected === category)}
          >
            {category}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex items-center gap-1.5 rounded-full border border-dashed border-border-default px-3 py-1.5 text-xs font-semibold text-text-muted transition-colors hover:border-accent-pink/50 hover:text-accent-pink"
        >
          <Lock size={11} aria-hidden="true" />
          {favoritesLabel}
        </button>
      </div>
      {children}
      {moreChildren !== null && (
        <>
          <div
            id={moreId}
            inert={collapsed}
            className={
              collapsed ? 'relative mt-3 max-h-24 overflow-hidden' : 'mt-3'
            }
          >
            {moreChildren}
            {collapsed && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background to-transparent"
              />
            )}
          </div>
          <div className="mt-2 text-center">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              aria-controls={moreId}
              className="text-sm font-semibold text-accent-cyan transition-colors hover:text-accent-cyan/80"
            >
              {expanded ? showLessLabel : showAllLabel}
            </button>
          </div>
        </>
      )}
      {sheetOpen && (
        <HomeUpsellSheet strings={upsellStrings} onClose={() => setSheetOpen(false)} />
      )}
    </div>
  );
}
