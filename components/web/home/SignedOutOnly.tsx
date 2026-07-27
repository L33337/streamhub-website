'use client';

import { useSyncExternalStore } from 'react';
import { useAuth } from '@/context/AuthProvider';

const subscribeNoop = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Renders its children for SIGNED-OUT visitors only (homepage masthead,
 * rebuild round 2 — 2026-07-27). The homepage stays a static ISR page for
 * everyone (ISR-K1), so the session check is purely client-side: SSR and the
 * first client render always emit `children` (hydration-safe mounted gate —
 * the inverted HomeSessionBanner pattern), which also keeps the H1 in the
 * crawlable HTML for anonymous crawlers. Signed-in visitors swap to
 * `fallback` right after mount, once supabase-js has replayed the session
 * cookie (local read, no network).
 *
 * Server children are supported: they are passed through as a `children`
 * prop, so wrapping does not pull the subtree into the client bundle.
 */
export function SignedOutOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  /** Rendered instead of `children` once a session is known (default: nothing). */
  fallback?: React.ReactNode;
}) {
  const { user } = useAuth();
  const mounted = useSyncExternalStore(
    subscribeNoop,
    getClientSnapshot,
    getServerSnapshot,
  );

  if (mounted && user) return <>{fallback}</>;
  return <>{children}</>;
}
