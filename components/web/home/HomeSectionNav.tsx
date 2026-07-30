'use client';

import { useEffect, useRef, useState } from 'react';

export interface HomeSectionNavItem {
  /** DOM id of the section wrapper this chip jumps to (page.tsx anchors). */
  id: string;
  label: string;
}

/**
 * Sticky section-jump chips for the feed-style homepage (UX round
 * 2026-07-27): the news-site "page map" that sticks below the site header.
 * The server passes only chips whose section actually rendered; as a drift
 * guard, chips whose target is missing or rendered empty are hidden at
 * mount via the `hidden` attribute (HomeUpNextFilters pattern — direct DOM,
 * no setState-in-effect cascade). Scroll-spy is the DayNavBar pattern — an
 * IntersectionObserver over a thin band in the upper third of the viewport;
 * SSR marks no chip active, so hydration stays clean.
 */
export function HomeSectionNav({
  items,
  ariaLabel,
}: {
  items: HomeSectionNavItem[];
  ariaLabel: string;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const present = items.filter(({ id }) => {
      const el = document.getElementById(id);
      return el !== null && el.offsetHeight > 0;
    });
    const presentIds = new Set(present.map((item) => item.id));
    const chips = listRef.current?.querySelectorAll<HTMLLIElement>('li[data-target]');
    chips?.forEach((chip) => {
      chip.hidden = !presentIds.has(chip.dataset.target ?? '');
    });

    if (present.length === 0 || typeof IntersectionObserver === 'undefined') return;
    const intersecting = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) intersecting.add(entry.target.id);
          else intersecting.delete(entry.target.id);
        }
        const first = present.find(({ id }) => intersecting.has(id));
        setActiveId(first ? first.id : null);
      },
      { rootMargin: '-25% 0px -65% 0px', threshold: 0 },
    );
    for (const { id } of present) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav
      aria-label={ariaLabel}
      className="sticky top-[var(--header-height)] z-20 -mx-6 border-b border-divider bg-background/95 px-6 py-2 backdrop-blur"
    >
      {/* The only horizontal rail on the site that still showed its native
          scrollbar — a grey bar under the chips on Windows and some Androids.
          Same utilities the card rails use (see RailScroller). */}
      <ul
        ref={listRef}
        className="flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="list"
      >
        {items.map(({ id, label }) => {
          const isActive = id === activeId;
          return (
            <li key={id} data-target={id} className="shrink-0">
              <a
                href={`#${id}`}
                aria-current={isActive ? 'true' : undefined}
                className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-full border px-3 text-xs font-semibold transition-colors hover:border-accent-cyan/60 hover:bg-background-highlight ${
                  isActive
                    ? 'border-accent-cyan/70 bg-background-highlight text-accent-cyan'
                    : 'border-border-default bg-background-elevated text-text-secondary'
                }`}
              >
                {label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
