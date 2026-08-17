// M22 locale-routing middleware — rewrite/redirect matrix + the compose
// contract with updateSession (refreshed session cookies must survive
// rewrites and redirects, or users get silently logged out).

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const updateSessionMock = vi.fn();
vi.mock('@/lib/supabase/middleware-helper', () => ({
  updateSession: (request: NextRequest) => updateSessionMock(request),
}));

import { middleware } from '@/middleware';

function req(path: string): NextRequest {
  return new NextRequest(`https://streamertimes.tv${path}`);
}

function rewriteTarget(res: Response): string | null {
  const value = res.headers.get('x-middleware-rewrite');
  return value ? new URL(value).pathname + new URL(value).search : null;
}

beforeEach(() => {
  updateSessionMock.mockReset();
  updateSessionMock.mockImplementation((request: NextRequest) =>
    Promise.resolve(NextResponse.next({ request })),
  );
});

describe('locale rewrite (unprefixed = English)', () => {
  it.each(['/', '/live', '/streamer/montanablack88', '/auth/login', '/search?q=x'])(
    'rewrites %s into the /en tree',
    async (path) => {
      const res = await middleware(req(path));
      const pathname = path.split('?')[0];
      const expected = pathname === '/' ? '/en' : `/en${pathname}`;
      expect(rewriteTarget(res)).toBe(expected + (path.includes('?') ? path.slice(path.indexOf('?')) : ''));
    },
  );

  it('rewrites unknown first segments so they 404 inside the en tree', async () => {
    const res = await middleware(req('/xyzzy/whatever'));
    expect(rewriteTarget(res)).toBe('/en/xyzzy/whatever');
  });
});

describe('known locale prefixes pass through', () => {
  it.each(['/de', '/de/streamer/montanablack88', '/ja/live', '/pt/rankings'])(
    '%s is served as-is',
    async (path) => {
      const res = await middleware(req(path));
      expect(rewriteTarget(res)).toBeNull();
      expect(res.status).toBe(200);
    },
  );
});

describe('/en/* → 308 to unprefixed (one canonical English URL)', () => {
  it.each([
    ['/en', '/'],
    ['/en/', '/'],
    ['/en/streamer/foo', '/streamer/foo'],
  ])('%s redirects to %s', async (path, expected) => {
    const res = await middleware(req(path));
    expect(res.status).toBe(308);
    expect(new URL(res.headers.get('location')!).pathname).toBe(expected);
  });

  it('preserves the query string', async () => {
    const res = await middleware(req('/en/search?q=shroud'));
    const location = new URL(res.headers.get('location')!);
    expect(location.pathname).toBe('/search');
    expect(location.search).toBe('?q=shroud');
  });
});

describe('root route handlers + assets are never rewritten', () => {
  it.each([
    '/api/health',
    '/api/revalidate',
    '/auth/callback',
    '/auth/confirm',
    '/auth/sign-out',
    '/get',
    '/sitemap.xml',
    '/robots.txt',
    '/llms.txt',
    '/manifest.webmanifest',
    '/screenshots/live-feed.webp',
  ])('%s passes through untouched', async (path) => {
    const res = await middleware(req(path));
    expect(rewriteTarget(res)).toBeNull();
    expect(res.status).toBe(200);
  });

  it('still rewrites auth PAGES (login is not a route handler)', async () => {
    const res = await middleware(req('/auth/login'));
    expect(rewriteTarget(res)).toBe('/en/auth/login');
  });

  it('rewrites the brand og/twitter images into the locale tree (they live in app/[locale]/)', async () => {
    expect(rewriteTarget(await middleware(req('/opengraph-image')))).toBe('/en/opengraph-image');
    expect(rewriteTarget(await middleware(req('/twitter-image')))).toBe('/en/twitter-image');
  });

  it('rewrites the Twitch-import return PAGE into the locale tree', async () => {
    // It lives under app/[locale]/auth/twitch-import (needs the root layout);
    // the token arrives in the URL fragment, which never reaches middleware.
    const res = await middleware(req('/auth/twitch-import'));
    expect(rewriteTarget(res)).toBe('/en/auth/twitch-import');
  });
});

