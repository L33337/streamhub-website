import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { revalidatePath } from 'next/cache';
import { POST } from '../route';
import { UI_LANGS } from '@/lib/i18n-core';

// First route-handler test in the repo: the handler is a plain async function
// taking a standard Request, so it runs in the node vitest env without any
// Next server — only next/cache needs mocking.
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const SECRET = 'test-secret-0123456789abcdef0123456789abcdef';

function makeRequest(body: unknown, secret?: string): Request {
  return new Request('http://localhost/api/revalidate', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(secret !== undefined ? { 'x-revalidate-secret': secret } : {}),
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('POST /api/revalidate', () => {
  beforeEach(() => {
    process.env.REVALIDATE_SECRET = SECRET;
    vi.mocked(revalidatePath).mockClear();
  });

  afterEach(() => {
    delete process.env.REVALIDATE_SECRET;
  });

  it('is disabled (404) while REVALIDATE_SECRET is unset', async () => {
    delete process.env.REVALIDATE_SECRET;
    const res = await POST(makeRequest({ slug: 'xqc' }, SECRET));
    expect(res.status).toBe(404);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('rejects a wrong or missing secret with 401', async () => {
    expect((await POST(makeRequest({ slug: 'xqc' }, 'wrong'))).status).toBe(401);
    expect((await POST(makeRequest({ slug: 'xqc' }))).status).toBe(401);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('rejects malformed bodies and bad slugs with 400', async () => {
    expect((await POST(makeRequest('not json', SECRET))).status).toBe(400);
    expect((await POST(makeRequest({}, SECRET))).status).toBe(400);
    expect((await POST(makeRequest({ slug: '' }, SECRET))).status).toBe(400);
    expect((await POST(makeRequest({ slug: '-389031' }, SECRET))).status).toBe(400);
    expect((await POST(makeRequest({ slug: '../x' }, SECRET))).status).toBe(400);
    expect((await POST(makeRequest({ slug: 'a/b' }, SECRET))).status).toBe(400);
    expect((await POST(makeRequest({ slug: 42 }, SECRET))).status).toBe(400);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('revalidates the streamer path across every locale variant and returns 204', async () => {
    const res = await POST(makeRequest({ slug: 'illojuan-075649' }, SECRET));
    expect(res.status).toBe(204);
    // M22: bare path (belt & braces) + one call per locale tree — the
    // LIVE-badge pipeline must purge /de/streamer/x too, not only /streamer/x.
    // 2026-08-29: the wiki page is its own route entry and is purged alongside
    // (wiki publish/takedown must reach it), so every path appears twice.
    expect(revalidatePath).toHaveBeenCalledTimes(2 * (1 + UI_LANGS.length));
    expect(revalidatePath).toHaveBeenCalledWith('/streamer/illojuan-075649');
    expect(revalidatePath).toHaveBeenCalledWith('/streamer/illojuan-075649/wiki');
    for (const locale of UI_LANGS) {
      expect(revalidatePath).toHaveBeenCalledWith(`/${locale}/streamer/illojuan-075649`);
      expect(revalidatePath).toHaveBeenCalledWith(`/${locale}/streamer/illojuan-075649/wiki`);
    }
  });
});
