import { ImageResponse } from 'next/og';
import { getPartnerApi } from '@/lib/server/partner-api';
import { renderOgFrame, OG_SIZE } from '@/lib/og/frame';

// nodejs so PARTNER_API_KEY reaches the route in `next dev`. Game hubs (>=3
// streamers) are a small set that fits one page, so a single listGames call
// yields an exact count. getPartnerApi() throws when the key is unset, so the
// whole fetch is wrapped — any error degrades to a count-free subtitle.
export const runtime = 'nodejs';
export const revalidate = 300; // refresh the game count every 5 min (ISR)
const alt = 'Browse games & categories on Streamer Times';
const size = { width: 1200, height: 630 };
const contentType = 'image/png';

// ISR needs this (2026-08-29): an OG route under [locale] that exports only
// revalidate still renders per request; with generateImageMetadata Next builds
// it as …/opengraph-image/[__metadata_id__] and caches it (AGENTS.md "OG image routes").
export function generateImageMetadata() {
  return [{ id: 'og', alt, size, contentType }];
}

export default async function Image() {
  let subtitle = 'Find streamers by game';
  try {
    const games = await getPartnerApi().listGames({ limit: 500 });
    const count = games.data.length;
    if (count > 0) {
      subtitle = `${count} game${count === 1 ? '' : 's'} with live & upcoming streams`;
    }
  } catch {
    // keep count-free fallback
  }

  return new ImageResponse(
    renderOgFrame({ title: 'Games & Categories', subtitle }),
    { ...OG_SIZE },
  );
}
