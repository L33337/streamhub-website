import { describe, expect, it, vi } from 'vitest';
import { loadOgAvatar, sniffOgAvatarKind } from '@/lib/og/avatar';

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const GIF_BYTES = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
// RIFF....WEBP — detected by Satori but NOT rendered ("Unsupported image type").
const WEBP_BYTES = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x10, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38,
]);
const HTML_BYTES = new TextEncoder().encode('<!DOCTYPE html><html><body>403</body></html>');

function response(body: Uint8Array, status = 200, headers: Record<string, string> = {}): Response {
  // `.slice().buffer` yields a plain ArrayBuffer, which BodyInit accepts.
  return new Response(body.slice().buffer, { status, headers });
}

function fetchReturning(res: Response | Error): typeof fetch {
  return vi.fn(async () => {
    if (res instanceof Error) throw res;
    return res;
  }) as unknown as typeof fetch;
}

describe('sniffOgAvatarKind', () => {
  it('recognises the raster formats Satori renders', () => {
    expect(sniffOgAvatarKind(PNG_BYTES)).toBe('png');
    expect(sniffOgAvatarKind(JPEG_BYTES)).toBe('jpeg');
    expect(sniffOgAvatarKind(GIF_BYTES)).toBe('gif');
  });

  it('rejects webp, html and empty bodies', () => {
    expect(sniffOgAvatarKind(WEBP_BYTES)).toBeNull();
    expect(sniffOgAvatarKind(HTML_BYTES)).toBeNull();
    expect(sniffOgAvatarKind(new Uint8Array())).toBeNull();
  });
});

describe('loadOgAvatar', () => {
  it('returns null without a URL and never calls fetch', async () => {
    const fetchImpl = fetchReturning(response(PNG_BYTES));
    expect(await loadOgAvatar(null, { fetchImpl })).toBeNull();
    expect(await loadOgAvatar('', { fetchImpl })).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('wraps a PNG body in a base64 data URL', async () => {
    const out = await loadOgAvatar('https://cdn.example/a.png', {
      fetchImpl: fetchReturning(response(PNG_BYTES)),
    });
    expect(out).toBe(`data:image/png;base64,${Buffer.from(PNG_BYTES).toString('base64')}`);
  });

  it('wraps a JPEG body even when the CDN lies about the content type', async () => {
    const out = await loadOgAvatar('https://cdn.example/a', {
      fetchImpl: fetchReturning(response(JPEG_BYTES, 200, { 'content-type': 'text/plain' })),
    });
    expect(out?.startsWith('data:image/jpeg;base64,')).toBe(true);
  });

  it('returns null for a 403 HTML page (the yt3.ggpht.com dead-avatar case)', async () => {
    const out = await loadOgAvatar('https://yt3.ggpht.com/dead', {
      fetchImpl: fetchReturning(response(HTML_BYTES, 403, { 'content-type': 'text/html' })),
    });
    expect(out).toBeNull();
  });

  it('returns null for a 200 whose body is not a supported raster image', async () => {
    expect(
      await loadOgAvatar('https://cdn.example/a.webp', {
        fetchImpl: fetchReturning(response(WEBP_BYTES, 200, { 'content-type': 'image/webp' })),
      }),
    ).toBeNull();
    expect(
      await loadOgAvatar('https://cdn.example/a', {
        fetchImpl: fetchReturning(response(HTML_BYTES, 200, { 'content-type': 'text/html' })),
      }),
    ).toBeNull();
  });

  it('returns null on a transport error or timeout instead of throwing', async () => {
    expect(
      await loadOgAvatar('https://cdn.example/a.png', {
        fetchImpl: fetchReturning(Object.assign(new Error('aborted'), { name: 'TimeoutError' })),
      }),
    ).toBeNull();
  });

  it('refuses oversized bodies by header and by actual size', async () => {
    expect(
      await loadOgAvatar('https://cdn.example/a.png', {
        fetchImpl: fetchReturning(response(PNG_BYTES, 200, { 'content-length': '99999999' })),
      }),
    ).toBeNull();
    expect(
      await loadOgAvatar('https://cdn.example/a.png', {
        fetchImpl: fetchReturning(response(PNG_BYTES)),
        maxBytes: 4,
      }),
    ).toBeNull();
  });

  it('never sends cookies and asks only for raster formats', async () => {
    const fetchImpl = fetchReturning(response(PNG_BYTES));
    await loadOgAvatar('https://cdn.example/a.png', { fetchImpl });
    const init = (fetchImpl as unknown as { mock: { calls: [string, RequestInit][] } }).mock
      .calls[0][1];
    expect(init.credentials).toBe('omit');
    expect((init.headers as Record<string, string>).Accept).toBe('image/png,image/jpeg,image/gif');
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});
