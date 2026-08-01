// Right-sizing for remote CDN images (2026-08-02).
//
// Every avatar and thumbnail on this site renders through `next/image` with
// `unoptimized`, so what the API stored is exactly what the browser downloads —
// no srcset, no resizing. The APIs store their LARGEST variant: YouTube hands
// out `=s800` channel avatars and Twitch `-300x300` profile images, and both
// were being painted into 28-64px circles.
//
// Measured across 14 production pages (2026-08-02, cold cache): 17.4 MB of
// images, of which 15.7 MB were pixels no screen could show. /streamers alone
// shipped 4.4 MB for 49 list rows; /rankings/most-followed 3.2 MB.
//
// Both CDNs expose smaller variants through the URL itself, so the fix is a
// pure string rewrite at RENDER time. Never rewrite before storing: the stored
// URL stays the canonical, largest one, and a future layout that needs a bigger
// avatar just asks for a bigger size.
//
// Pure and unit-tested (`lib/format/__tests__/image-size.test.ts`). Anything it
// does not recognise is returned UNCHANGED — a new CDN must degrade to today's
// behaviour, never to a broken URL.

/**
 * Device-pixel headroom. A 2x request covers every phone at DPR 2 and the
 * overwhelming majority of desktops; DPR-3 phones soften a 28px avatar
 * imperceptibly, which is the trade every image CDN makes by default. Going to
 * 3x would give back a third of the savings for pixels nobody can resolve at
 * that size.
 */
const DPR = 2;

/**
 * Twitch profile images exist only in these buckets — an arbitrary size in the
 * URL 404s, unlike the preview and box-art paths. Verified against the CDN
 * 2026-08-02: 300x300 = 112 KB, 150x150 = 37 KB, 70x70 = 9.4 KB, 50x50 = 5.1 KB,
 * 28x28 = 1.8 KB.
 */
const TWITCH_AVATAR_BUCKETS = [28, 50, 70, 150, 300, 600] as const;

/** `-<width>x<height>` right before the file extension. */
const DIMS_IN_PATH = /-(\d+)x(\d+)(\.[a-zA-Z0-9]+)(\?.*)?$/;

function isYouTubeAvatar(url: string): boolean {
  // yt3/yt4.ggpht.com and lh3.googleusercontent.com both serve channel avatars
  // and both take the same `=s<N>-...` suffix grammar.
  return /(^|\/\/)([a-z0-9-]+\.)?(ggpht\.com|googleusercontent\.com)\//.test(url);
}

function isTwitchProfileImage(url: string): boolean {
  return url.includes('jtv_user_pictures/') || url.includes('profile_image');
}

/**
 * Rewrites a YouTube avatar URL to `size` pixels.
 *
 * The stored form is `https://yt3.ggpht.com/<id>=s800-c-k-c0x00ffffff-no-rj`:
 * everything from the FIRST `=` is a parameter string, and replacing it whole
 * is what keeps this robust against variants we have not seen. The parameters
 * we emit are YouTube's own defaults for a channel avatar (`-c-k-c0x00ffffff-no-rj`
 * = cropped, no rounded corners, transparent-white background, no JPEG
 * artefacts flag); dropping them entirely also works but changes the crop.
 */
function resizeYouTube(url: string, size: number): string {
  const base = url.split('=')[0];
  if (!base) return url;
  // Same never-upscale rule as everywhere else: if the stored URL already
  // names a size, that is the ceiling.
  const stored = url.match(/=s(\d+)/);
  const capped = stored ? Math.min(size, Number(stored[1])) : size;
  return `${base}=s${capped}-c-k-c0x00ffffff-no-rj`;
}

/**
 * The smallest Twitch bucket that still covers `size`, never larger than what
 * the URL already points at.
 *
 * The upper cap is not a nicety: an avatar rendered into a wide box (the
 * blurred thumbnail fallback asks for ~268px) would otherwise resolve to the
 * 600x600 bucket — 298 KB where the stored 300x300 is 112 KB, i.e. this
 * function would have made the page BIGGER. Upscaling also cannot add detail
 * the stored image does not have.
 */
function twitchAvatarBucket(size: number, storedSize: number | null): number {
  const wanted =
    TWITCH_AVATAR_BUCKETS.find((bucket) => bucket >= size) ??
    TWITCH_AVATAR_BUCKETS[TWITCH_AVATAR_BUCKETS.length - 1];
  return storedSize ? Math.min(wanted, storedSize) : wanted;
}

/**
 * The avatar URL to actually render, sized for a `cssPx`-wide box.
 *
 * `cssPx` is the CSS size of the rendered circle — pass what the layout uses
 * (`h-7 w-7` → 28), NOT a guess at the device resolution: the 2x headroom is
 * applied here so every call site states the same thing.
 *
 * Returns the input untouched for null/empty, for data/blob URLs, and for any
 * host whose resizing grammar we do not know.
 */
// Overloaded so the common call site — inside a `slot.avatar_url ? …` guard —
// needs no non-null assertion: a string in means a string out.
export function sizedAvatarUrl(url: string, cssPx: number): string;
export function sizedAvatarUrl(
  url: string | null | undefined,
  cssPx: number,
): string | null;
export function sizedAvatarUrl(
  url: string | null | undefined,
  cssPx: number,
): string | null {
  if (!url) return null;
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  const target = Math.max(1, Math.round(cssPx * DPR));

  if (isYouTubeAvatar(url)) return resizeYouTube(url, target);

  if (isTwitchProfileImage(url)) {
    // Twitch stores the dimensions in the filename; a URL that does not carry
    // them is a shape we do not know and is left alone.
    const stored = url.match(DIMS_IN_PATH);
    if (!stored) return url;
    const bucket = twitchAvatarBucket(target, Number(stored[1]) || null);
    return url.replace(DIMS_IN_PATH, (_m, _w, _h, ext, query) =>
      `-${bucket}x${bucket}${ext}${query ?? ''}`,
    );
  }

  return url;
}

/**
 * Rewrites a Twitch image whose path carries its own dimensions — live stream
 * previews (`previews-ttv/live_user_x-440x248.jpg`) and game box art
 * (`ttv-boxart/509658-285x380.jpg`). Unlike profile images these accept
 * ARBITRARY sizes, so the aspect ratio of the stored URL is preserved exactly
 * and only the scale changes.
 *
 * `cssWidth` is the widest the image is ever laid out at (for a `fill` image,
 * the largest entry of its `sizes` prop).
 */
export function sizedCdnImageUrl(url: string, cssWidth: number): string;
export function sizedCdnImageUrl(
  url: string | null | undefined,
  cssWidth: number,
): string | null;
export function sizedCdnImageUrl(
  url: string | null | undefined,
  cssWidth: number,
): string | null {
  if (!url) return null;
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  const match = url.match(DIMS_IN_PATH);
  if (!match) return url;

  const storedWidth = Number(match[1]);
  const storedHeight = Number(match[2]);
  if (!storedWidth || !storedHeight) return url;

  const target = Math.max(1, Math.round(cssWidth * DPR));
  // Never upscale: asking for more than the CDN stored yields a blurry
  // enlargement at a bigger file size, which is the opposite of the point.
  if (target >= storedWidth) return url;

  const height = Math.max(1, Math.round((storedHeight / storedWidth) * target));
  return url.replace(
    DIMS_IN_PATH,
    (_m, _w, _h, ext, query) => `-${target}x${height}${ext}${query ?? ''}`,
  );
}
