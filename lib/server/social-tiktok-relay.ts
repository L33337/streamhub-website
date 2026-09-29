import { withFunctionRegion } from '@/lib/supabase/region';

// Server-to-server relay from /api/social/tiktok/callback to the
// social-tiktok-auth edge function (StreamHub, deployed --no-verify-jwt: the
// one-time OAuth state is the only authorization). The website holds neither
// the TikTok client secret nor any token; it only passes on what TikTok put
// into the query string. Never throws: every failure becomes an answer the
// page can show.

export interface TikTokConnectAnswer {
  ok: boolean;
  code: string;
  message: string;
  account?: string | null;
}

export interface TikTokCallbackFields {
  code: string | null;
  state: string | null;
  error: string | null;
  error_description: string | null;
}

function functionUrl(): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return withFunctionRegion(`${base.replace(/\/+$/, '')}/functions/v1/social-tiktok-auth`);
}

export async function relayTikTokCallback(fields: TikTokCallbackFields, fetchImpl: typeof fetch = fetch): Promise<{ status: number; answer: TikTokConnectAnswer }> {
  const url = functionUrl();
  if (!url) return { status: 503, answer: { ok: false, code: 'not_configured', message: 'The connection service is not configured.' } };
  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode: 'callback', ...fields }),
      cache: 'no-store',
      signal: AbortSignal.timeout(40_000),
    });
    let answer: TikTokConnectAnswer;
    try {
      const raw = (await res.json()) as Partial<TikTokConnectAnswer>;
      if (typeof raw.ok !== 'boolean' || typeof raw.message !== 'string') throw new Error('shape');
      answer = { ok: raw.ok, code: typeof raw.code === 'string' ? raw.code : `http_${res.status}`, message: raw.message, account: typeof raw.account === 'string' ? raw.account : null };
    } catch {
      answer = { ok: false, code: `http_${res.status}`, message: 'The connection service answered with an error. Nothing was changed.' };
    }
    // A 200 that says "not ok" is still a refusal.
    return { status: answer.ok ? 200 : res.status >= 400 ? res.status : 502, answer };
  } catch {
    return { status: 502, answer: { ok: false, code: 'unreachable', message: 'The connection service is unreachable. Nothing was changed; start the connection again.' } };
  }
}
