import { ImageResponse } from 'next/og';
import { getPartnerApi } from '@/lib/server/partner-api';
import { renderOgFrame, OG_SIZE } from '@/lib/og/frame';

// M24: own opengraph-image (no segment inheritance in Next 16). nodejs +
// degrade-never-throw, same rules as the game OG images.
export const runtime = 'nodejs';
export const revalidate = 3600;

export const alt = 'Best games to stream right now — Streamer Times';
export const size = OG_SIZE;
export const contentType = 'image/png';

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
