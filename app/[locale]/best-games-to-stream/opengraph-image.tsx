import { ImageResponse } from 'next/og';
import { getPartnerApi } from '@/lib/server/partner-api';
import { renderOgFrame, OG_SIZE } from '@/lib/og/frame';

// M24: own opengraph-image (no segment inheritance in Next 16). nodejs +
// degrade-never-throw, same rules as the game OG images.
export const runtime = 'nodejs';
export const revalidate = 3600;

const alt = 'Best games to stream right now — Streamer Times';
const size = OG_SIZE;
const contentType = 'image/png';

// ISR needs this (2026-08-29): an OG route under [locale] that exports only
// revalidate still renders per request; with generateImageMetadata Next builds
// it as …/opengraph-image/[__metadata_id__] and caches it (AGENTS.md "OG image routes").
export function generateImageMetadata() {
  return [{ id: 'og', alt, size, contentType }];
}

export default async function Image() {
  let topNames: string[] = [];
  try {
    const resp = await getPartnerApi().listBestGamesToStream();
    topNames = resp.data.slice(0, 3).map((r) => r.category);
  } catch {
    topNames = [];
  }

  return new ImageResponse(
    renderOgFrame({
      title: 'Best games to stream',
      subtitle:
        topNames.length > 0
          ? `${topNames.join(' · ')} — viewers vs competition, updated daily`
          : 'Categories ranked by viewers per live channel',
    }),
    { ...OG_SIZE },
  );
}
