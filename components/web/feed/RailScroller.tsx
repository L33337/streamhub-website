'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Horizontal rail wrapper (feed UX round 2026-07-22): owns the overflow
 * scroll container (scrollbar hidden, as before) and restores the
 * affordances the hidden scrollbar takes away on desktop — edge fades while
 * more content exists in that direction, plus hover-revealed chevron paging
 * buttons for mouse users. Both are hidden on touch, where swiping is the
 * natural gesture. Children = the rail's list element (flex, NO overflow
 * classes of its own).
 */
export function RailScroller({
  children,
  contentClassName,
}: {
  children: React.ReactNode;
  /** Extra classes for the scroll container (e.g. bottom padding). */
  contentClassName?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const measure = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  // Content changes (refresh, chip filter, dismiss) resize the rail without
  // firing a scroll event — re-measure after every render. Converges: once
  // the values are stable, setState bails out and no further render happens.
  useEffect(() => {
    measure();
  });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  const scrollByPage = useCallback((direction: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' });
  }, []);

  const buttonClass =
    'absolute top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border-default bg-black/70 text-white opacity-0 transition-opacity focus-visible:opacity-100 group-hover/rail:opacity-100 [@media(pointer:fine)]:flex';

  return (
    <div className="group/rail relative">
      <div
        ref={scrollRef}
        onScroll={measure}
        // Handle for siblings that change the rail's content from outside and
        // need to rewind it (HomeLiveRailFilters): a filter can shrink the
        // rail to fewer cards than the current scroll offset.
        data-rail-scroll=""
        className={`overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${contentClassName ?? ''}`}
      >
        {children}
      </div>
      {canLeft && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-background to-transparent"
        />
      )}
      {canRight && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent"
        />
      )}
      {canLeft && (
        <button
          type="button"
          aria-label="Scroll left"
          onClick={() => scrollByPage(-1)}
          className={`${buttonClass} left-1`}
        >
          <ChevronLeft size={18} />
        </button>
      )}
      {canRight && (
        <button
          type="button"
          aria-label="Scroll right"
          onClick={() => scrollByPage(1)}
          className={`${buttonClass} right-1`}
        >
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  );
}
