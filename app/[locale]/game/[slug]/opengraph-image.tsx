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
 * Fetches the Twitch box art into a data URI for the Satori renderer (which
 * fetches nothing itself). Every failure path — timeout, non-image response,
 * oversized body — returns null and degrades the card to text-only. MUST
 * never throw: this runs during prerender for every game slug (build-abort
 * rule, see the page loader).
 */
async function fetchBoxArtDataUri(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const type = res.headers.get('content-type') ?? 'image/jpeg';
    if (!type.startsWith('image/')) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength === 0 || buf.byteLength > MAX_BOX_ART_BYTES) return null;
    return `data:${type};base64,${Buffer.from(buf).toString('base64')}`;
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
