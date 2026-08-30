import { describe, expect, it } from 'vitest';
import { hasSupabaseAuthCookie } from '../client';

describe('hasSupabaseAuthCookie', () => {
  it('is false for an empty or missing cookie string (server / anonymous)', () => {
    expect(hasSupabaseAuthCookie('')).toBe(false);
    expect(hasSupabaseAuthCookie(undefined)).toBe(false);
  });

  it('ignores unrelated cookies', () => {
    expect(hasSupabaseAuthCookie('NEXT_LOCALE=de; st_feed_seen=2026-08-29T00:00:00Z; _ga=x')).toBe(false);
  });

  it('detects the @supabase/ssr auth cookie, chunked or not', () => {
    expect(hasSupabaseAuthCookie('sb-ypebfgtxythamjwgvoci-auth-token=base64-abc')).toBe(true);
    expect(
      hasSupabaseAuthCookie('NEXT_LOCALE=de; sb-ypebfgtxythamjwgvoci-auth-token.0=abc; sb-ypebfgtxythamjwgvoci-auth-token.1=def'),
    ).toBe(true);
  });

  it('matches on the cookie NAME only, never on a value', () => {
    expect(hasSupabaseAuthCookie('ref=sb-something')).toBe(false);
  });
});
