import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { parseSocialCardSpec, SOCIAL_CARD_SPEC_VERSION, SocialCardSpecError } from '@/lib/og/social/types';
import { renderSocialCard, type SocialCardFormat } from '@/lib/og/social/render';

// POST /api/social/card — renders one social card (1080×1350) from a spec the
// StreamHub backend computed (Epic M27 §A1/A2). Secret-gated like
// /api/revalidate: 404 while SOCIAL_RENDER_SECRET is unset, 401 on a wrong
// header. Not cached, never public. The caller is a Supabase edge function;
// it passes x-vercel-protection-bypass so the Vercel WAF (bot protection in
// challenge mode) lets the server-to-server request through.
//
// Query: ?format=jpeg (default, Instagram needs JPEG) | png (local review).
// Response headers: x-social-card-version (layout contract version),
// x-social-avatar-fallbacks (comma-separated rows that got the initials badge).

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_BODY_BYTES = 256 * 1024;

function secretMatches(provided: string, expected: string): boolean {
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const secret = process.env.SOCIAL_RENDER_SECRET;
  if (!secret) return new Response(null, { status: 404 });

  const provided = request.headers.get('x-social-secret') ?? '';
  if (!secretMatches(provided, secret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'body too large' }, { status: 413 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  let spec;
  try {
    spec = parseSocialCardSpec(raw);
  } catch (err) {
    if (err instanceof SocialCardSpecError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }

  const url = new URL(request.url);
  const format: SocialCardFormat = url.searchParams.get('format') === 'png' ? 'png' : 'jpeg';

  try {
    const rendered = await renderSocialCard(spec, format);
    return new Response(new Uint8Array(rendered.bytes), {
      status: 200,
      headers: {
        'Content-Type': rendered.contentType,
        'Cache-Control': 'no-store',
        'x-social-card-version': String(SOCIAL_CARD_SPEC_VERSION),
        'x-social-avatar-fallbacks': rendered.avatarFallbacks.join(','),
      },
    });
  } catch (err) {
    console.error('[social/card] render failed:', err);
    return NextResponse.json({ error: 'render failed' }, { status: 500 });
  }
}
