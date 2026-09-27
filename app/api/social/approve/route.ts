import { type ApproveAnswer, readFields, renderConfirmPage, renderMessagePage } from '@/lib/social-approve-page';
import { relayApprove } from '@/lib/server/social-approve-relay';

// /api/social/approve — the page behind every button of the social approval
// mail (Epic M27 §6, StreamHub). GET shows what the click will do and a
// Confirm button (read-only, so mail scanners that pre-open links change
// nothing); POST applies it. Both relay server to server to the
// social-approve edge function, which verifies the HMAC signature and owns
// the state change. This route holds no secret.
//
// Lives under /api/ on purpose: outside the locale tree (no middleware
// rewrite), disallowed in robots.txt, and Supabase cannot serve HTML itself.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // "use text B" re-renders a card inside the edge function

const HEADERS: Record<string, string> = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  // The query string carries the signature: never leak it as a Referer.
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy':
    "default-src 'none'; img-src https:; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
};

function html(body: string, status = 200): Response {
  return new Response(body, { status, headers: HEADERS });
}

const INVALID: ApproveAnswer = { ok: false, code: 'bad_request', title: 'Invalid link', message: 'This link is incomplete. Use the buttons from the mail.' };

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const fields = readFields((k) => url.searchParams.get(k));
  if (!fields) return html(renderMessagePage(INVALID), 400);
  const { status, answer } = await relayApprove('preview', fields);
  if (!answer.ok) return html(renderMessagePage(answer), status >= 400 ? status : 400);
  return html(renderConfirmPage(answer, fields, '/api/social/approve'));
}

export async function POST(request: Request): Promise<Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return html(renderMessagePage(INVALID), 400);
  }
  const fields = readFields((k) => {
    const v = form.get(k);
    return typeof v === 'string' ? v : null;
  });
  if (!fields) return html(renderMessagePage(INVALID), 400);
  const { status, answer } = await relayApprove('apply', fields);
  return html(renderMessagePage(answer), answer.ok ? 200 : status >= 400 ? status : 409);
}
