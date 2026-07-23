import { ImageResponse } from 'next/og';
import { getPartnerApi } from '@/lib/server/partner-api';
import { findGameBySlug } from '@/lib/game-slug';
import { renderOgFrame, OG_SIZE } from '@/lib/og/frame';

// nodejs so PARTNER_API_KEY reaches the route in `next dev`. This runs for every
// game slug at build (generateStaticParams on the page), so it MUST degrade and
// never throw — a thrown error during prerender aborts the entire production
// build (see the documented 2026-07-07 incident in the page loader).
export const runtime = 'nodejs';
export const revalidate = 300; // cache per slug for 5 min (ISR) instead of per-request

interface Props {
  params: Promise<{ slug: string }>;
}

// Fallback title when the category can't be resolved (API error / unknown slug):
// prettify the slug so the card still reads sensibly ("just-chatting" → "Just
// Chatting"). Not a perfect inverse of gameSlug(), but good enough for an image.
function prettifySlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Per-slug alt text (was a generic static export). prettifySlug instead of the
// resolved category: no API call, no failure-isolation concern — the casing
// difference ("Pubg" vs "PUBG") is acceptable for alt text.
export async function generateImageMetadata({ params }: Props) {
  // Next probes this route during build page-data collection with empty
  // params — guard so the probe never throws (build-abort rule).
  const { slug } = (await params) ?? {};
  const label = typeof slug === 'string' && slug.length > 0 ? prettifySlug(slug) : 'Game';
  return [
    {
      id: 'og',
      alt: `${label} streamers on StreamerTimes`,
      size: OG_SIZE,
      contentType: 'image/png',
    },
  ];
}

// Box art above this size is suspicious (the 285x380 JPEGs are ~20-40 KB) and
// would bloat the Satori input — degrade to the text-only card instead.
const MAX_BOX_ART_BYTES = 400_000;

/**
 * MIME from the magic bytes, NOT the Content-Type header: Twitch's CDN serves
 * some box arts as JPEG bytes labelled `image/png` (seen live with VALORANT's
 * 516575-285x380.jpg, 2026-07-23) — a data URI built from the header makes
 * Satori decode JPEG as PNG and silently draw nothing. Only the two formats
 * Satori can decode are accepted; anything else (webp, gif, html error page)
 * degrades to the text-only card.
 */
function sniffImageMime(buf: ArrayBuffer): string | null {
  const b = new Uint8Array(buf);
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length > 7 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47)
    return 'image/png';
  return null;
}

/**
 * Fetches the Twitch box art into a data URI for the Satori renderer (which
 * fetches nothing itself). Every failure path — timeout, unrecognized image
 * bytes, oversized body — returns null and degrades the card to text-only.
 * MUST never throw: this runs during prerender for every game slug
 * (build-abort rule, see the page loader).
 */
async function fetchBoxArtDataUri(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength === 0 || buf.byteLength > MAX_BOX_ART_BYTES) return null;
    const mime = sniffImageMime(buf);
    if (!mime) return null;
    return `data:${mime};base64,${Buffer.from(buf).toString('base64')}`;
  } catch {
    return null;
  }
}

export default async function Image({ params }: Props) {
  const { slug } = await params;

  let category: string | null = null;
  let topNames: string[] = [];
  let boxArtUrl: string | null = null;
  try {
    const games = await getPartnerApi().listGames({ limit: 500 });
    const game = findGameBySlug(games.data, slug);
    category = game?.category ?? null;
    // Nightly top-3 most-followed names, straight from the games row (no extra
    // API call). Absent against an older API / cold aggregate → generic line.
    topNames = (game?.top_streamers ?? []).slice(0, 3).map((t) => t.name);
    boxArtUrl = game?.box_art_url ?? null;
  } catch {
    category = null;
  }

  const title = category ?? prettifySlug(slug);
  // Game-hub UX round 2026-07-23: embed the box art (visual anchor for social
  // unfurls). Null keeps the classic centered text card.
  const sideImage = await fetchBoxArtDataUri(boxArtUrl);

  return new ImageResponse(
    renderOgFrame({
      title,
      subtitle:
        topNames.length > 0
          ? `${topNames.join(' · ')} — live now & schedule`
          : 'Live now · Upcoming schedule · AI predictions',
      sideImage: sideImage ?? undefined,
    }),
    { ...OG_SIZE },
  );
}
