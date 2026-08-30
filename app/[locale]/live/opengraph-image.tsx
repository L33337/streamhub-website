import { ImageResponse } from 'next/og';
import { getLiveStreamerIdSet } from '@/lib/server/live-streamers';
import { renderOgFrame, OG_SIZE } from '@/lib/og/frame';

// nodejs so PARTNER_API_KEY reaches the route in `next dev` (same reason as the
// streamer OG). The live-count fetch is failure-isolated: a throw here would
// abort the production prerender, so any error degrades to a count-free subtitle.
export const runtime = 'nodejs';
export const revalidate = 300; // refresh the live count every 5 min (ISR)
const alt = "Who's live now on Streamer Times";
const size = { width: 1200, height: 630 };
const contentType = 'image/png';

// ISR needs this (2026-08-29): an OG route under [locale] that exports only
// revalidate still renders per request; with generateImageMetadata Next builds
// it as …/opengraph-image/[__metadata_id__] and caches it (AGENTS.md "OG image routes").
export function generateImageMetadata() {
  return [{ id: 'og', alt, size, contentType }];
}

export default async function Image() {
  let subtitle = 'Live on Twitch & YouTube';
  try {
    const liveCount = (await getLiveStreamerIdSet({ revalidate: 300 })).size;
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
