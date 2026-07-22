// New-user onboarding flow (post-signup wizard at /onboarding).
//
// The website has no app-launch state machine like the mobile app's
// useOnboarding hook, so "show onboarding" is decided at the two places a
// brand-new account first lands with a session:
//   - the OAuth callback (app/auth/callback/route.ts) via isFreshSignup +
//     postAuthDestination below, and
//   - the email confirm route (type=signup defaults to /onboarding in
//     lib/auth-email.ts confirmResultRedirect).
// Returning users are never redirected there — reachable only by URL.

import { safeNextPath } from './auth-flag';

/**
 * An account younger than this at sign-in time is treated as a fresh signup
 * (OAuth signup and first sign-in are the same round-trip, so the account is
 * seconds old when the callback sees it).
 */
export const FRESH_SIGNUP_WINDOW_MS = 5 * 60 * 1000;

/** Small negative tolerance for clock skew between Supabase and this server. */
const CLOCK_SKEW_TOLERANCE_MS = 60 * 1000;

export function isFreshSignup(
  createdAt: string | null | undefined,
  nowMs: number,
  windowMs: number = FRESH_SIGNUP_WINDOW_MS,
): boolean {
  if (!createdAt) return false;
  const created = Date.parse(createdAt);
  if (!Number.isFinite(created)) return false;
  const age = nowMs - created;
  return age >= -CLOCK_SKEW_TOLERANCE_MS && age < windowMs;
}

export interface PostAuthDestinationOptions {
  /** Account created within FRESH_SIGNUP_WINDOW_MS (see isFreshSignup). */
  isNewUser: boolean;
  /** Sanitized explicit ?next from the callback URL, null when absent. */
  next: string | null;
  /**
   * A usable Twitch provider token is being captured in this round-trip, so
   * the wizard can start directly on the import step (mirrors the app, which
   * skips the manual picker for Twitch sign-ins).
   */
  hasTwitchToken: boolean;
  /** lib/auth-flag AUTH_ENABLED — never redirect into the wizard while dormant. */
  authEnabled: boolean;
}

/**
 * Where the OAuth callback sends the user after a successful code exchange.
 *
 * Existing users keep today's behavior (?next or /). Fresh signups go to the
 * onboarding wizard; an explicit ?next survives as the wizard's finish target
 * (?next=… on /onboarding). A ?next that already points into /onboarding
 * (the wizard's own "Connect Twitch" round-trip) is passed through untouched
 * so its step/next params aren't rebuilt.
 */
export function postAuthDestination(opts: PostAuthDestinationOptions): string {
  const next = safeNextPath(opts.next);
  if (next && isOnboardingPath(next)) return next;
  if (!opts.authEnabled || !opts.isNewUser) return next ?? '/';

  const params = new URLSearchParams();
  if (opts.hasTwitchToken) params.set('step', 'import');
  if (next) params.set('next', next);
  const qs = params.toString();
  return `/onboarding${qs ? `?${qs}` : ''}`;
}

/**
 * True for /onboarding itself and any query/sub-path/locale-prefixed form of
 * it (/de/onboarding?step=import — non-English locales prefix all pages).
 */
export function isOnboardingPath(path: string): boolean {
  return /^\/(?:[a-z]{2}\/)?onboarding(?:[/?]|$)/.test(path);
}

/** Wizard steps (URL-addressable via ?step= so OAuth round-trips can return
 * into the import step; everything else advances client-side). */
export type OnboardingStep = 'choice' | 'import' | 'pick' | 'done';

export function parseOnboardingStep(raw: string | null | undefined): OnboardingStep {
  return raw === 'import' || raw === 'pick' || raw === 'done' ? raw : 'choice';
}

/** The wizard's exit target: an explicit next wins, otherwise the feed. */
export function onboardingFinishTarget(next: string | null | undefined): string {
  return safeNextPath(next) ?? '/feed';
}
