// Email-auth helpers shared by the sign-up / forgot-password forms and the
// /auth/confirm route.
//
// ⚠ The two redirect builders below are LOAD-BEARING for the Supabase email
// templates: the project-wide "Confirm signup" and "Reset password" templates
// (Supabase dashboard → Auth → Emails) branch on the EXACT `{{ .RedirectTo }}`
// string via `{{ if eq .RedirectTo "…" }}` to render a
// `/auth/confirm?token_hash=…` link for website requests while keeping the
// mobile app's `{{ .ConfirmationURL }}` deep-link flow untouched. Changing
// either string here without updating the templates silently drops website
// signups into the app's else-branch (same-browser ?code= fallback only).
// The unit tests in lib/__tests__/auth-email.test.ts freeze both strings.

import { safeNextPath } from './auth-flag';

/**
 * Redirect base for the email flows. NEXT_PUBLIC_SITE_URL is inlined into
 * both bundles; the window fallback only matters when the var is unset in
 * local dev (prod always sets it — the template match depends on it).
 */
export function resolveSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:3000';
}

/** `emailRedirectTo` for `signUp` and `resend({ type: 'signup' })`. */
export function signupEmailRedirectTo(siteUrl: string): string {
  return `${siteUrl}/auth/callback`;
}

/** `redirectTo` for `resetPasswordForEmail`. */
export function recoveryRedirectTo(siteUrl: string): string {
  return `${siteUrl}/auth/callback?next=/auth/reset-password`;
}

/** OTP types the /auth/confirm route accepts (subset of Supabase EmailOtpType). */
const CONFIRMABLE_OTP_TYPES = ['signup', 'recovery', 'email', 'magiclink', 'email_change'] as const;
export type ConfirmableOtpType = (typeof CONFIRMABLE_OTP_TYPES)[number];

export function parseConfirmableOtpType(raw: string | null): ConfirmableOtpType | null {
  return (CONFIRMABLE_OTP_TYPES as readonly string[]).includes(raw ?? '')
    ? (raw as ConfirmableOtpType)
    : null;
}

/**
 * Maps a /auth/confirm verifyOtp outcome to its redirect destination.
 * Recovery links continue to the password form; a confirmed SIGNUP is by
 * definition a brand-new account and lands on the onboarding wizard (an
 * explicit ?next still wins); everything else lands on the (sanitized)
 * ?next= target or the homepage. Failed recovery links go back to the
 * forgot-password page for a fresh email; other failures go to the login
 * page (an unconfirmed account re-offers "resend" there).
 */
export function confirmResultRedirect(
  type: ConfirmableOtpType | null,
  next: string | null | undefined,
  ok: boolean,
): string {
  if (!ok) {
    return type === 'recovery'
      ? '/auth/forgot-password?error=link_expired'
      : '/auth/login?error=confirm_failed';
  }
  if (type === 'recovery') return '/auth/reset-password';
  if (type === 'signup') return safeNextPath(next) ?? '/onboarding';
  return safeNextPath(next) ?? '/';
}
