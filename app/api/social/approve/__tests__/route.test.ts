import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '../route';
import { readFields, renderConfirmPage, renderMessagePage } from '@/lib/social-approve-page';

// The approval page relays to the social-approve edge function; fetch is
// stubbed, so these tests pin the page contract: read-only GET, POST applies,
// every refusal renders a page, nothing leaks the signature.

const POST_ID = '2d0c6a7e-4b0e-4d57-9a53-5f3f0b3c8a11';
const SIG = 'a'.repeat(64);
const QUERY = `post=${POST_ID}&action=choose&exp=1790607600&sig=${SIG}`;

const PREVIEW = {
  ok: true,
  code: 'preview',
  title: 'Post #2 eliasn97 instead?',
  description: 'This proposal goes out on Wed 23 Sep 17:00 UTC; the currently scheduled one is taken back.',
  post: {
    kind: 'moment',
    period_label: 'Week 38',
    slot: 1,
    streamer: 'eliasn97',
    moment: 'personal 90-day viewer record',
    status: 'proposed',
    publish_label: 'Wed 23 Sep 17:00 UTC',
    image_urls: ['https://ref.supabase.co/storage/v1/object/public/social-cards/moment/p1.jpg'],
    card_text: 'Two walkouts <script>alert(1)</script>',
    instagram: 'IG',
    x: 'X',
  },
  group: [
    { slot: 0, streamer: 'Recrent', status: 'scheduled' },
    { slot: 1, streamer: 'eliasn97', status: 'proposed' },
  ],
};

function mockFetch(answer: unknown, status = 200) {
  return vi.fn(async () => new Response(JSON.stringify(answer), { status, headers: { 'content-type': 'application/json' } }));
}

describe('/api/social/approve', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://ref.supabase.co';
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('GET previews read-only: relays mode=preview and renders a confirm form', async () => {
    const f = mockFetch(PREVIEW);
    vi.stubGlobal('fetch', f);
    const res = await GET(new Request(`https://streamertimes.tv/api/social/approve?${QUERY}`));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(res.headers.get('referrer-policy')).toBe('no-referrer');
    expect(res.headers.get('x-robots-tag')).toContain('noindex');
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://ref.supabase.co/functions/v1/social-approve?forceFunctionRegion=eu-west-1');
    expect(JSON.parse(String(init.body))).toMatchObject({ mode: 'preview', post: POST_ID, action: 'choose', sig: SIG });
    const body = await res.text();
    expect(body).toContain('<form method="post" action="/api/social/approve">');
    expect(body).toContain(`name="sig" value="${SIG}"`);
    expect(body).not.toContain('<script>');
    expect(body).toContain('&lt;script&gt;');
    expect(body).toContain('#1 Recrent: scheduled');
  });

  it('POST applies and shows the result with follow-up links', async () => {
    const f = mockFetch({
      ok: true,
      code: 'applied',
      title: 'Done',
      message: 'Scheduled. #2 eliasn97 goes out on Wed 23 Sep 17:00 UTC.',
      post: { ...PREVIEW.post, status: 'scheduled' },
      group: PREVIEW.group,
      links: [{ label: 'Veto: skip this week', url: 'https://streamertimes.tv/api/social/approve?post=x&action=veto&exp=1&sig=y', tone: 'danger' }],
    });
    vi.stubGlobal('fetch', f);
    const form = new URLSearchParams(QUERY);
    const res = await POST(new Request('https://streamertimes.tv/api/social/approve', { method: 'POST', body: form }));
    expect(res.status).toBe(200);
    expect(JSON.parse(String((f.mock.calls[0] as unknown as [string, RequestInit])[1].body)).mode).toBe('apply');
    const body = await res.text();
    expect(body).toContain('Scheduled. #2 eliasn97 goes out');
    expect(body).toContain('Veto: skip this week');
    expect(body).toContain('action=veto&amp;exp=1');
  });

  it('refusals render a page with the reason, never a form', async () => {
    vi.stubGlobal('fetch', mockFetch({ ok: false, code: 'expired', message: 'Too late: the post time has passed.' }, 410));
    const res = await GET(new Request(`https://streamertimes.tv/api/social/approve?${QUERY}`));
    expect(res.status).toBe(410);
    const body = await res.text();
    expect(body).toContain('Too late');
    expect(body).not.toContain('<form');
  });

  it('incomplete or malformed links never reach the edge function', async () => {
    const f = mockFetch(PREVIEW);
    vi.stubGlobal('fetch', f);
    for (const q of ['', `post=${POST_ID}&action=choose&exp=1`, `post=nope&action=choose&exp=1&sig=${SIG}`, `${QUERY}&variant=12`]) {
      const res = await GET(new Request(`https://streamertimes.tv/api/social/approve?${q}`));
      expect(res.status).toBe(400);
    }
    expect(f).not.toHaveBeenCalled();
  });

  it('an unreachable edge function becomes a page, not a crash', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNRESET'); }));
    const res = await POST(new Request('https://streamertimes.tv/api/social/approve', { method: 'POST', body: new URLSearchParams(QUERY) }));
    expect(res.status).toBe(502);
    expect(await res.text()).toContain('unreachable');
  });
});

describe('social approve page helpers', () => {
  it('readFields keeps variant only as one digit', () => {
    const get = (q: string) => (k: string) => new URLSearchParams(q).get(k);
    expect(readFields(get(QUERY))).toMatchObject({ post: POST_ID, action: 'choose', variant: null });
    expect(readFields(get(`${QUERY}&variant=1`))?.variant).toBe('1');
    expect(readFields(get(QUERY.replace(SIG, 'zz')))).toBeNull();
  });

  it('the veto confirm button is styled as dangerous, copy has no dashes', () => {
    const html = renderConfirmPage({ ...PREVIEW, title: 'Skip Post B for Week 38?' }, { post: POST_ID, action: 'veto', variant: null, exp: '1', sig: SIG }, '/api/social/approve');
    expect(html).toContain('class="btn danger" type="submit"');
    expect(html).not.toMatch(/[—–]/);
    expect(renderMessagePage({ ok: false, code: 'bad_signature', message: 'This link is not valid.' })).toContain('This link is not valid.');
  });
});
