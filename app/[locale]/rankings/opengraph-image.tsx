import { ImageResponse } from 'next/og';
import { getPartnerApi } from '@/lib/server/partner-api';
import { renderOgFrame, OG_SIZE } from '@/lib/og/frame';
import { formatCompactNumber } from '@/lib/format/number';

// OG image for the /rankings hub page ONLY — metadata file conventions
// attach within their own segment, so the metric subpages each carry their
// own opengraph-image.tsx (lib/og/leaderboard.tsx).
// nodejs so PARTNER_API_KEY reaches the route in `next dev`. The fetch is
// wrapped — any error degrades to the count-free fallback subtitle.
export const runtime = 'nodejs';
export const revalidate = 300;
export const alt = 'Streamer rankings on Streamer Times';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  let subtitle = 'Most followed, most watched & most active streamers';
  try {
    const resp = await getPartnerApi().getRankings('most-followed', { limit: 1 });
    const top = resp.data[0];
    if (top?.values.follower_count) {
      const noun = top.streamer.platforms.includes('twitch') ? 'followers' : 'subscribers';
      subtitle = `${top.streamer.name} leads with ${formatCompactNumber(top.values.follower_count, 'en')} ${noun}`;
    }
  } catch {
    // keep count-free fallback
  }

  return new ImageResponse(
    renderOgFrame({ title: 'Twitch & YouTube Streamer Rankings', subtitle }),
    { ...OG_SIZE },
  );
}
