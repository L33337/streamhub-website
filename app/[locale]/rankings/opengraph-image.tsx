import { ImageResponse } from 'next/og';
import { getPartnerApi } from '@/lib/server/partner-api';
import { renderOgFrame, OG_SIZE, ogCacheHeaders } from '@/lib/og/frame';
import { formatCompactNumber } from '@/lib/format/number';

// OG image for the /rankings hub page ONLY — metadata file conventions
// attach within their own segment, so the metric subpages each carry their
// own opengraph-image.tsx (lib/og/leaderboard.tsx).
// nodejs so PARTNER_API_KEY reaches the route in `next dev`. The fetch is
// wrapped — any error degrades to the count-free fallback subtitle.
export const runtime = 'nodejs';
export const revalidate = 300;
const alt = 'Streamer rankings on Streamer Times';
const size = { width: 1200, height: 630 };
const contentType = 'image/png';

// ISR needs this (2026-08-29): an OG route under [locale] that exports only
// revalidate still renders per request; with generateImageMetadata Next builds
// it as …/opengraph-image/[__metadata_id__] and caches it (AGENTS.md "OG image routes").
export function generateImageMetadata() {
  return [{ id: 'og', alt, size, contentType }];
}

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
    { ...OG_SIZE, headers: ogCacheHeaders(revalidate) },
  );
}
