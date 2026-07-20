'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { localeHref, type UiLang } from '@/lib/i18n-core';
import type { ChromeLex } from '@/lib/i18n-chrome';

interface Props {
  // M22: viewer locale + pre-localized nav strings from the server layout
  // (keeps the 12-language chrome lexicon out of the client bundle).
  locale?: UiLang;
  strings?: ChromeLex['nav'];
}

const EN_NAV: ChromeLex['nav'] = {
  live: 'Live',
  streamers: 'Streamers',
  games: 'Games',
  rankings: 'Rankings',
  getApp: 'Get the App',
  openMenu: 'Open menu',
  closeMenu: 'Close menu',
  searchPlaceholder: 'Search streamers…',
  searchResults: 'Search results',
  home: 'Streamer Times home',
};

export function MobileHeaderMenu({ locale = 'en', strings = EN_NAV }: Props) {
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
        aria-label={open ? strings.closeMenu : strings.openMenu}
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
            href={localeHref(locale, '/live')}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="mb-1 inline-flex h-10 w-full items-center justify-center rounded-lg border border-border-default bg-background-elevated px-3 text-sm font-semibold text-text-primary hover:border-accent-cyan/40 transition-colors"
          >
            {strings.live}
          </Link>
          <Link
            href={localeHref(locale, '/streamers')}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="mb-1 inline-flex h-10 w-full items-center justify-center rounded-lg border border-border-default bg-background-elevated px-3 text-sm font-semibold text-text-primary hover:border-accent-cyan/40 transition-colors"
          >
            {strings.streamers}
          </Link>
          <Link
            href={localeHref(locale, '/games')}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="mb-1 inline-flex h-10 w-full items-center justify-center rounded-lg border border-border-default bg-background-elevated px-3 text-sm font-semibold text-text-primary hover:border-accent-cyan/40 transition-colors"
          >
            {strings.games}
          </Link>
          <Link
            href={localeHref(locale, '/rankings')}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="mb-1 inline-flex h-10 w-full items-center justify-center rounded-lg border border-border-default bg-background-elevated px-3 text-sm font-semibold text-text-primary hover:border-accent-cyan/40 transition-colors"
          >
            {strings.rankings}
          </Link>
          <Link
            href={localeHref(locale, '/app')}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-accent-cyan/40 bg-accent-cyan/10 px-3 text-sm font-semibold text-accent-cyan hover:bg-accent-cyan/20 transition-colors"
          >
            {strings.getApp}
          </Link>
        </div>
      )}
    </div>
  );
}
