import { ImageResponse } from 'next/og';
import { getPartnerApi } from '@/lib/server/partner-api';
import { floorToBucket } from '@/lib/home/logic';
import { renderOgFrame, OG_SIZE, ogCacheHeaders } from '@/lib/og/frame';

// Metadata files do NOT inherit across route segments in Next 16 — a page
// without its own file gets no card at all (verified against prod 2026-07-27).
//
// nodejs so PARTNER_API_KEY reaches the route in `next dev` (same reason as the
// other hub OG images). The count fetch is failure-isolated: a throw here would
// abort the production prerender, so any error degrades to a count-free
// subtitle.
export const runtime = 'nodejs';
export const revalidate = 300;
const alt = "What's on tonight on Streamer Times";
const size = { width: 1200, height: 630 };
const contentType = 'image/png';

// ISR needs this (2026-08-29): an OG route under [locale] that exports only
// revalidate still renders per request; with generateImageMetadata Next builds
// it as …/opengraph-image/[__metadata_id__] and caches it (AGENTS.md "OG image routes").
export function generateImageMetadata() {
  return [{ id: 'og', alt, size, contentType }];
}

/**
 * Deliberately a flat "next 12 hours" count rather than the page's own evening
 * window: the window depends on the locale's reference zone, and one shared,
 * locale-independent fetch url is what lets all 12 prerenders reuse a single
 * cached response (the 2026-07-27 build-abort lesson). The card only needs an
 * honest order of magnitude.
 */
const LOOKAHEAD_HOURS = 12;

export default async function Image() {
  let subtitle = 'Stream schedule for tonight on Twitch & YouTube';
  try {
    const bucketedNow = floorToBucket(new Date());
    const resp = await getPartnerApi().listSchedules({
      status: ['upcoming'],
      includePredictions: true,
      includeAlwaysOn: false,
      from: bucketedNow.toISOString(),
      to: new Date(
        bucketedNow.getTime() + LOOKAHEAD_HOURS * 3_600_000,
      ).toISOString(),
      limit: 500,
      revalidate: 300,
    });
    const count = resp.data.length;
    if (count > 0) {
      subtitle = `${count}${resp.pagination.next_cursor ? '+' : ''} stream${
        count === 1 ? '' : 's'
      } coming up on Twitch & YouTube`;
    }
  } catch {
    // keep the count-free fallback
  }

  return new ImageResponse(renderOgFrame({ title: 'Tonight', subtitle }), {
    ...OG_SIZE,
    headers: ogCacheHeaders(revalidate),
  });
}
