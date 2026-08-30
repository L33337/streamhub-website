import { ImageResponse } from 'next/og';
import { getLiveStreamerIdSet } from '@/lib/server/live-streamers';
import { renderOgFrame, OG_SIZE, ogCacheHeaders } from '@/lib/og/frame';

// nodejs so PARTNER_API_KEY reaches the route in `next dev`. The Partner API
// exposes no total-streamer count (pagination is cursor-only), so the dynamic
// signal is the cheap, 60s-cached live-now count; any error degrades to a
// count-free subtitle rather than throwing (which would break the prerender).
export const runtime = 'nodejs';
export const revalidate = 300; // refresh the live count every 5 min (ISR)
const alt = 'All streamers A–Z on Streamer Times';
const size = { width: 1200, height: 630 };
const contentType = 'image/png';

// ISR needs this (2026-08-29): an OG route under [locale] that exports only
// revalidate still renders per request; with generateImageMetadata Next builds
// it as …/opengraph-image/[__metadata_id__] and caches it (AGENTS.md "OG image routes").
export function generateImageMetadata() {
  return [{ id: 'og', alt, size, contentType }];
}

export default async function Image() {
  let subtitle = 'Every tracked streamer, A–Z';
  try {
    const liveCount = (await getLiveStreamerIdSet({ revalidate: 300 })).size;
    if (liveCount > 0) {
      subtitle = `Every tracked streamer · ${liveCount} live now`;
    }
  } catch {
    // keep count-free fallback
  }

  return new ImageResponse(
    renderOgFrame({ title: 'All Streamers A–Z', subtitle }),
    { ...OG_SIZE, headers: ogCacheHeaders(revalidate) },
  );
}
