import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../route';

// Route-handler test in the node vitest env. The network is mocked (card
// download + signed upload); Satori, sharp and the REAL ffmpeg binary run.

const SECRET = 'test-social-secret-0123456789abcdef0123456789';
const SUPABASE = 'https://proj.supabase.co';
const CARD = (name: string) => `${SUPABASE}/storage/v1/object/public/social-cards/weekly/2026-09-21/${name}-v1.jpg`;
const UPLOAD = `${SUPABASE}/storage/v1/object/upload/sign/social-videos/video/2026-09-21/weekly-v1.mp4?token=signed`;

function makeRequest(body: unknown, secret?: string): Request {
  return new Request('http://localhost/api/social/video', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(secret !== undefined ? { 'x-social-secret': secret } : {}) },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

async function cardBytes(width = 1080, height = 1350): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: '#203060' } }).jpeg().toBuffer();
}

interface Upload {
  url: string;
  method: string;
  headers: Record<string, string>;
  bytes: Buffer;
}

function mockNetwork(opts: { card?: Buffer | null; cardStatus?: number; uploadStatus?: number; uploadThrows?: boolean }) {
  const uploads: Upload[] = [];
  const fetched: string[] = [];
  // next/og loads its own wasm through fetch(): everything that is not our
  // Supabase project goes to the real implementation.
  const real = globalThis.fetch;
  const impl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    if (!url.startsWith(SUPABASE)) return real(input, init);
    if ((init?.method ?? 'GET') === 'PUT') {
      if (opts.uploadThrows) throw new Error('socket hang up');
      uploads.push({
        url,
        method: 'PUT',
        headers: Object.fromEntries(Object.entries((init?.headers ?? {}) as Record<string, string>)),
        bytes: Buffer.from(init?.body as Uint8Array),
      });
      const status = opts.uploadStatus ?? 200;
      return new Response(status === 200 ? '{"Key":"x"}' : '{"error":"Payload too large"}', { status });
    }
    fetched.push(url);
    if (opts.card === null) throw new Error('network down');
    return new Response(new Uint8Array(opts.card ?? (await cardBytes())), { status: opts.cardStatus ?? 200, headers: { 'content-type': 'image/jpeg' } });
  });
  vi.stubGlobal('fetch', impl);
  return { uploads, fetched };
}

const body = (over: Record<string, unknown> = {}) => ({
  scenes: [
    { image_url: CARD('peak'), seconds: 2 },
    { image_url: CARD('growth'), seconds: 2 },
  ],
  outro: true,
  zoom: true,
  upload_url: UPLOAD,
  ...over,
});

