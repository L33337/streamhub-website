'use client';

import { useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import type { UiLang } from '@/lib/i18n-core';
import { localeHref } from '@/lib/i18n-core';
import { BANNER_STRINGS } from '@/lib/i18n-banner';
import { CONSENT_CHANGE_EVENT, getStoredConsent } from '@/lib/consent';
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

function subscribeConsent(onChange: () => void): () => void {
  window.addEventListener(CONSENT_CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(CONSENT_CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

const consentDecided = (): boolean => getStoredConsent() !== null;
const consentUndecidedOnServer = (): boolean => false;

/**
 * M22 language-suggestion banner (D3): compares the browser's preferred
 * language (or the NEXT_LOCALE cookie) against the page locale and offers a
 * link to the same page in the visitor's language. Client-only by design —
 * rendering it on the server would vary cached HTML by visitor (cloaking
 * risk + CDN fragmentation), so the static page ships without it and the
 * banner pops in after hydration. No server-side locale redirects, ever.
 *
 * A floating toast since the streamer-page UX round (2026-09-26). As a bar
 * between header and page it pushed every page down by ~120 px on phones
 * after hydration — the site's whole CLS (0.069 on /streamer/*). Out of the
 * flow it shifts nothing. It waits until the cookie choice is made: the
 * consent banner owns the bottom edge on a first visit, and stacking both
 * there covered half a phone screen. Where storage is blocked the choice never
 * persists and the toast stays away, the quiet failure mode.
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
  const consentMade = useSyncExternalStore(subscribeConsent, consentDecided, consentUndecidedOnServer);

  if (!suggested || !consentMade) return null;
  const strings = BANNER_STRINGS[suggested];
  const target = localeHref(suggested, stripLocalePrefix(pathname));

  return (
    <div
      lang={suggested}
      // Mobile: above the floating app button (bottom-4 right-4, 46 px), so
      // bottom-20; from md the app button is hidden and the toast sits in the
      // corner. z-50 stays under the consent banner (z-[60]) should the
      // footer's "Cookie settings" reopen it while the toast is up.
      className="fixed inset-x-4 bottom-20 z-50 mx-auto max-w-md rounded-xl border border-border-default bg-background-elevated/95 p-3 shadow-lg shadow-black/40 backdrop-blur md:inset-x-auto md:bottom-4 md:right-4"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      role="region"
      aria-label={strings.text}
    >
      <div className="grid grid-cols-[1fr_auto] items-center gap-x-2 gap-y-2 text-sm">
        <span className="min-w-0 text-text-secondary">{strings.text}</span>
        <button
          type="button"
          aria-label={strings.dismiss}
          // No local state to clear: dismissBanner writes the cookie and
          // notifies subscribers, so the snapshot above re-reads as null.
          onClick={() => dismissBanner(suggested, pageLocale)}
          // 44px hit area; the negative margin lets it exceed the bar's own
          // padding instead of making the whole banner taller.
          className="-my-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded text-text-muted hover:text-text-primary"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <a
          href={target}
          onClick={() => setPreferredLocale(suggested)}
          className="col-span-2 inline-flex min-h-11 items-center justify-center rounded-lg border border-accent-cyan/40 bg-accent-cyan/10 px-3 text-sm font-semibold text-accent-cyan transition-colors hover:bg-accent-cyan/20"
        >
          {strings.cta}
        </a>
      </div>
    </div>
  );
}
