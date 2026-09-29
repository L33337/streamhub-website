import { renderNoticePage } from '@/lib/social-approve-page';
import { relayTikTokCallback } from '@/lib/server/social-tiktok-relay';

// /api/social/tiktok/callback — where TikTok sends the browser back after the
// owner allowed the social automation to upload videos (Epic M27 Phase 3,
// StreamHub). This URL is the redirect URI registered in the TikTok app:
// renaming the route means changing it there in the same step.
//
// The route only relays ?code&state (or TikTok's ?error) server to server to
// the social-tiktok-auth edge function, which checks the one-time state,
// exchanges the code and stores the tokens. No secret and no token ever
// reaches the website or the browser; the page says who is connected.
//
// GET changes state here, unlike the approval page: the link is single-use,
// 15 minutes valid and bound to a connection the operator started, so a
// scanner that opens it first can at worst spend it.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const HEADERS: Record<string, string> = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  // The query string carries the authorization code: never leak it as a Referer.
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
};

function html(body: string, status: number): Response {
  return new Response(body, { status, headers: HEADERS });
}

/** A query value of sane size, or null. TikTok codes are long, so the cap is generous. */
function param(url: URL, key: string, max: number): string | null {
  const v = url.searchParams.get(key);
  return v !== null && v.length > 0 && v.length <= max ? v : null;
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const fields = {
    code: param(url, 'code', 2000),
    state: param(url, 'state', 200),
    error: param(url, 'error', 200),
    error_description: param(url, 'error_description', 500),
  };
  if (!fields.state || (!fields.code && !fields.error)) {
    return html(renderNoticePage('Invalid link', 'This link is incomplete. Start the connection again.', false), 400);
  }
  const { status, answer } = await relayTikTokCallback(fields);
  return html(renderNoticePage(answer.ok ? 'TikTok connected' : 'Not connected', answer.message, answer.ok), answer.ok ? 200 : status);
}
