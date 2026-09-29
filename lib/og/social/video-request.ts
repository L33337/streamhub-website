// Request contract of POST /api/social/video (Epic M27 Phase 3). Pure and
// unit-tested. The caller is the StreamHub edge function
// generate-social-video; the route itself knows no database and no TikTok.
//
//   {
//     "scenes":     [{ "image_url": "<public card URL>", "seconds": 5 }, …],
//     "outro":      true,
//     "zoom":       true,
//     "upload_url": "<signed Supabase upload URL for the MP4>"
//   }
//
// Both URL kinds are pinned to OUR Supabase project and to one bucket each:
// the route fetches and uploads with the server's network identity, so a
// free-form URL would make it a proxy (SSRF) for whoever holds the secret.

import { MAX_SCENE_SECONDS, MAX_SCENES, MIN_SCENE_SECONDS } from './video';

export const CARD_PATH_PREFIX = '/storage/v1/object/public/social-cards/';
export const UPLOAD_PATH_PREFIX = '/storage/v1/object/upload/sign/social-videos/';

export class VideoRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VideoRequestError';
  }
}

export interface VideoRequest {
  scenes: Array<{ image_url: string; seconds: number }>;
  outro: boolean;
  zoom: boolean;
  upload_url: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** https URL on the project's own host, no credentials, no odd port, path under `prefix`. */
function pinnedUrl(raw: unknown, host: string, prefix: string, what: string): URL {
  if (typeof raw !== 'string' || raw.length > 2000) throw new VideoRequestError(`${what}: not a URL`);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new VideoRequestError(`${what}: not a URL`);
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new VideoRequestError(`${what}: only plain https URLs`);
  if (url.hostname.toLowerCase() !== host) throw new VideoRequestError(`${what}: foreign host`);
  // new URL() already resolved "." and ".." segments; an encoded traversal stays literal.
  if (!url.pathname.startsWith(prefix) || /%2e|%2f|%5c|\\/i.test(url.pathname)) throw new VideoRequestError(`${what}: path outside ${prefix}`);
  return url;
}

export function parseVideoRequest(raw: unknown, supabaseUrl: string): VideoRequest {
  let host: string;
  try {
    host = new URL(supabaseUrl).hostname.toLowerCase();
  } catch {
    throw new VideoRequestError('server: NEXT_PUBLIC_SUPABASE_URL is not a URL');
  }
  if (!isRecord(raw)) throw new VideoRequestError('body: expected an object');

  if (!Array.isArray(raw.scenes) || raw.scenes.length === 0) throw new VideoRequestError('scenes: expected a non-empty array');
  if (raw.scenes.length > MAX_SCENES) throw new VideoRequestError(`scenes: at most ${MAX_SCENES}`);
  const scenes = raw.scenes.map((s, i) => {
    if (!isRecord(s)) throw new VideoRequestError(`scenes[${i}]: expected an object`);
    const url = pinnedUrl(s.image_url, host, CARD_PATH_PREFIX, `scenes[${i}].image_url`);
    if (!/\.jpe?g$/i.test(url.pathname)) throw new VideoRequestError(`scenes[${i}].image_url: not a JPEG`);
    if (url.search || url.hash) throw new VideoRequestError(`scenes[${i}].image_url: no query string`);
    const seconds = s.seconds;
    if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < MIN_SCENE_SECONDS || seconds > MAX_SCENE_SECONDS) {
      throw new VideoRequestError(`scenes[${i}].seconds: expected ${MIN_SCENE_SECONDS}..${MAX_SCENE_SECONDS}`);
    }
    return { image_url: url.toString(), seconds };
  });

  for (const key of ['outro', 'zoom'] as const) {
    if (raw[key] !== undefined && typeof raw[key] !== 'boolean') throw new VideoRequestError(`${key}: expected a boolean`);
  }

  const upload = pinnedUrl(raw.upload_url, host, UPLOAD_PATH_PREFIX, 'upload_url');
  if (!/\.mp4$/i.test(upload.pathname)) throw new VideoRequestError('upload_url: not an .mp4 path');
  if (!upload.searchParams.get('token')) throw new VideoRequestError('upload_url: no upload token');

  return {
    scenes,
    outro: raw.outro !== false,
    zoom: raw.zoom !== false,
    upload_url: upload.toString(),
  };
}
