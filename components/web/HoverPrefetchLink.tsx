'use client';

import Link from 'next/link';
import { useState, type ComponentProps } from 'react';

type LinkProps = ComponentProps<typeof Link>;

/**
 * A `<Link>` that prefetches only once the visitor shows intent (hover or
 * keyboard focus) instead of as soon as it scrolls into view.
 *
 * Why (perf round 2026-09-19): every page on the site links home from the
 * header logo and twice from the footer. With default prefetching each of
 * those links pulled the homepage's static RSC segment — 175 KB on the wire,
 * 768 KB decoded — on EVERY page view, 55–85 % of all prefetch bytes, for a
 * link few visitors click. `prefetch={false}` disables both the viewport and
 * the hover prefetch, so intent is tracked here and `null` (Next's default
 * mode) is restored once the pointer arrives; the navigation then still
 * feels instant. The pattern is Next's own "HoverPrefetchLink" from the
 * prefetching guide, extended with `onFocus` for keyboard users.
 *
 * No `onTouchStart` on purpose: on a touch screen the tap that fires it IS
 * the navigation, so a prefetch there only adds a second request.
 *
 * Use it for links whose target is heavy and rarely taken (the home link);
 * the header nav links to /live, /games and /rankings keep the default so
 * their (small) segments stay pre-warmed.
 */
export function HoverPrefetchLink({
  onMouseEnter,
  onFocus,
  ...props
}: Omit<LinkProps, 'prefetch'>) {
  const [active, setActive] = useState(false);
  return (
    <Link
      {...props}
      prefetch={active ? null : false}
      onMouseEnter={(e) => {
        setActive(true);
        onMouseEnter?.(e);
      }}
      onFocus={(e) => {
        setActive(true);
        onFocus?.(e);
      }}
    />
  );
}
