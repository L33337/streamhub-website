import { ImageResponse } from 'next/og';
import { renderOgFrame } from '@/lib/og/frame';

// Homepage brand card. Lives INSIDE the [locale] segment because metadata
// file conventions only attach to pages in their OWN segment — the old
// app/opengraph-image.tsx stopped reaching any page when M22 moved every page
// under app/[locale]/ (the homepage shipped without an og:image for two
// weeks before this was caught). Static content, English for every locale:
// the default Satori font has Latin glyphs only, so localized titles would
// render tofu for ja/ru/ar/uk.
export const alt = 'Streamer Times — Your Livestream Guide';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    renderOgFrame({
      title: 'Live Streamer Schedule',
      subtitle: 'Real-time Twitch & YouTube live status, schedules and AI predictions',
      pills: [
        { label: 'AI Predictions' },
        {
          label: 'Twitch + YouTube',
          color: '#9146FF',
          bg: 'rgba(145,70,255,0.08)',
          border: 'rgba(145,70,255,0.3)',
        },
        {
          label: 'Free on iOS & Android',
          color: '#00FF88',
          bg: 'rgba(0,255,136,0.08)',
          border: 'rgba(0,255,136,0.3)',
        },
      ],
    }),
    { ...size },
  );
}
