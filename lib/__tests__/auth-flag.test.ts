import { describe, it, expect, vi, afterEach } from 'vitest';
import { safeNextPath } from '../auth-flag';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('safeNextPath', () => {
  it('passes same-site absolute paths', () => {
    expect(safeNextPath('/feed')).toBe('/feed');
    expect(safeNextPath('/favorites?tab=live')).toBe('/favorites?tab=live');
    expect(safeNextPath('/')).toBe('/');
  });

  it('rejects absolute and protocol-relative URLs (open redirect)', () => {
    expect(safeNextPath('https://evil.example')).toBeNull();
    expect(safeNextPath('http://evil.example/feed')).toBeNull();
    expect(safeNextPath('//evil.example')).toBeNull();
    expect(safeNextPath('/\\evil.example')).toBeNull();
  });

  it('rejects empty, missing, and relative values', () => {
    expect(safeNextPath('')).toBeNull();
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath('feed')).toBeNull();
    expect(safeNextPath('javascript:alert(1)')).toBeNull();
  });
});

describe('signInGateRedirect / AUTH_ENABLED (env-dependent, fresh import per case)', () => {
  it('flag unset → dormant: gates point to /app', async () => {
    vi.stubEnv('NEXT_PUBLIC_AUTH_ENABLED', '');
    const mod = await import('../auth-flag');
    expect(mod.AUTH_ENABLED).toBe(false);
    expect(mod.signInGateRedirect('/feed')).toBe('/app');
  });

  it('flag=true → gates point to the sign-in page with a return path', async () => {
    vi.stubEnv('NEXT_PUBLIC_AUTH_ENABLED', 'true');
    vi.resetModules();
    const mod = await import('../auth-flag');
    expect(mod.AUTH_ENABLED).toBe(true);
    expect(mod.signInGateRedirect('/feed')).toBe('/auth/login?next=%2Ffeed');
    expect(mod.signInGateRedirect('/feed/interests')).toBe(
      '/auth/login?next=%2Ffeed%2Finterests',
    );
  });

  it('only the literal "true" enables the flag', async () => {
    vi.stubEnv('NEXT_PUBLIC_AUTH_ENABLED', '1');
    vi.resetModules();
    const mod = await import('../auth-flag');
    expect(mod.AUTH_ENABLED).toBe(false);
  });
});
