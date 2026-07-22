import { describe, it, expect } from 'vitest';
import {
  confirmResultRedirect,
  parseConfirmableOtpType,
  recoveryRedirectTo,
  signupEmailRedirectTo,
} from '../auth-email';

// ⚠ TEMPLATE DRIFT GUARD: the Supabase "Confirm signup" / "Reset password"
// email templates branch on these EXACT production strings via
// `{{ if eq .RedirectTo "…" }}`. If one of these assertions has to change,
// the templates in the Supabase dashboard MUST change with it (see
// AGENTS.md → "Email auth sub-flag", activation checklist step 4).
describe('redirect strings matched by the Supabase email templates', () => {
  it('signup emailRedirectTo', () => {
    expect(signupEmailRedirectTo('https://streamertimes.tv')).toBe(
      'https://streamertimes.tv/auth/callback',
    );
  });

  it('recovery redirectTo', () => {
    expect(recoveryRedirectTo('https://streamertimes.tv')).toBe(
      'https://streamertimes.tv/auth/callback?next=/auth/reset-password',
    );
  });
});

describe('parseConfirmableOtpType', () => {
  it('accepts the supported email OTP types', () => {
    expect(parseConfirmableOtpType('signup')).toBe('signup');
    expect(parseConfirmableOtpType('recovery')).toBe('recovery');
    expect(parseConfirmableOtpType('email')).toBe('email');
    expect(parseConfirmableOtpType('magiclink')).toBe('magiclink');
    expect(parseConfirmableOtpType('email_change')).toBe('email_change');
  });

  it('rejects unknown and missing types', () => {
    expect(parseConfirmableOtpType('sms')).toBeNull();
    expect(parseConfirmableOtpType('')).toBeNull();
    expect(parseConfirmableOtpType(null)).toBeNull();
  });
});

describe('confirmResultRedirect', () => {
  it('successful recovery → password form', () => {
    expect(confirmResultRedirect('recovery', null, true)).toBe('/auth/reset-password');
  });

  it('successful signup confirm → sanitized next or the onboarding wizard', () => {
    expect(confirmResultRedirect('signup', '/feed', true)).toBe('/feed');
    // a confirmed signup is by definition a brand-new account
    expect(confirmResultRedirect('signup', null, true)).toBe('/onboarding');
    // open-redirect guard runs through safeNextPath
    expect(confirmResultRedirect('signup', 'https://evil.example', true)).toBe('/onboarding');
    expect(confirmResultRedirect('signup', '//evil.example', true)).toBe('/onboarding');
  });

  it('successful non-signup confirms keep the homepage default', () => {
    expect(confirmResultRedirect('email', null, true)).toBe('/');
    expect(confirmResultRedirect('magiclink', '/feed', true)).toBe('/feed');
    expect(confirmResultRedirect('email_change', null, true)).toBe('/');
  });

  it('failed recovery → forgot-password with error code', () => {
    expect(confirmResultRedirect('recovery', null, false)).toBe(
      '/auth/forgot-password?error=link_expired',
    );
  });

  it('failed signup confirm (and missing type) → login with error code', () => {
    expect(confirmResultRedirect('signup', '/feed', false)).toBe(
      '/auth/login?error=confirm_failed',
    );
    expect(confirmResultRedirect(null, null, false)).toBe('/auth/login?error=confirm_failed');
  });
});
