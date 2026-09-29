import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../route';
import { renderConfirmPage, renderMessagePage, safeHttpsUrl, statusLabel } from '@/lib/social-approve-page';

// The callback relays to the social-tiktok-auth edge function; fetch is
// stubbed. These tests pin the contract: nothing but code/state/error leaves
// the server, every outcome is a page, nothing sensitive is echoed.

const STATE = 'a'.repeat(64);
const CODE = 'tiktok-auth-code-123';

function mockFetch(answer: unknown, status = 200) {
  return vi.fn(async () => new Response(typeof answer === 'string' ? answer : JSON.stringify(answer), { status, headers: { 'content-type': 'application/json' } }));
}

function get(query: string): Promise<Response> {
  return GET(new Request(`https://streamertimes.tv/api/social/tiktok/callback${query}`));
}

describe('/api/social/tiktok/callback', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://ref.supabase.co';
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  });

  it('relays code and state, region-pinned, and shows who is connected', async () => {
    const f = mockFetch({ ok: true, code: 'connected', message: "Connected as Streamer Times. The weekly video will arrive in this account's TikTok inbox.", account: 'Streamer Times' });
    vi.stubGlobal('fetch', f);
    const res = await get(`?code=${CODE}&scopes=user.info.basic,video.upload&state=${STATE}`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('referrer-policy')).toBe('no-referrer');
    expect(res.headers.get('x-robots-tag')).toContain('noindex');
    expect(res.headers.get('content-security-policy')).toContain("default-src 'none'");

    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://ref.supabase.co/functions/v1/social-tiktok-auth?forceFunctionRegion=eu-west-1');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ mode: 'callback', code: CODE, state: STATE, error: null, error_description: null });
    // the relay sends no credential of its own
    expect(Object.keys(init.headers as Record<string, string>)).toEqual(['content-type']);

    const body = await res.text();
    expect(body).toContain('TikTok connected');
    expect(body).toContain('Connected as Streamer Times');
    expect(body).not.toContain(CODE);
    expect(body).not.toContain(STATE);
  });

  it('rejects an incomplete link without calling the backend', async () => {
    const f = mockFetch({ ok: true, code: 'connected', message: 'x' });
    vi.stubGlobal('fetch', f);
    for (const q of ['', `?code=${CODE}`, `?state=${STATE}`, `?code=&state=${STATE}`, `?code=${CODE}&state=`, `?code=${CODE}&state=${'a'.repeat(201)}`, `?code=${'c'.repeat(2001)}&state=${STATE}`]) {
      const res = await get(q);
      expect(res.status, q).toBe(400);
      expect(await res.text(), q).toContain('Invalid link');
    }
    expect(f).not.toHaveBeenCalled();
  });

  it('passes on a decline at TikTok (error without code)', async () => {
    const f = mockFetch({ ok: false, code: 'declined', message: 'TikTok reported that access was not granted. Nothing was changed.' }, 422);
    vi.stubGlobal('fetch', f);
    const res = await get(`?error=access_denied&error_description=User%20denied&state=${STATE}`);
    expect(res.status).toBe(422);
    expect(JSON.parse(String((f.mock.calls[0] as unknown as [string, RequestInit])[1].body))).toEqual({ mode: 'callback', code: null, state: STATE, error: 'access_denied', error_description: 'User denied' });
    const body = await res.text();
    expect(body).toContain('Not connected');
    expect(body).toContain('access was not granted');
  });

  it('renders every refusal of the backend as a page with its status', async () => {
    for (const [code, status] of [['state_mismatch', 403], ['state_expired', 403], ['no_pending_connect', 403], ['exchange_refused', 422], ['missing_scope', 422], ['exchange_failed', 502], ['internal_error', 500]] as Array<[string, number]>) {
      vi.stubGlobal('fetch', mockFetch({ ok: false, code, message: `Refused: ${code}.` }, status));
      const res = await get(`?code=${CODE}&state=${STATE}`);
      expect(res.status, code).toBe(status);
      expect(await res.text(), code).toContain(`Refused: ${code}.`);
      vi.unstubAllGlobals();
    }
  });

  it('never trusts the shape of the answer', async () => {
    // a "not ok" behind HTTP 200 is a refusal
    vi.stubGlobal('fetch', mockFetch({ ok: false, code: 'state_mismatch', message: 'No.' }, 200));
    expect((await get(`?code=${CODE}&state=${STATE}`)).status).toBe(502);
    vi.unstubAllGlobals();

    // HTML from a gateway, an empty object, an ok without a message
    for (const [answer, status] of [['<html>502</html>', 502], [{}, 200], [{ ok: true }, 200], [{ ok: 'yes', message: 'Connected' }, 200]] as Array<[unknown, number]>) {
      vi.stubGlobal('fetch', mockFetch(answer, status));
      const res = await get(`?code=${CODE}&state=${STATE}`);
      expect(res.status).toBeGreaterThanOrEqual(400);
      const body = await res.text();
      expect(body).toContain('Not connected');
      expect(body).toContain('Nothing was changed');
      vi.unstubAllGlobals();
    }
  });

  it('escapes whatever the backend says', async () => {
    vi.stubGlobal('fetch', mockFetch({ ok: true, code: 'connected', message: 'Connected as <img src=x onerror=alert(1)>.', account: '<img>' }));
    const body = await (await get(`?code=${CODE}&state=${STATE}`)).text();
    expect(body).not.toContain('<img src=x');
    expect(body).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('answers with a page when the backend is unreachable or not configured', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed'); }));
    const down = await get(`?code=${CODE}&state=${STATE}`);
    expect(down.status).toBe(502);
    expect(await down.text()).toContain('unreachable');
    vi.unstubAllGlobals();

    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const f = mockFetch({});
    vi.stubGlobal('fetch', f);
    const off = await get(`?code=${CODE}&state=${STATE}`);
    expect(off.status).toBe(503);
    expect(f).not.toHaveBeenCalled();
  });
});

