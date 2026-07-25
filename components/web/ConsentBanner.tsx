'use client';

import { useEffect, useState } from 'react';
import type { UiLang } from '@/lib/i18n-core';
import { localeHref } from '@/lib/i18n-core';
import { CONSENT_STRINGS } from '@/lib/i18n-consent';
import {
  CONSENT_OPEN_EVENT,
  getStoredConsent,
  setConsent,
} from '@/lib/consent';

/**
 * GDPR/TTDSG cookie-consent banner. Deliberately minimal to be legally clean
 * yet low-friction:
 *   • It only appears when there is no stored choice (first visit) or when the
 *     footer "Cookie settings" link reopens it — one decision, then it's gone.
 *   • "Accept" and "Reject" are rendered as visual equals (same size/weight),
 *     as ePrivacy / German DSK guidance requires — a reject must be as easy as
 *     an accept. There is no pre-selected option and no "X = accept" trick.
 *   • It's a slim bottom bar, not a full-screen modal, so it never blocks the
 *     content behind it.
 *   • Client-only: rendering it server-side would bake a per-visitor UI into
 *     the statically cached HTML. It pops in after hydration; nothing tracks
 *     until the user clicks Accept (see ConsentGatedAnalytics).
 */
export function ConsentBanner({ locale }: { locale: UiLang }) {
  const [open, setOpen] = useState(false);
  const t = CONSENT_STRINGS[locale] ?? CONSENT_STRINGS.en;

  useEffect(() => {
    // Show only when the visitor hasn't decided yet. This must run in an
    // effect, not render: localStorage is unreadable during SSR, so a lazy
    // initializer would cause a hydration mismatch. Syncing external (browser)
    // state into React here is the legitimate use the rule exempts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (getStoredConsent() === null) setOpen(true);
    const reopen = () => setOpen(true);
    window.addEventListener(CONSENT_OPEN_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, reopen);
  }, []);

  if (!open) return null;

  const choose = (granted: boolean) => {
    setConsent(granted ? 'granted' : 'denied');
    setOpen(false);
  };

  return (
    <div
      lang={locale}
      role="dialog"
      aria-label={t.aria}
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-divider bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div className="container mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
        <p className="min-w-0 flex-1 text-sm text-text-secondary">
          {t.message}{' '}
          <a
            href={localeHref(locale, '/privacy-policy')}
            className="whitespace-nowrap font-medium text-accent-cyan underline-offset-2 hover:underline"
          >
            {t.learnMore}
          </a>
        </p>
        <div className="flex shrink-0 gap-2">
          {/* Reject and Accept are peers: same dimensions, same weight. */}
          <button
            type="button"
            onClick={() => choose(false)}
            className="flex-1 rounded-lg border border-border-default bg-background-elevated px-4 py-2 text-sm font-semibold text-text-primary transition-colors hover:border-accent-cyan/40 sm:flex-none"
          >
            {t.reject}
          </button>
          <button
            type="button"
            onClick={() => choose(true)}
            className="flex-1 rounded-lg border border-accent-cyan/40 bg-accent-cyan/10 px-4 py-2 text-sm font-semibold text-accent-cyan transition-colors hover:bg-accent-cyan/20 sm:flex-none"
          >
            {t.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
