// --- Cookie / analytics consent (client-safe) ----------------------------------
//
// Single source of truth for the GDPR/TTDSG consent state that gates Google
// Analytics. Legally we may not touch the device or load gtag.js before the
// visitor opts in, so:
//   • The consent choice is the ONLY thing we persist before consent — this is
//     "strictly necessary" storage (needed to honor a "Reject") and therefore
//     consent-exempt. It lives in localStorage, not a cookie.
//   • gtag.js is not injected until the state is 'granted' (see
//     ConsentGatedAnalytics) — so "Reject" and "no choice yet" load NOTHING.
//   • We still speak Google Consent Mode v2: the default is denied (set inline
//     in <head>), and granting pushes a consent update so gtag behaves
//     correctly if/when it loads.
//
// This module is imported by 'use client' components only; every access is
// window-guarded so it is inert during SSR.

export type ConsentState = 'granted' | 'denied';

/** localStorage key. Versioned so a future policy change can re-prompt. */
export const CONSENT_KEY = 'st_consent_v1';

/** Dispatched on window whenever the stored consent state changes. */
export const CONSENT_CHANGE_EVENT = 'st:consent-change';

/** Dispatched on window to (re)open the banner — wired to the footer link. */
export const CONSENT_OPEN_EVENT = 'st:consent-open';

/** Reads the persisted choice. Returns null when the visitor hasn't decided. */
export function getStoredConsent(): ConsentState | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = window.localStorage.getItem(CONSENT_KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    // localStorage can throw in private-mode / storage-partitioned contexts.
    return null;
  }
}

/**
 * Pushes a Consent Mode v2 update into the dataLayer. Safe to call before
 * gtag.js has loaded — the command queues and is replayed when the script
 * runs. Ad signals stay denied: the website runs no ads.
 */
export function pushConsentUpdate(granted: boolean): void {
  if (typeof window === 'undefined') return;
  const w = window as unknown as { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  // gtag() pushes the raw `arguments` object — mirror the canonical snippet
  // (identical to @next/third-parties) so the command is well-formed for
  // gtag.js regardless of load order. Typed via the annotation; the body uses
  // `arguments`, so there is no unused parameter.
  const gtag: (...args: unknown[]) => void = function () {
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer!.push(arguments);
  };
  gtag('consent', 'update', {
    analytics_storage: granted ? 'granted' : 'denied',
  });
}

/** Persists the choice, updates Consent Mode, and notifies listeners. */
export function setConsent(state: ConsentState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CONSENT_KEY, state);
  } catch {
    // Non-fatal: without persistence the banner reappears next load, which is
    // the privacy-safe failure mode (defaults stay denied).
  }
  pushConsentUpdate(state === 'granted');
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: state }));
}

/** Fires the "reopen the banner" event (footer "Cookie settings" link). */
export function openConsentBanner(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(CONSENT_OPEN_EVENT));
}
