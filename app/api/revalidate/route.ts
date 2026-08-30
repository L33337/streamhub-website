import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { UI_LANGS } from '@/lib/i18n-core';

export const dynamic = 'force-dynamic';

// On-demand ISR revalidation for streamer pages, called by the StreamHub
// backend (1) on live/offline transitions BEFORE its Google Indexing API ping
// (LIVE-badge pipeline) and (2) after every generate-predictions run that
// wrote slots (since 2026-08-18): purging the Full Route Cache here means
// crawlers and visitors see the current live state and fresh predictions
// instead of up-to-30-min-stale HTML (the streamer route's TTL is 1800 s —
// this on-demand purge is exactly what makes that long TTL safe). Shared
// secret lives as REVALIDATE_SECRET on Vercel and in Supabase (backend side)
// — while unset the route answers 404 (disabled), the same env-guard idiom
// as /api/dev-login.

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

  // M22 locale routing: the cached route lives once per locale
  // (/[locale]/streamer/[slug]; unprefixed URLs are middleware-rewritten to
  // /en). Purge every variant — a live/offline flip changes all of them.
  // The bare path is kept first for safety across rewrite/cache-key semantics
  // (belt & braces; verified on the Vercel preview).
  revalidatePath(`/streamer/${slug}`);
  // The wiki page is its own route entry (revalidatePath does not descend into
  // nested segments), and a publish/takedown in streamer_wiki_profiles must
  // reach it too (2026-08-29; the M26 migration promised "flip + revalidate").
  revalidatePath(`/streamer/${slug}/wiki`);
  for (const locale of UI_LANGS) {
    revalidatePath(`/${locale}/streamer/${slug}`);
    revalidatePath(`/${locale}/streamer/${slug}/wiki`);
  }
  console.log(`[revalidate] /streamer/${slug} + /wiki (+${UI_LANGS.length} locale variants)`);
  return new Response(null, { status: 204 });
}
