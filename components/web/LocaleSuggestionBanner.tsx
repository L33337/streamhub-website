'use client';

import { useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import type { UiLang } from '@/lib/i18n-core';
import { localeHref } from '@/lib/i18n-core';
import { BANNER_STRINGS } from '@/lib/i18n-banner';
import {
  dismissBanner,
  setPreferredLocale,
  subscribeLocalePreference,
  suggestedLocaleFor,
} from '@/lib/locale-preference';
import { stripLocalePrefix } from './FooterLanguageSwitcher';

/** Server render: never suggest anything (see suggestedLocaleFor). */
function noSuggestion(): null {
  return null;
}

/**
 * M22 language-suggestion banner (D3): compares the browser's preferred
 * language (or the NEXT_LOCALE cookie) against the page locale and offers a
 * link to the same page in the visitor's language. Client-only by design —
 * rendering it on the server would vary cached HTML by visitor (cloaking
 * risk + CDN fragmentation), so the static page ships without it and the
 * banner pops in after hydration. No server-side locale redirects, ever.
 */
export function LocaleSuggestionBanner({ pageLocale }: { pageLocale: UiLang }) {
  const pathname = usePathname() ?? '/';
  // The suggestion is derived from cookies + navigator, i.e. an external store,
  // so it is READ rather than mirrored into React state. Mirroring it meant
  // setting state from an effect: a cascading render on every mount, and a
  // second source of truth that had to be re-synced on navigation. Dismissing
  // writes the cookie and notifies, which re-reads this snapshot.
  const suggested = useSyncExternalStore(
    subscribeLocalePreference,
    () => suggestedLocaleFor(pageLocale),
    noSuggestion,
  );

  if (!suggested) return null;
  const strings = BANNER_STRINGS[suggested];
  const target = localeHref(suggested, stripLocalePrefix(pathname));

  return (
    <div
      lang={suggested}
      className="border-b border-divider bg-background-elevated"
      role="region"
      aria-label={strings.text}
    >
      <div className="container mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 text-sm">
        {/* Hidden below sm rather than truncated: on a 390px viewport there is
            only room for ~20 characters next to the CTA, so the sentence used
            to render as "Diese Seite gibt es auc…" — a cut-off word carries no
            more meaning than the CTA does on its own. The full sentence stays
            the region's aria-label above, so screen readers lose nothing. */}
        <span className="hidden min-w-0 flex-1 truncate text-text-secondary sm:block">
          {strings.text}
        </span>
        <a
          href={target}
          onClick={() => setPreferredLocale(suggested)}
          className="inline-flex min-h-11 shrink-0 items-center rounded-lg border border-accent-cyan/40 bg-accent-cyan/10 px-3 text-xs font-semibold text-accent-cyan hover:bg-accent-cyan/20 transition-colors sm:min-h-0 sm:py-1"
        >
          {strings.cta}
        </a>
        <button
          type="button"
          aria-label={strings.dismiss}
          // No local state to clear: dismissBanner writes the cookie and
          // notifies subscribers, so the snapshot above re-reads as null.
          onClick={() => dismissBanner(suggested, pageLocale)}
          // 44px hit area; the negative margin lets it exceed the bar's own
          // padding instead of making the whole banner taller.
          className="-my-1.5 ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded text-text-muted hover:text-text-primary sm:ml-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
