import { ImageResponse } from 'next/og';
import { getLiveStreamerIdSet } from '@/lib/server/live-streamers';
import { renderOgFrame, OG_SIZE } from '@/lib/og/frame';

// nodejs so PARTNER_API_KEY reaches the route in `next dev` (same reason as the
// streamer OG). The live-count fetch is failure-isolated: a throw here would
// abort the production prerender, so any error degrades to a count-free subtitle.
export const runtime = 'nodejs';
export const revalidate = 300; // refresh the live count every 5 min (ISR)
export const alt = "Who's live now on StreamerTimes";
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  let subtitle = 'Live on Twitch & YouTube';
  try {
    const liveCount = (await getLiveStreamerIdSet()).size;
    if (liveCount > 0) {
      subtitle = `${liveCount} streamer${liveCount === 1 ? '' : 's'} live on Twitch & YouTube`;
    }
  } catch {
    // keep count-free fallback
  }

  return new ImageResponse(
    renderOgFrame({ title: 'Live Now', subtitle }),
    { ...OG_SIZE },
  );
}
