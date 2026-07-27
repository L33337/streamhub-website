'use client';

import { useEffect, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { HomeUpsellSheet, type UpsellSheetStrings } from './HomeUpsellSheet';

/**
 * Category chips over the server-rendered "Today's lineup" list (homepage
 * rebuild 2026-07-27). Same pattern as the game page's ScheduleFilters: the
 * slot list stays fully server-rendered (SEO / no payload duplication); this
 * client wrapper only toggles the `hidden` attribute on `li[data-home-cat]`
 * markers. The locked "My favorites" chip is implicit hook I3 — it opens the
 * favorites upsell sheet instead of filtering.
 */
export function HomeUpNextFilters({
  categories,
  allLabel,
  favoritesLabel,
  upsellStrings,
  children,
}: {
  categories: string[];
  allLabel: string;
  favoritesLabel: string;
  upsellStrings: UpsellSheetStrings;
  children: React.ReactNode;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.querySelectorAll<HTMLElement>('li[data-home-cat]').forEach((item) => {
      item.hidden = selected !== null && item.dataset.homeCat !== selected;
    });
  }, [selected]);

  const chipClass = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
      active
        ? 'border-accent-cyan bg-accent-cyan text-background'
        : 'border-border-default bg-background-elevated text-text-secondary hover:border-accent-cyan/50 hover:text-white'
    }`;

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
              setSelected((current) => (current === category ? null : category))
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
      {sheetOpen && (
        <HomeUpsellSheet strings={upsellStrings} onClose={() => setSheetOpen(false)} />
      )}
    </div>
  );
}
