import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

// On-demand ISR revalidation for streamer pages, called by the StreamHub
// backend on live/offline transitions BEFORE its Google Indexing API ping
// (LIVE-badge pipeline): purging the Full Route Cache here means Googlebot's
// ping-triggered crawl sees the current live state instead of up-to-300s-stale
// HTML. Shared secret lives as REVALIDATE_SECRET on Vercel and in Supabase
// (backend side) — while unset the route answers 404 (disabled), the same
// env-guard idiom as /api/dev-login.

// Leading alphanumeric mirrors the isIndexableStreamerSlug gate; the charset
// covers collision suffixes like "illojuan-075649" / "-OPjYcQ" mid-string and
// rules out path traversal.
const SLUG_RE = /^[a-z0-9][a-zA-Z0-9_-]{0,99}$/;

function secretMatches(provided: string, expected: string): boolean {
  // sha256 both sides so timingSafeEqual always compares equal-length buffers.
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return new Response(null, { status: 404 });
  }

  const provided = request.headers.get('x-revalidate-secret') ?? '';
  if (!secretMatches(provided, secret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let slug: unknown;
  try {
    ({ slug } = await request.json());
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  if (typeof slug !== 'string' || !SLUG_RE.test(slug)) {
    return NextResponse.json({ error: 'invalid slug' }, { status: 400 });
  }

  revalidatePath(`/streamer/${slug}`);
  console.log(`[revalidate] /streamer/${slug}`);
  return new Response(null, { status: 204 });
}
