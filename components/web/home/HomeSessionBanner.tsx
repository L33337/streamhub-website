'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthProvider';

const subscribeNoop = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Signed-in banner (I5, homepage rebuild 2026-07-27): the homepage stays a
 * static ISR page for everyone, so the session check is purely client-side —
 * SSR and the first client render both emit nothing (mounted gate keeps
 * hydration clean), then signed-in visitors get a one-line pointer to /feed.
 */
export function HomeSessionBanner({
  text,
  cta,
  href,
}: {
  text: string;
  cta: string;
  /** Locale-aware /feed href, resolved server-side. */
  href: string;
}) {
  const { user } = useAuth();
  // Hydration-safe mounted gate (repo convention — see LocalTime/ClipEmbedFrame).
  const mounted = useSyncExternalStore(subscribeNoop, getClientSnapshot, getServerSnapshot);

  if (!mounted || !user) return null;

  return (
    <div className="mb-6 flex items-center gap-4 rounded-xl border border-accent-cyan/40 bg-gradient-to-r from-accent-cyan/10 to-transparent px-4 py-3">
      <p className="min-w-0 flex-1 truncate text-sm text-white">{text}</p>
      <Link
        href={href}
        className="shrink-0 text-sm font-bold text-accent-cyan hover:underline"
      >
        {cta}
      </Link>
    </div>
  );
}