describe('session-cookie survival (compose contract)', () => {
  function sessionResponseWithCookie(request: NextRequest): NextResponse {
    const res = NextResponse.next({ request });
    res.cookies.set('sb-test-auth-token', 'refreshed-token-value', { httpOnly: true, path: '/' });
    return res;
  }

  it('rewrite responses carry refreshed sb-* cookies', async () => {
    updateSessionMock.mockImplementation((request: NextRequest) =>
      Promise.resolve(sessionResponseWithCookie(request)),
    );
    const res = await middleware(req('/favorites'));
    expect(rewriteTarget(res)).toBe('/en/favorites');
    expect(res.cookies.get('sb-test-auth-token')?.value).toBe('refreshed-token-value');
  });

  it('/en redirect responses carry refreshed sb-* cookies', async () => {
    updateSessionMock.mockImplementation((request: NextRequest) =>
      Promise.resolve(sessionResponseWithCookie(request)),
    );
    const res = await middleware(req('/en/settings'));
    expect(res.status).toBe(308);
    expect(res.cookies.get('sb-test-auth-token')?.value).toBe('refreshed-token-value');
  });

  it('locale pass-through returns the session response itself', async () => {
    updateSessionMock.mockImplementation((request: NextRequest) =>
      Promise.resolve(sessionResponseWithCookie(request)),
    );
    const res = await middleware(req('/de/settings'));
    expect(res.cookies.get('sb-test-auth-token')?.value).toBe('refreshed-token-value');
  });
});

describe('dead prediction-slot URLs short-circuit before any Partner-API work', () => {
  const DAY = 24 * 60 * 60 * 1000;
  // Built relative to the real clock so no fake timers are needed.
  const deadId = (slug: string, ageDays = 30) =>
    `ai_slot_pred_${slug}_${Date.now() - ageDays * DAY}_0`;

  function redirectTarget(res: Response): string | null {
    const loc = res.headers.get('location');
    return loc ? new URL(loc).pathname : null;
  }

  it('308s an old unprefixed slot URL to the streamer page', async () => {
    const res = await middleware(req(`/schedule/${deadId('northernlion')}`));
    expect(res.status).toBe(308);
    expect(redirectTarget(res)).toBe('/streamer/northernlion');
  });

  it('keeps the locale prefix on the redirect target', async () => {
    const res = await middleware(req(`/de/schedule/${deadId('choc')}`));
    expect(res.status).toBe(308);
    expect(redirectTarget(res)).toBe('/de/streamer/choc');
  });

  it('does NOT short-circuit a young id (may still be a live slot)', async () => {
    const path = `/schedule/${deadId('subroza', 3)}`;
    const res = await middleware(req(path));
    expect(res.status).toBe(200);
    expect(rewriteTarget(res)).toBe(`/en${path}`);
  });

  it('does NOT short-circuit a real (non-prediction) slot id', async () => {
    const path = '/schedule/twitch-live-examplestreamer-317259025767';
    const res = await middleware(req(path));
    expect(rewriteTarget(res)).toBe(`/en${path}`);
  });

  it('ignores paths that are not exactly /schedule/<id>', async () => {
    for (const path of ['/schedule', `/schedule/${deadId('x')}/extra`, `/streamer/${deadId('x')}`]) {
      const res = await middleware(req(path));
      expect(rewriteTarget(res)).toBe(`/en${path}`);
    }
  });

  it('survives a malformed percent-escape in the id instead of throwing', async () => {
    const res = await middleware(req('/schedule/ai_slot_pred_%E0%A4%A_1786051545162_0'));
    expect(res.status).toBe(200);
  });

  it('carries refreshed sb-* cookies on the short-circuit redirect', async () => {
    updateSessionMock.mockImplementation((request: NextRequest) => {
      const res = NextResponse.next({ request });
      res.cookies.set('sb-test-auth-token', 'refreshed-token-value', { httpOnly: true, path: '/' });
      return Promise.resolve(res);
    });
    const res = await middleware(req(`/schedule/${deadId('scarra')}`));
    expect(res.status).toBe(308);
    expect(res.cookies.get('sb-test-auth-token')?.value).toBe('refreshed-token-value');
  });

  it('/en/schedule/<dead id> normalises first, then short-circuits', async () => {
    const id = deadId('agent00');
    const first = await middleware(req(`/en/schedule/${id}`));
    expect(first.status).toBe(308);
    expect(redirectTarget(first)).toBe(`/schedule/${id}`);
    const second = await middleware(req(`/schedule/${id}`));
    expect(redirectTarget(second)).toBe('/streamer/agent00');
  });
});
