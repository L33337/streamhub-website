import { describe, expect, it } from 'vitest';
import {
  FRESH_SIGNUP_WINDOW_MS,
  isFreshSignup,
  isOnboardingPath,
  onboardingFinishTarget,
  parseOnboardingStep,
  postAuthDestination,
} from '../onboarding';

const NOW = Date.parse('2026-07-22T12:00:00.000Z');
const secondsAgo = (s: number) => new Date(NOW - s * 1000).toISOString();

describe('isFreshSignup', () => {
  it('accepts accounts created moments ago (OAuth signup round-trip)', () => {
    expect(isFreshSignup(secondsAgo(5), NOW)).toBe(true);
    expect(isFreshSignup(secondsAgo(299), NOW)).toBe(true);
  });

  it('rejects accounts older than the window', () => {
    expect(isFreshSignup(secondsAgo(301), NOW)).toBe(false);
    expect(isFreshSignup(secondsAgo(60 * 60 * 24), NOW)).toBe(false);
  });

  it('tolerates small negative clock skew but not future timestamps', () => {
    expect(isFreshSignup(secondsAgo(-30), NOW)).toBe(true);
    expect(isFreshSignup(secondsAgo(-120), NOW)).toBe(false);
  });

  it('rejects missing or invalid created_at', () => {
    expect(isFreshSignup(null, NOW)).toBe(false);
    expect(isFreshSignup(undefined, NOW)).toBe(false);
    expect(isFreshSignup('not-a-date', NOW)).toBe(false);
  });

  it('window constant stays at five minutes', () => {
    expect(FRESH_SIGNUP_WINDOW_MS).toBe(5 * 60 * 1000);
  });
});

describe('postAuthDestination', () => {
  const base = { isNewUser: false, next: null, hasTwitchToken: false, authEnabled: true };

  it('existing users keep the pre-onboarding behavior (?next or /)', () => {
    expect(postAuthDestination({ ...base })).toBe('/');
    expect(postAuthDestination({ ...base, next: '/feed' })).toBe('/feed');
    expect(postAuthDestination({ ...base, next: '/feed', hasTwitchToken: true })).toBe('/feed');
  });

  it('fresh signups land on the wizard', () => {
    expect(postAuthDestination({ ...base, isNewUser: true })).toBe('/onboarding');
  });

  it('fresh Twitch signups (token captured) start on the import step', () => {
    expect(
      postAuthDestination({ ...base, isNewUser: true, hasTwitchToken: true }),
    ).toBe('/onboarding?step=import');
  });

  it('an explicit next survives as the wizard finish target', () => {
    expect(postAuthDestination({ ...base, isNewUser: true, next: '/program' })).toBe(
      '/onboarding?next=%2Fprogram',
    );
    expect(
      postAuthDestination({
        ...base,
        isNewUser: true,
        next: '/program',
        hasTwitchToken: true,
      }),
    ).toBe('/onboarding?step=import&next=%2Fprogram');
  });

  it('a next already inside the wizard passes through untouched (Connect Twitch round-trip)', () => {
    expect(
      postAuthDestination({
        ...base,
        isNewUser: true,
        next: '/onboarding?step=import',
        hasTwitchToken: true,
      }),
    ).toBe('/onboarding?step=import');
    expect(
      postAuthDestination({
        ...base,
        next: '/de/onboarding?step=import&next=%2Fprogram',
        hasTwitchToken: true,
      }),
    ).toBe('/de/onboarding?step=import&next=%2Fprogram');
  });

  it('never redirects into the wizard while auth is dormant', () => {
    expect(
      postAuthDestination({ ...base, isNewUser: true, authEnabled: false }),
    ).toBe('/');
  });

  it('sanitizes hostile next values', () => {
    expect(
      postAuthDestination({ ...base, next: 'https://evil.example' }),
    ).toBe('/');
    expect(
      postAuthDestination({ ...base, isNewUser: true, next: '//evil.example' }),
    ).toBe('/onboarding');
  });
});

describe('isOnboardingPath', () => {
  it('matches plain, query and locale-prefixed forms', () => {
    expect(isOnboardingPath('/onboarding')).toBe(true);
    expect(isOnboardingPath('/onboarding?step=import')).toBe(true);
    expect(isOnboardingPath('/de/onboarding')).toBe(true);
    expect(isOnboardingPath('/ja/onboarding?step=import&next=%2Ffeed')).toBe(true);
  });

  it('rejects lookalikes', () => {
    expect(isOnboardingPath('/onboarding-tips')).toBe(false);
    expect(isOnboardingPath('/feed')).toBe(false);
    expect(isOnboardingPath('/blog/onboarding')).toBe(false);
    expect(isOnboardingPath('onboarding')).toBe(false);
  });
});

describe('parseOnboardingStep', () => {
  it('accepts known steps and falls back to choice', () => {
    expect(parseOnboardingStep('import')).toBe('import');
    expect(parseOnboardingStep('pick')).toBe('pick');
    expect(parseOnboardingStep('done')).toBe('done');
    expect(parseOnboardingStep('choice')).toBe('choice');
    expect(parseOnboardingStep('bogus')).toBe('choice');
    expect(parseOnboardingStep(undefined)).toBe('choice');
  });
});

describe('onboardingFinishTarget', () => {
  it('prefers a sanitized next and defaults to the feed', () => {
    expect(onboardingFinishTarget('/program')).toBe('/program');
    expect(onboardingFinishTarget(null)).toBe('/feed');
    expect(onboardingFinishTarget('https://evil.example')).toBe('/feed');
  });
});
