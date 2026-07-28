// updateSession() is the only Supabase touchpoint on public pages, and it runs
// in front of EVERY request. These tests pin the two properties that matter:
// anonymous traffic never reaches Supabase at all, and a hanging auth backend
// can never hold the middleware past its budget (which is what turned a slow
// GoTrue into a site-wide 504 / MIDDLEWARE_INVOCATION_TIMEOUT).

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

type FetchImpl = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
interface CapturedOptions {
  global?: { fetch?: FetchImpl };
  cookies: {
    getAll: () => { name: string; value: string }[];
    setAll: (cookies: { name: string; value: string; options?: Record<string, unknown> }[]) => void;
  };
}

const getUserMock = vi.fn();
let captured: CapturedOptions | null = null;

vi.mock('@supabase/ssr', () => ({
  createServerClient: (_url: string, _key: string, options: CapturedOptions) => {
    captured = options;
    return { auth: { getUser: getUserMock } };
  },
}));

import { updateSession, SESSION_REFRESH_BUDGET_MS } from '@/lib/supabase/middleware-helper';

function req(cookie?: string): NextRequest {
  return new NextRequest('https://streamertimes.tv/live', {
    headers: cookie ? { cookie } : undefined,
  });
}

const AUTH_COOKIE = 'sb-ypebfgtxythamjwgvoci-auth-token=session-value';

beforeEach(() => {
  captured = null;
  getUserMock.mockReset();
  getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('anonymous fast path', () => {
  it('never constructs a Supabase client without an sb-* cookie', async () => {
    const res = await updateSession(req());
    expect(captured).toBeNull();
    expect(getUserMock).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it('still skips when only unrelated cookies are present', async () => {
    await updateSession(req('st_feed_seen=123; NEXT_LOCALE=de'));
    expect(captured).toBeNull();
  });

  it.each(['sb-ref-auth-token.0=chunk0', 'sb-ref-auth-token=v'])(
    'engages for the sb-* cookie shape %s',
    async (cookie) => {
      await updateSession(req(cookie));
      expect(getUserMock).toHaveBeenCalledTimes(1);
    },
  );
});

describe('happy path', () => {
  it('returns a response carrying the cookies setAll wrote', async () => {
    getUserMock.mockImplementation(async () => {
      captured!.cookies.setAll([
        { name: 'sb-ref-auth-token', value: 'refreshed', options: { path: '/' } },
      ]);
      return { data: { user: { id: 'u1' } }, error: null };
    });

    const res = await updateSession(req(AUTH_COOKIE));
    expect(res.cookies.get('sb-ref-auth-token')?.value).toBe('refreshed');
  });

  it('forwards the request unchanged when no refresh was needed', async () => {
    const res = await updateSession(req(AUTH_COOKIE));
    expect(res.status).toBe(200);
    expect(res.cookies.getAll()).toHaveLength(0);
  });
});

describe('budget', () => {
  it('returns instead of hanging when getUser never settles', async () => {
    vi.useFakeTimers();
    getUserMock.mockImplementation(() => new Promise(() => {}));

    let settled = false;
    const pending = updateSession(req(AUTH_COOKIE)).then((res) => {
      settled = true;
      return res;
    });

    await vi.advanceTimersByTimeAsync(SESSION_REFRESH_BUDGET_MS - 1);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(2);
    const res = await pending;
    expect(settled).toBe(true);
    expect(res.status).toBe(200);
  });

  it('aborts the in-flight GoTrue request so retries cannot open new sockets', async () => {
    vi.useFakeTimers();
    getUserMock.mockImplementation(() => new Promise(() => {}));

    const pending = updateSession(req(AUTH_COOKIE));
    const signalBefore = captured!.global!.fetch as FetchImpl;
    expect(signalBefore).toBeTypeOf('function');

    const seen: (AbortSignal | undefined)[] = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (_i: unknown, init?: RequestInit) => {
      seen.push(init?.signal ?? undefined);
      return new Response(null);
    }) as unknown as typeof globalThis.fetch;

    await signalBefore('https://project.supabase.co/auth/v1/user');
    expect(seen[0]?.aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(SESSION_REFRESH_BUDGET_MS + 1);
    expect(seen[0]?.aborted).toBe(true);

    globalThis.fetch = realFetch;
    await pending;
  });

  it('does not swallow a refresh that completes inside the budget', async () => {
    vi.useFakeTimers();
    getUserMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            captured!.cookies.setAll([{ name: 'sb-ref-auth-token', value: 'in-time' }]);
            resolve({ data: { user: { id: 'u1' } }, error: null });
          }, SESSION_REFRESH_BUDGET_MS - 500);
        }),
    );

    const pending = updateSession(req(AUTH_COOKIE));
    await vi.advanceTimersByTimeAsync(SESSION_REFRESH_BUDGET_MS - 400);
    const res = await pending;
    expect(res.cookies.get('sb-ref-auth-token')?.value).toBe('in-time');
  });
});

describe('failure isolation', () => {
  it('serves the page when getUser rejects outright', async () => {
    getUserMock.mockRejectedValue(new Error('auth backend unreachable'));
    const res = await updateSession(req(AUTH_COOKIE));
    expect(res.status).toBe(200);
  });

  it('serves the page when getUser reports an error without throwing', async () => {
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: { name: 'AuthRetryableFetchError', message: 'fetch failed' },
    });
    const res = await updateSession(req(AUTH_COOKIE));
    expect(res.status).toBe(200);
  });

  it('a setAll arriving after the budget cannot mutate the returned response', async () => {
    vi.useFakeTimers();
    let release: (() => void) | null = null;
    getUserMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => {
            captured!.cookies.setAll([{ name: 'sb-ref-auth-token', value: 'too-late' }]);
            resolve({ data: { user: null }, error: null });
          };
        }),
    );

    const pending = updateSession(req(AUTH_COOKIE));
    await vi.advanceTimersByTimeAsync(SESSION_REFRESH_BUDGET_MS + 1);
    const res = await pending;

    release!();
    await Promise.resolve();
    expect(res.cookies.get('sb-ref-auth-token')).toBeUndefined();
  });
});
