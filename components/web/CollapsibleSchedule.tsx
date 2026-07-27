'use client';

import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import { ChevronDown } from 'lucide-react';

function subscribeToHash(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

/** A `#day-…` hash means the visitor was linked to a specific day. */
function hasDayHash(): boolean {
  return window.location.hash.startsWith('#day-');
}

interface Props {
  /** Already carries the hidden-stream count, e.g. "Show 6 more streams". */
  moreLabel: string;
  lessLabel: string;
  /** The server-rendered day nav + day sections. */
  children: React.ReactNode;
}

/**
 * Collapses the 7-day schedule to roughly two and a half slot cards.
 *
 * A full week of prediction cards plus five "no streams expected" rows made the
 * page scroll for ages before reaching the stats, FAQ and internal links — on a
 * page most visitors reach from a single search. The schedule itself stays a
 * server component: everything is in the HTML and only `data-schedule-collapsed`
 * (see globals.css) decides what is painted, so nothing crawlable is gated
 * behind hydration.
 *
 * Anchor safety is the tricky part: DayNavBar and the empty-day "next stream"
 * hints link to `#day-…` sections that may currently be display:none. A native
 * jump to a hidden element silently does nothing, so those clicks expand first
 * and then scroll — and an inbound URL that already carries such a hash expands
 * on mount.
 */
export function CollapsibleSchedule({ moreLabel, lessLabel, children }: Props) {
  // Deep link to a day (#day-2026-07-30) forces the schedule open: the target
  // may be one of the collapsed sections. Read as external state rather than
  // set in an effect — the hash is never known while server-rendering.
  const deepLinked = useSyncExternalStore(subscribeToHash, hasDayHash, () => false);
  const [userExpanded, setUserExpanded] = useState<boolean | null>(null);
  const expanded = userExpanded ?? deepLinked;

  const containerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const id = useId();

  // The browser's own jump for that inbound hash already ran against a hidden
  // section and did nothing, so redo it once the content is laid out.
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith('#day-')) return;
    const target = document.getElementById(hash.slice(1));
    if (!target) return;
    requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
  }, []);

  // In-page day links while collapsed. Delegated so the day nav and the day
  // sections stay server components.
  useEffect(() => {
    if (expanded) return;
    const root = containerRef.current;
    if (!root) return;

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) {
        return;
      }
      const anchor = (event.target as Element | null)?.closest?.('a[href^="#day-"]');
      const href = anchor?.getAttribute('href');
      if (!href) return;
      const target = document.getElementById(href.slice(1));
      if (!target) return;
      // Already painted (a day above the cut) — let the browser handle it.
      if (target.getClientRects().length > 0) return;

      event.preventDefault();
      // Synchronous commit, so the target is in the layout before we scroll.
      flushSync(() => setUserExpanded(true));
      target.scrollIntoView({ block: 'start' });
      history.replaceState(null, '', href);
    };

    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  }, [expanded]);

  function collapse() {
    setUserExpanded(false);
    // Without this the viewport would be left below the shrunken section,
    // somewhere in the stats block.
    rootRef.current?.scrollIntoView({ block: 'start' });
  }

  return (
    <div ref={rootRef}>
      <div
        id={id}
        ref={containerRef}
        data-schedule-collapsed={expanded ? 'false' : 'true'}
      >
        {children}
      </div>
      <button
        type="button"
        onClick={expanded ? collapse : () => setUserExpanded(true)}
        aria-expanded={expanded}
        aria-controls={id}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border-default bg-background-elevated/40 px-4 py-3 text-sm font-semibold text-accent-cyan transition-colors hover:border-accent-cyan/60 hover:bg-background-highlight"
      >
        {expanded ? lessLabel : moreLabel}
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
    </div>
  );
}
