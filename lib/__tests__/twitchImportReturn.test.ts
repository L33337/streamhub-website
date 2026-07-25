import { describe, expect, it } from 'vitest';
import {
  evaluateTwitchImportReturn,
  twitchImportReturnTarget,
  TWITCH_IMPORT_DEFAULT_NEXT,
} from '../web/twitchImportReturn';

const STATE = 'state-abc';

describe('evaluateTwitchImportReturn', () => {
  it('accepts a valid token when state matches', () => {
    const r = evaluateTwitchImportReturn({
      hash: `#access_token=tok123&scope=user%3Aread%3Aemail+user%3Aread%3Afollows&state=${STATE}&token_type=bearer`,
      search: '',
      storedState: STATE,
      storedNext: '/onboarding?step=import',
    });
    expect(r.token).toBe('tok123');
    expect(r.connectError).toBeNull();
    expect(r.next).toBe('/onboarding?step=import');
  });

  it('tolerates a missing scope param (Twitch grants all requested scopes)', () => {
    const r = evaluateTwitchImportReturn({
      hash: `#access_token=tok123&state=${STATE}`,
      search: '',
      storedState: STATE,
      storedNext: null,
    });
    expect(r.token).toBe('tok123');
    expect(r.connectError).toBeNull();
    expect(r.next).toBe(TWITCH_IMPORT_DEFAULT_NEXT);
  });

  it('rejects a token whose granted scopes lack user:read:follows', () => {
    const r = evaluateTwitchImportReturn({
      hash: `#access_token=tok123&scope=user%3Aread%3Aemail&state=${STATE}`,
      search: '',
      storedState: STATE,
      storedNext: null,
    });
    expect(r.token).toBeNull();
    expect(r.connectError).toBe('scope_denied');
  });

  it('surfaces a provider error from the query string', () => {
    const r = evaluateTwitchImportReturn({
      hash: '',
      search: '?error=access_denied&error_description=denied',
      storedState: STATE,
      storedNext: '/settings',
    });
    expect(r.token).toBeNull();
    expect(r.connectError).toBe('access_denied');
    expect(r.next).toBe('/settings');
  });

  it('rejects on CSRF state mismatch', () => {
    const r = evaluateTwitchImportReturn({
      hash: '#access_token=tok123&state=someone-elses-state',
      search: '',
      storedState: STATE,
      storedNext: null,
    });
    expect(r.token).toBeNull();
    expect(r.connectError).toBe('state_mismatch');
  });

  it('accepts when no state was stored (storage unavailable) — best effort', () => {
    const r = evaluateTwitchImportReturn({
      hash: '#access_token=tok123&scope=user%3Aread%3Afollows&state=whatever',
      search: '',
      storedState: null,
      storedNext: null,
    });
    expect(r.token).toBe('tok123');
    expect(r.connectError).toBeNull();
  });

  it('bounces when the fragment carries no token (state ok)', () => {
    const r = evaluateTwitchImportReturn({
      hash: `#token_type=bearer&state=${STATE}`,
      search: '',
      storedState: STATE,
      storedNext: null,
    });
    expect(r.token).toBeNull();
    expect(r.connectError).toBe('no_token');
  });

  it('sanitizes a hostile stored next to the default', () => {
    const r = evaluateTwitchImportReturn({
      hash: `#access_token=tok123&state=${STATE}`,
      search: '',
      storedState: STATE,
      storedNext: 'https://evil.example',
    });
    expect(r.next).toBe(TWITCH_IMPORT_DEFAULT_NEXT);
  });
});

describe('twitchImportReturnTarget', () => {
  it('returns next unchanged on success', () => {
    expect(
      twitchImportReturnTarget({ next: '/onboarding?step=import', token: 'x', connectError: null }),
    ).toBe('/onboarding?step=import');
  });

  it('appends connect_error, preserving an existing query', () => {
    expect(
      twitchImportReturnTarget({
        next: '/onboarding?step=import',
        token: null,
        connectError: 'access_denied',
      }),
    ).toBe('/onboarding?step=import&connect_error=access_denied');
  });

  it('appends connect_error to a query-less path', () => {
    expect(
      twitchImportReturnTarget({ next: '/settings', token: null, connectError: 'no_token' }),
    ).toBe('/settings?connect_error=no_token');
  });
});
