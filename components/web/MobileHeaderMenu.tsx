'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export function MobileHeaderMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Close on outside click.
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  // Close when the user navigates (e.g. tapping a search result from the
  // header). Comparing against the previous render's pathname resets the state
  // the React way — no effect, so no set-state-in-effect cascade.
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative md:hidden">
      <button
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls="mobile-header-menu"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border-default bg-background-elevated text-text-primary hover:border-accent-cyan/40 transition-colors"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {open ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </>
          )}
        </svg>
      </button>

      {open && (
        <div
          id="mobile-header-menu"
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 min-w-[12rem] rounded-xl border border-border-default bg-background-elevated p-2 shadow-lg"
        >
          <Link
            href="/live"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="mb-1 inline-flex h-10 w-full items-center justify-center rounded-lg border border-border-default bg-background-elevated px-3 text-sm font-semibold text-text-primary hover:border-accent-cyan/40 transition-colors"
          >
            Live
          </Link>
          <Link
            href="/streamers"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="mb-1 inline-flex h-10 w-full items-center justify-center rounded-lg border border-border-default bg-background-elevated px-3 text-sm font-semibold text-text-primary hover:border-accent-cyan/40 transition-colors"
          >
            Streamers
          </Link>
          <Link
            href="/games"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="mb-1 inline-flex h-10 w-full items-center justify-center rounded-lg border border-border-default bg-background-elevated px-3 text-sm font-semibold text-text-primary hover:border-accent-cyan/40 transition-colors"
          >
            Games
          </Link>
          <Link
            href="/rankings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="mb-1 inline-flex h-10 w-full items-center justify-center rounded-lg border border-border-default bg-background-elevated px-3 text-sm font-semibold text-text-primary hover:border-accent-cyan/40 transition-colors"
          >
            Rankings
          </Link>
          <Link
            href="/app"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-accent-cyan/40 bg-accent-cyan/10 px-3 text-sm font-semibold text-accent-cyan hover:bg-accent-cyan/20 transition-colors"
          >
            Get the App
          </Link>
        </div>
      )}
    </div>
  );
}
