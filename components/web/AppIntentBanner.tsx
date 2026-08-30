'use client';

// Context-aware hint on /app ("Saving a favorite? Do it in the app →") keyed
// off `?from=` on the redirecting link (FavoriteButton sends `from=favorite`).
//
// Lives in a client island so the page itself stays static: reading
// `searchParams` in the server component made the whole /app route dynamic
// (`private, no-store`, one function render per visit AND per link prefetch —
// 615 invocations in 28 h on 2026-08-29) for one optional line of copy. The
// island reads the query string after hydration; the server renders nothing
// here, so there is no hydration mismatch and no layout shift for the common
// case (no `from` at all).
//
// Must be rendered inside <Suspense> — Next requires a boundary around
// useSearchParams on statically rendered routes.

import { useSearchParams } from 'next/navigation';
import { Bell, Heart, Search } from 'lucide-react';

// Class strings are static lookups so Tailwind can see them — do NOT
// interpolate token names into class strings.
const BANNER_CLASS = {
  cyan: 'border-accent-cyan/40 bg-accent-cyan/10 text-accent-cyan',
  pink: 'border-accent-pink/40 bg-accent-pink/10 text-accent-pink',
  green: 'border-live/40 bg-live/10 text-live',
} as const;

const INTENT_BANNERS = {
  add: { icon: Search, text: "Want to add a streamer? That's in the app →", accent: 'cyan' as const },
  favorite: { icon: Heart, text: 'Saving a favorite? Do it in the app →', accent: 'pink' as const },
  alerts: { icon: Bell, text: 'Want go-live alerts? Turn them on in the app →', accent: 'green' as const },
};

export type AppIntent = keyof typeof INTENT_BANNERS;

/** Exported for tests: maps the raw query value to a known intent (or null). */
export function resolveAppIntent(from: string | null | undefined): AppIntent | null {
  return from && from in INTENT_BANNERS ? (from as AppIntent) : null;
}

export function AppIntentBanner() {
  const searchParams = useSearchParams();
  const intent = resolveAppIntent(searchParams.get('from'));
  if (!intent) return null;
  const banner = INTENT_BANNERS[intent];
  const Icon = banner.icon;
  return (
    <div
      className={`mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${BANNER_CLASS[banner.accent]}`}
    >
      <Icon size={15} />
      {banner.text}
    </div>
  );
}
