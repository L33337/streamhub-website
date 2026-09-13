import { ImageResponse } from 'next/og';
import { getPartnerApi } from '@/lib/server/partner-api';
import { resolveGameBySlug } from '@/lib/server/games';
import { loadOgAvatar } from '@/lib/og/avatar';
import { renderOgFrame, OG_SIZE, ogCacheHeaders } from '@/lib/og/frame';

// Own OG image for the per-game ranking (SEO F4, 2026-09): OG convention files
// do not inherit across segments, so this page unfurled with the root layout's
// generic card. Same shape as the game hub's card (box art + top names), with
// a ranking title. nodejs so PARTNER_API_KEY reaches the route in `next dev`;
// MUST degrade and never throw (build-abort rule, see the page loader).
// Pages 2+ (`[page]/`) are noindex list pages and deliberately get no card.
export const runtime = 'nodejs';
export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
}

/** "just-chatting" → "Just Chatting" when the category can't be resolved. */
function prettifySlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export async function generateImageMetadata({ params }: Props) {
  // Next probes this route during build page-data collection with empty
  // params — guard so the probe never throws (build-abort rule).
  const { slug } = (await params) ?? {};
  const label = typeof slug === 'string' && slug.length > 0 ? prettifySlug(slug) : 'Game';
  return [
    {
      id: 'og',
      alt: `Top ${label} streamers ranked by followers on Streamer Times`,
      size: OG_SIZE,
      contentType: 'image/png',
    },
  ];
}

// The 285x380 box arts are ~20-40 KB; anything far larger is not one.
const MAX_BOX_ART_BYTES = 400_000;

export default async function Image({ params }: Props) {
  const { slug } = await params;

  let category: string | null = null;
  let topNames: string[] = [];
  let boxArtUrl: string | null = null;
  try {
    const game = (await resolveGameBySlug(getPartnerApi(), slug, { limit: 500, revalidate: 3600 }))
      ?.game;
    category = game?.category ?? null;
    topNames = (game?.top_streamers ?? []).slice(0, 3).map((t) => t.name);
    boxArtUrl = game?.box_art_url ?? null;
  } catch {
    category = null;
  }

  const sideImage = await loadOgAvatar(boxArtUrl, {
    timeoutMs: 3000,
    maxBytes: MAX_BOX_ART_BYTES,
  });

  return new ImageResponse(
    renderOgFrame({
      title: `Top ${category ?? prettifySlug(slug)} streamers`,
      subtitle:
        topNames.length > 0
          ? `Most followed: ${topNames.join(' · ')}`
          : 'Ranked by followers, hours streamed and viewers',
      sideImage: sideImage ?? undefined,
    }),
    { ...OG_SIZE, headers: ogCacheHeaders(revalidate) },
  );
}
