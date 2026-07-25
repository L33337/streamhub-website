'use client';

import { useEffect, useState } from 'react';
import { GoogleAnalytics } from '@next/third-parties/google';
import {
  CONSENT_CHANGE_EVENT,
  getStoredConsent,
  pushConsentUpdate,
} from '@/lib/consent';

/**
 * Renders <GoogleAnalytics> — and therefore injects gtag.js — ONLY once the
 * visitor has granted consent. Before that (no choice yet, or "Reject") the
 * script is never added to the page, so there is no device access and no
 * network call to Google: strict TTDSG §25 opt-in, not just Consent Mode
 * cookieless pings.
 *
 * On grant we also push a Consent Mode v2 update into the dataLayer. gtag.js
 * (loaded by GoogleAnalytics via next/script, afterInteractive) replays the
 * queued commands in order — head default (denied) → this update (granted) —
 * so it ends up in the granted state before the first pageview fires.
 */
export function ConsentGatedAnalytics({ gaId }: { gaId: string }) {
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    const sync = () => setGranted(getStoredConsent() === 'granted');
    sync();
    // React to a choice made this session (banner) and to another tab.
    window.addEventListener(CONSENT_CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CONSENT_CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    if (granted) pushConsentUpdate(true);
  }, [granted]);

  if (!granted) return null;
  return <GoogleAnalytics gaId={gaId} />;
}
