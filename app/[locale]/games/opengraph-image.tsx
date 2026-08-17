import { ImageResponse } from 'next/og';
import { getPartnerApi } from '@/lib/server/partner-api';
import { renderOgFrame, OG_SIZE } from '@/lib/og/frame';

// nodejs so PARTNER_API_KEY reaches the route in `next dev`. Game hubs (>=3
// streamers) are a small set that fits one page, so a single listGames call
// yields an exact count. getPartnerApi() throws when the key is unset, so the
// whole fetch is wrapped — any error degrades to a count-free subtitle.
export const runtime = 'nodejs';
export const revalidate = 300; // refresh the game count every 5 min (ISR)
export const alt = 'Browse games & categories on Streamer Times';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

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
