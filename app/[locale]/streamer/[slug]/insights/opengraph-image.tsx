import { ImageResponse } from 'next/og';
import { getPartnerApi } from '@/lib/server/partner-api';
import { renderOgFrame, OG_SIZE } from '@/lib/og/frame';

// M24: own opengraph-image for the (noindex) insights page — social sharing
// works independently of index status, and Next 16 file conventions do not
// inherit across segments. nodejs + degrade-never-throw, site convention.
export const runtime = 'nodejs';
export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateImageMetadata({ params }: Props) {
  const { slug } = (await params) ?? {};
  const label = typeof slug === 'string' && slug.length > 0 ? slug : 'Streamer';
  return [
    {
      id: 'og',
      alt: `${label} streaming insights — StreamerTimes`,
      size: OG_SIZE,
      contentType: 'image/png',
    },
  ];
}

export default async function Image({ params }: Props) {
  const { slug } = await params;

  let name: string | null = null;
  let medianLine: string | null = null;
  try {
    const api = getPartnerApi();
    const [streamer, insights] = await Promise.all([
      api.getStreamer(slug).catch(() => null),
      api.getStreamerInsights(slug),
    ]);
    name = streamer?.name ?? null;
    if (insights?.overall_median != null && insights.sample_count >= 10) {
      medianLine = `Median ${insights.overall_median} concurrent viewers`;
    }
  } catch {
    name = null;
  }

  return new ImageResponse(
    renderOgFrame({
      title: `${name ?? slug} — streaming insights`,
      subtitle: medianLine ?? 'Viewers by weekday & hour · category performance',
    }),
    { ...OG_SIZE },
  );
}
