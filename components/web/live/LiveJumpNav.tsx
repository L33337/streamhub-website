'use client';

import { useRef, type ReactNode } from 'react';

/**
 * Sticky "Jump to a game" index for /live, which runs to dozens of category
 * sections and tens of thousands of pixels.
 *
 * A plain <details> so the whole index is server-rendered and works with
 * JavaScript off — `children` is the category chip list, rendered on the server
 * and passed through untouched. The only thing this island adds is closing the
 * panel after a chip is tapped: the bar is sticky, so an open panel would sit
 * on top of the very heading it just scrolled to.
 */
export function LiveJumpNav({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);

  return (
    <details
      ref={ref}
      className="sticky top-[var(--header-height)] z-20 -mx-4 mt-6 border-b border-divider bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-text-secondary marker:content-none hover:text-accent-cyan [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="text-xs">
          ▾
        </span>
        {label}
      </summary>
      <nav
        aria-label={label}
        // Delegated: one handler for every chip, and it still fires for chips
        // added later. `removeAttribute` leaves the native toggle in charge
        // rather than fighting it with controlled state.
        onClick={(event) => {
          if ((event.target as HTMLElement).closest('a')) {
            ref.current?.removeAttribute('open');
          }
        }}
        className="max-h-64 overflow-y-auto pb-2 pt-1"
      >
        {children}
      </nav>
    </details>
  );
}
