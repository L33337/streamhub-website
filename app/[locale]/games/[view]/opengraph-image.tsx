import { ImageResponse } from 'next/og';
import { getPartnerApi } from '@/lib/server/partner-api';
import { renderOgFrame, OG_SIZE, ogCacheHeaders } from '@/lib/og/frame';
import { gamesHubViewBySegment } from '@/lib/games-hub';

// nodejs so PARTNER_API_KEY reaches the route in `next dev`. Without this file
// the sub-views would inherit /games' OG image and every card would read
// "Games & Categories" — one title for three different pages.
//
// This runs for every view at build (generateStaticParams lives on the page),
// so it MUST degrade and never throw: a thrown error during prerender aborts
// the entire production build (documented 2026-07-07 incident).
export const runtime = 'nodejs';
// W2 rider (2026-09-05): aligned to the games pages (600).
export const revalidate = 600;

interface Props {
  params: Promise<{ view: string }>;
}

/**
 * Resolve the view spec. `params` is a Promise in Next 16, and Next also probes
 * this route with empty params during build page-data collection — both the
 * await and the guard are load-bearing. Without them every view silently
 * renders the same fallback card.
 */
async function specFor(params: Props['params']) {
  const { view } = (await params) ?? {};
  return typeof view === 'string' && view.length > 0 ? gamesHubViewBySegment(view) : null;
}

export async function generateImageMetadata({ params }: Props) {
  const spec = await specFor(params);
  return [
    {
      id: 'og',
      alt: spec ? spec.h1 : 'Games on Streamer Times',
      size: OG_SIZE,
      contentType: 'image/png',
    },
  ];
}

export default async function Image({ params }: Props) {
  const spec = await specFor(params);
  const title = spec?.crumb ?? 'Games';

  let subtitle = spec?.methodologyNote ?? 'Find streamers by game';
  try {
    const games = await getPartnerApi().listGames({ limit: 500 });
    const count = games.data.length;
    if (count > 0) {
      subtitle = `${count} game${count === 1 ? '' : 's'} · ${subtitle}`;
    }
  } catch {
    // keep the count-free fallback
  }

  return new ImageResponse(renderOgFrame({ title, subtitle }), { ...OG_SIZE, headers: ogCacheHeaders(revalidate) });
}
