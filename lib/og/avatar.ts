// Avatar loading for OG images (next/og = Satori).
//
// Satori fetches an `<img src="https://…">` itself and sniffs the bytes; it
// accepts png, apng, jpeg, gif and svg and THROWS `Unsupported image type` on
// everything else — webp, avif, and any non-image body. That is exactly what a
// dead CDN URL produces: yt3.ggpht.com answered 403 with an HTML page for a
// deleted channel's avatar (streamer babyslow, 2026-09-10…11), and every OG
// render of that streamer failed with a logged error while the page itself was
// fine. The stored avatar_url can go stale at any time (channel deleted,
// avatar rotated, CDN hiccup), so the OG route must never trust it blindly.
//
// This loader fetches the bytes first, verifies the magic number, and hands
// Satori a data: URL it cannot choke on. Anything unusable resolves to null
// and the caller falls back to the initials badge — a slightly plainer card
// beats a failed render.

export type OgAvatarKind = 'png' | 'jpeg' | 'gif';

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG = [0xff, 0xd8, 0xff];
const GIF = [0x47, 0x49, 0x46, 0x38];

function startsWith(bytes: Uint8Array, magic: number[]): boolean {
  if (bytes.length < magic.length) return false;
  return magic.every((b, i) => bytes[i] === b);
}

/**
 * Raster formats Satori renders. SVG is deliberately excluded: avatars are
 * raster, and an SVG from a third-party CDN would be executed by the renderer.
 */
export function sniffOgAvatarKind(bytes: Uint8Array): OgAvatarKind | null {
  if (startsWith(bytes, PNG)) return 'png';
  if (startsWith(bytes, JPEG)) return 'jpeg';
  if (startsWith(bytes, GIF)) return 'gif';
  return null;
}

export interface LoadOgAvatarOptions {
  fetchImpl?: typeof fetch;
  /** Upper bound for the CDN round trip; the OG route itself has a small budget. */
  timeoutMs?: number;
  /** Refuse bodies larger than this (avatars are tens of KB; 5 MB is generous). */
  maxBytes?: number;
}

const DEFAULT_TIMEOUT_MS = 4_000;
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Fetches an avatar and returns it as a `data:image/…;base64,` URL, or null
 * when the URL is missing, unreachable, not a raster image Satori supports,
 * or too large. Never throws.
 */
export async function loadOgAvatar(
  url: string | null | undefined,
  opts: LoadOgAvatarOptions = {},
): Promise<string | null> {
  if (!url) return null;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;

  let res: Response;
  try {
    res = await fetchImpl(url, {
      signal: AbortSignal.timeout(timeoutMs),
      // The CDN response is content, not markup — never send cookies.
      credentials: 'omit',
      headers: { Accept: 'image/png,image/jpeg,image/gif' },
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;

  const declared = Number(res.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) return null;

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
  if (bytes.length === 0 || bytes.length > maxBytes) return null;

  const kind = sniffOgAvatarKind(bytes);
  if (!kind) return null;

  return `data:image/${kind};base64,${Buffer.from(bytes).toString('base64')}`;
}
