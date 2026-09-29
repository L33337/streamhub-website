import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { renderSocialVideo, SocialVideoError } from '@/lib/og/social/video';
import { parseVideoRequest, VideoRequestError } from '@/lib/og/social/video-request';

// POST /api/social/video — builds the weekly vertical video (1080×1920 MP4)
// from cards that are already in the `social-cards` bucket and uploads it to
// the signed URL the caller hands over (Epic M27 Phase 3). Same gate as
// /api/social/card: 404 while SOCIAL_RENDER_SECRET is unset, 401 on a wrong
// header; the caller (Supabase edge function generate-social-video) also
// sends x-vercel-protection-bypass to pass the WAF.
//
// Why the route uploads instead of answering with the file: a function
// response is capped at 4.5 MB and a video is not. The signed URL is valid
// for exactly one object, so the website needs no storage key.
//
// Answers JSON: {ok, bytes, seconds, fps, width, height, zoom, scenes,
// render_ms} or {ok:false, code, error}. Codes the caller acts on:
//   render_timeout (504) → retry with "zoom": false (about half the work)

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const MAX_BODY_BYTES = 16 * 1024;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const IMAGE_TIMEOUT_MS = 8_000;
const FFMPEG_TIMEOUT_MS = 90_000;
const UPLOAD_TIMEOUT_MS = 20_000;

function secretMatches(provided: string, expected: string): boolean {
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

function fail(status: number, code: string, error: string) {
  return NextResponse.json({ ok: false, code, error }, { status, headers: { 'Cache-Control': 'no-store' } });
}

class UpstreamError extends Error {}

async function fetchCard(url: string): Promise<Buffer> {
  let res: Response;
  try {
    res = await fetch(url, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS) });
  } catch (err) {
    throw new UpstreamError(`${url}: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!res.ok) throw new UpstreamError(`${url}: HTTP ${res.status}`);
  const declared = Number(res.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_IMAGE_BYTES) throw new UpstreamError(`${url}: ${declared} bytes`);
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) throw new UpstreamError(`${url}: ${bytes.length} bytes`);
  return bytes;
}

export async function POST(request: Request) {
  const secret = process.env.SOCIAL_RENDER_SECRET;
  if (!secret) return new Response(null, { status: 404 });
  if (!secretMatches(request.headers.get('x-social-secret') ?? '', secret)) return fail(401, 'unauthorized', 'unauthorized');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return fail(503, 'not_configured', 'NEXT_PUBLIC_SUPABASE_URL is not set');

  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return fail(413, 'body_too_large', 'body too large');

  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return fail(413, 'body_too_large', 'body too large');
    raw = JSON.parse(text);
  } catch {
    return fail(400, 'bad_request', 'invalid JSON body');
  }

  let spec;
  try {
    spec = parseVideoRequest(raw, supabaseUrl);
  } catch (err) {
    if (err instanceof VideoRequestError) return fail(400, 'bad_request', err.message);
    throw err;
  }

  let images: Buffer[];
  try {
    images = await Promise.all(spec.scenes.map((s) => fetchCard(s.image_url)));
  } catch (err) {
    return fail(502, 'image_fetch_failed', err instanceof Error ? err.message : String(err));
  }

  let video;
  try {
    video = await renderSocialVideo(
      { scenes: spec.scenes.map((s, i) => ({ image: images[i], seconds: s.seconds })), outro: spec.outro, zoom: spec.zoom },
      { timeoutMs: FFMPEG_TIMEOUT_MS },
    );
  } catch (err) {
    if (err instanceof SocialVideoError) {
      if (err.code === 'BAD_INPUT') return fail(400, 'bad_request', err.message);
      if (err.code === 'FFMPEG_TIMEOUT') return fail(504, 'render_timeout', err.message);
      console.error('[social/video] ffmpeg:', err.code, err.message);
      return fail(500, err.code === 'FFMPEG_MISSING' ? 'ffmpeg_missing' : 'render_failed', err.message);
    }
    console.error('[social/video] render failed:', err);
    return fail(500, 'render_failed', 'render failed');
  }

  try {
    const res = await fetch(spec.upload_url, {
      method: 'PUT',
      headers: { 'content-type': 'video/mp4', 'cache-control': 'max-age=31536000', 'x-upsert': 'true' },
      body: new Uint8Array(video.bytes),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
    });
    if (!res.ok) {
      const body = (await res.text().catch(() => '')).slice(0, 300);
      return fail(502, 'upload_failed', `storage answered HTTP ${res.status}: ${body}`);
    }
  } catch (err) {
    return fail(502, 'upload_failed', err instanceof Error ? err.message : String(err));
  }

  return NextResponse.json(
    {
      ok: true,
      bytes: video.bytes.length,
      seconds: video.seconds,
      fps: video.fps,
      width: video.width,
      height: video.height,
      zoom: video.zoom,
      scenes: video.scenes,
      render_ms: video.renderMs,
    },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  );
}
