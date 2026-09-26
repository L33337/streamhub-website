import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import fixture from '@/lib/og/social/__fixtures__/social-card-spec.fixture.json';
import { POST } from '../route';

// Route-handler test in the node vitest env. Avatar fetches are mocked so the
// render is deterministic and offline; the real Satori + sharp pipeline runs.

vi.mock('@/lib/og/avatar', () => ({
  loadOgAvatar: vi.fn(async () => null),
}));

const SECRET = 'test-social-secret-0123456789abcdef0123456789';

function makeRequest(body: unknown, secret?: string, query = ''): Request {
  return new Request(`http://localhost/api/social/card${query}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(secret !== undefined ? { 'x-social-secret': secret } : {}),
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('POST /api/social/card', () => {
  beforeEach(() => {
    process.env.SOCIAL_RENDER_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.SOCIAL_RENDER_SECRET;
  });

  it('is disabled (404) while SOCIAL_RENDER_SECRET is unset', async () => {
    delete process.env.SOCIAL_RENDER_SECRET;
    expect((await POST(makeRequest(fixture.list_peak, SECRET))).status).toBe(404);
  });

  it('rejects a wrong or missing secret with 401', async () => {
    expect((await POST(makeRequest(fixture.list_peak, 'wrong'))).status).toBe(401);
    expect((await POST(makeRequest(fixture.list_peak))).status).toBe(401);
  });

  it('rejects malformed bodies and bad specs with 400', async () => {
    expect((await POST(makeRequest('not json', SECRET))).status).toBe(400);
    expect((await POST(makeRequest({}, SECRET))).status).toBe(400);
    const res = await POST(makeRequest({ ...fixture.list_peak, rows: [] }, SECRET));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/rows/);
  });

  it('renders a list card as a 1080×1350 JPEG with the contract headers', async () => {
    const res = await POST(makeRequest(fixture.list_peak, SECRET));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/jpeg');
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('x-social-card-version')).toBe('1');
    expect(res.headers.get('x-social-avatar-fallbacks')).toBe('0,1,2,3,4');
    const bytes = Buffer.from(await res.arrayBuffer());
    const meta = await sharp(bytes).metadata();
    expect(meta.format).toBe('jpeg');
    expect(meta.width).toBe(1080);
    expect(meta.height).toBe(1350);
    expect(bytes.length).toBeGreaterThan(20_000);
    expect(bytes.length).toBeLessThan(1_000_000);
  }, 60_000);

  it('renders every fixture layout (png for review) without throwing', async () => {
    for (const [key, spec] of Object.entries(fixture)) {
      if (key === 'generated_from') continue;
      const res = await POST(makeRequest(spec, SECRET, '?format=png'));
      expect(res.status, key).toBe(200);
      expect(res.headers.get('content-type'), key).toBe('image/png');
      const meta = await sharp(Buffer.from(await res.arrayBuffer())).metadata();
      expect(meta.width, key).toBe(1080);
      expect(meta.height, key).toBe(1350);
    }
  }, 120_000);
});