describe('POST /api/social/video', () => {
  beforeEach(() => {
    process.env.SOCIAL_RENDER_SECRET = SECRET;
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE;
  });
  afterEach(() => {
    delete process.env.SOCIAL_RENDER_SECRET;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.FFMPEG_PATH;
    vi.unstubAllGlobals();
  });

  it('is disabled (404) while SOCIAL_RENDER_SECRET is unset', async () => {
    delete process.env.SOCIAL_RENDER_SECRET;
    const net = mockNetwork({});
    expect((await POST(makeRequest(body(), SECRET))).status).toBe(404);
    expect(net.fetched).toEqual([]);
  });

  it('rejects a wrong or missing secret with 401 before touching the network', async () => {
    const net = mockNetwork({});
    expect((await POST(makeRequest(body(), 'wrong'))).status).toBe(401);
    expect((await POST(makeRequest(body()))).status).toBe(401);
    expect(net.fetched).toEqual([]);
  });

  it('answers 503 when the server does not know its Supabase project', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    mockNetwork({});
    const res = await POST(makeRequest(body(), SECRET));
    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe('not_configured');
  });

  it('rejects malformed bodies, foreign URLs and oversized bodies', async () => {
    const net = mockNetwork({});
    expect((await POST(makeRequest('not json', SECRET))).status).toBe(400);
    expect((await POST(makeRequest({}, SECRET))).status).toBe(400);
    const foreign = await POST(makeRequest(body({ scenes: [{ image_url: 'https://evil.example/a.jpg', seconds: 5 }] }), SECRET));
    expect(foreign.status).toBe(400);
    expect((await foreign.json()).error).toMatch(/foreign host/);
    expect((await POST(makeRequest(body({ upload_url: 'https://evil.example/x.mp4?token=t' }), SECRET))).status).toBe(400);
    expect((await POST(makeRequest(JSON.stringify({ pad: 'x'.repeat(20_000), ...body() }), SECRET))).status).toBe(413);
    expect(net.fetched).toEqual([]);
    expect(net.uploads).toEqual([]);
  });

  it('renders, uploads the MP4 to the signed URL and reports the facts', async () => {
    const net = mockNetwork({});
    const res = await POST(makeRequest(body(), SECRET));
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const json = await res.json();
    expect(json).toMatchObject({ ok: true, seconds: 5.5, fps: 30, width: 1080, height: 1920, zoom: true, scenes: 3 });
    expect(json.render_ms).toBeGreaterThan(0);

    expect(net.fetched).toEqual([CARD('peak'), CARD('growth')]);
    expect(net.uploads).toHaveLength(1);
    const up = net.uploads[0];
    expect(up.url).toBe(UPLOAD);
    expect(up.headers['content-type']).toBe('video/mp4');
    expect(up.headers['x-upsert']).toBe('true');
    expect(up.bytes.subarray(4, 8).toString('latin1')).toBe('ftyp');
    expect(up.bytes.length).toBe(json.bytes);
  }, 180_000);

  it('honours zoom:false and outro:false', async () => {
    mockNetwork({});
    const res = await POST(makeRequest(body({ zoom: false, outro: false, scenes: [{ image_url: CARD('peak'), seconds: 3 }, { image_url: CARD('growth'), seconds: 3 }] }), SECRET));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, seconds: 5.5, zoom: false, scenes: 2 });
  }, 180_000);

  it('answers 502 when a card cannot be loaded, and uploads nothing', async () => {
    for (const opts of [{ card: null }, { cardStatus: 404 }, { card: Buffer.alloc(0) }]) {
      const net = mockNetwork(opts);
      const res = await POST(makeRequest(body(), SECRET));
      expect(res.status).toBe(502);
      expect((await res.json()).code).toBe('image_fetch_failed');
      expect(net.uploads).toEqual([]);
      vi.unstubAllGlobals();
    }
  });

  it('answers 400 when the image is not a 1080×1350 card', async () => {
    const net = mockNetwork({ card: await cardBytes(1080, 1080) });
    const res = await POST(makeRequest(body(), SECRET));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/1080×1080/);
    expect(net.uploads).toEqual([]);
  });

  it('answers 500 ffmpeg_missing when the binary is not in the bundle', async () => {
    process.env.FFMPEG_PATH = '/nonexistent/ffmpeg-binary';
    const net = mockNetwork({});
    const res = await POST(makeRequest(body(), SECRET));
    expect(res.status).toBe(500);
    expect((await res.json()).code).toBe('ffmpeg_missing');
    expect(net.uploads).toEqual([]);
  }, 60_000);

  it('answers 502 upload_failed when storage refuses or the upload breaks', async () => {
    mockNetwork({ uploadStatus: 413 });
    const refused = await POST(makeRequest(body(), SECRET));
    expect(refused.status).toBe(502);
    const json = await refused.json();
    expect(json.code).toBe('upload_failed');
    expect(json.error).toMatch(/HTTP 413/);
    vi.unstubAllGlobals();

    mockNetwork({ uploadThrows: true });
    const broken = await POST(makeRequest(body(), SECRET));
    expect(broken.status).toBe(502);
    expect((await broken.json()).code).toBe('upload_failed');
  }, 180_000);
});
