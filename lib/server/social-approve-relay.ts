import { withFunctionRegion } from '@/lib/supabase/region';
import type { ApproveAnswer, ApproveFields } from '@/lib/social-approve-page';

// Server-to-server relay from /api/social/approve to the social-approve edge
// function (StreamHub, deployed --no-verify-jwt: the HMAC signature in the
// fields is the only authorization). Region-pinned like every first-party
// function call. Never throws: every failure becomes an answer the page can
// show, and none of them changes anything.

function functionUrl(): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return withFunctionRegion(`${base.replace(/\/+$/, '')}/functions/v1/social-approve`);
}

export async function relayApprove(
  mode: 'preview' | 'apply',
  fields: ApproveFields,
  fetchImpl: typeof fetch = fetch,
): Promise<{ status: number; answer: ApproveAnswer }> {
  const url = functionUrl();
  if (!url) return { status: 503, answer: { ok: false, code: 'not_configured', message: 'The approval service is not configured.' } };
  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode, ...fields }),
      cache: 'no-store',
      signal: AbortSignal.timeout(55_000),
    });
    let answer: ApproveAnswer;
    try {
      answer = (await res.json()) as ApproveAnswer;
    } catch {
      answer = { ok: false, code: `http_${res.status}`, message: 'The approval service answered with an error. Nothing was changed.' };
    }
    return { status: res.status, answer };
  } catch {
    return { status: 502, answer: { ok: false, code: 'unreachable', message: 'The approval service is unreachable. Nothing was changed; try the link again.' } };
  }
}