describe('approval page: the weekly video', () => {
  const FIELDS = { post: '2d0c6a7e-4b0e-4d57-9a53-5f3f0b3c8a11', action: 'veto', variant: null, exp: '1790607600', sig: 'a'.repeat(64) };
  const VIDEO = 'https://ref.supabase.co/storage/v1/object/public/social-videos/video/2026-09-21/weekly-v1.mp4';
  const post = {
    kind: 'video_weekly',
    period_label: 'Week 39',
    slot: 0,
    streamer: 'Recrent', // the streamer of the opening scene
    moment: null,
    status: 'scheduled',
    publish_label: 'Thu 1 Oct 17:00 UTC',
    image_urls: ['https://ref.supabase.co/storage/v1/object/public/social-cards/moment/2026-09-21/p0-recrent-v2.jpg'],
    card_text: null,
    instagram: null,
    x: null,
    tiktok: 'Recrent had the moment of Week 39. <b>x</b>\n\n#twitch #Recrent',
    video_url: VIDEO,
  };
  const answer = { ok: true, code: 'preview', title: 'Veto the weekly video for Week 39?', description: 'No draft is sent to TikTok on Thu 1 Oct 17:00 UTC. You can undo this before then.', post };

  it('shows the video as a video, not as proposal #1 of a streamer', () => {
    const html = renderConfirmPage(answer, FIELDS, '/api/social/approve');
    expect(html).toContain('Weekly video for TikTok');
    expect(html).not.toContain('#1 Recrent');
    expect(html).toContain(`href="${VIDEO}"`);
    expect(html).toContain('Watch the video');
    expect(html).toContain('Caption to paste in TikTok');
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
    expect(html).toContain('draft arrives Thu 1 Oct 17:00 UTC');
    expect(html).toContain('<button class="btn danger" type="submit">Confirm</button>');
    expect(html).not.toContain('Instagram caption');
  });

  it('labels the states of a delivery, and leaves the other kinds as they were', () => {
    expect(statusLabel('published', 'video_weekly')).toBe('in the TikTok inbox');
    expect(statusLabel('failed', 'video_weekly')).toBe('not delivered');
    expect(statusLabel('vetoed', 'video_weekly')).toBe('vetoed');
    expect(statusLabel('published')).toBe('posted');
    expect(statusLabel('published', 'weekly')).toBe('posted');
    const done = renderMessagePage({ ok: true, code: 'applied', message: 'Vetoed.', post: { ...post, status: 'published' } });
    expect(done).toContain('Status: in the TikTok inbox · delivered Thu 1 Oct 17:00 UTC');
    // a vetoed video promises nothing
    const vetoed = renderMessagePage({ ok: true, code: 'applied', message: 'Vetoed.', post: { ...post, status: 'vetoed' } });
    expect(vetoed).toContain('Status: vetoed · slot Thu 1 Oct 17:00 UTC');
    expect(vetoed).not.toContain('draft arrives');
  });

  it('links only a plain https video URL', () => {
    expect(safeHttpsUrl(VIDEO)).toBe(VIDEO);
    for (const bad of ['javascript:alert(1)', 'http://ref.supabase.co/a.mp4', 'https://user:pw@ref.supabase.co/a.mp4', 'data:text/html,x', '//evil.example/a.mp4', 'not a url', '', null, undefined]) {
      expect(safeHttpsUrl(bad), String(bad)).toBeNull();
      const html = renderConfirmPage({ ...answer, post: { ...post, video_url: bad as string | null } }, FIELDS, '/api/social/approve');
      expect(html, String(bad)).not.toContain('Watch the video');
    }
  });

  it('still renders a recap and a moment the old way', () => {
    const recap = renderMessagePage({ ok: true, code: 'applied', message: 'ok', post: { ...post, kind: 'weekly', streamer: null, instagram: 'IG text', tiktok: null, video_url: null } });
    expect(recap).toContain('Weekly recap');
    expect(recap).toContain('Instagram caption');
    expect(recap).not.toContain('Watch the video');
    const moment = renderMessagePage({ ok: true, code: 'applied', message: 'ok', post: { ...post, kind: 'moment', slot: 1, tiktok: null, video_url: null } });
    expect(moment).toContain('#2 Recrent');
  });
});
