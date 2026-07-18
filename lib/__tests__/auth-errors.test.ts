import { describe, it, expect } from 'vitest';
import { friendlyAuthError, isEmailNotConfirmedError } from '../auth-errors';

describe('isEmailNotConfirmedError', () => {
  it('matches by GoTrue error code', () => {
    expect(isEmailNotConfirmedError({ message: 'x', code: 'email_not_confirmed' })).toBe(true);
  });

  it('matches by message text', () => {
    expect(isEmailNotConfirmedError({ message: 'Email not confirmed' })).toBe(true);
  });

  it('ignores unrelated errors', () => {
    expect(
      isEmailNotConfirmedError({ message: 'Invalid login credentials', code: 'invalid_credentials' }),
    ).toBe(false);
  });
});

describe('friendlyAuthError', () => {
  it('invalid credentials → hint at OAuth-only accounts', () => {
    const copy = friendlyAuthError({ message: 'Invalid login credentials' });
    expect(copy).toMatch(/Twitch or Google/);
  });

  it('captcha failures are retryable copy', () => {
    expect(friendlyAuthError({ message: 'captcha protection: request disallowed' })).toMatch(
      /Captcha/,
    );
  });

  it('rate limits by status and message', () => {
    expect(friendlyAuthError({ message: 'x', status: 429 })).toMatch(/Too many attempts/);
    expect(friendlyAuthError({ message: 'Email rate limit exceeded' })).toMatch(
      /Too many attempts/,
    );
  });

  it('existing account (signup with confirmations off)', () => {
    expect(friendlyAuthError({ message: 'User already registered' })).toMatch(/already exists/);
    expect(friendlyAuthError({ message: 'x', code: 'user_already_exists' })).toMatch(
      /already exists/,
    );
  });

  it('weak and same password codes', () => {
    expect(friendlyAuthError({ message: 'x', code: 'weak_password' })).toMatch(/too weak/);
    expect(friendlyAuthError({ message: 'x', code: 'same_password' })).toMatch(/different/);
  });

  it('falls back to the raw message', () => {
    expect(friendlyAuthError({ message: 'Something exotic happened' })).toBe(
      'Something exotic happened',
    );
  });
});
