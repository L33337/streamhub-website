import { ImageResponse } from 'next/og';
import { renderOgFrame, OG_SIZE, ogCacheHeaders } from '@/lib/og/frame';
import { APP_SCREENSHOT_DATA_URI } from '@/lib/og/app-screenshot';

// Own OG image for /app (SEO F4, 2026-09): the download page had none and
// unfurled with the root layout's text-only defaults. Fully static — the
// screenshot is inlined (lib/og/app-screenshot.ts), nothing is fetched and
// nothing can throw during prerender.
//
// Regenerate the inlined screenshot after replacing the source image:
//   node -e "require('sharp')('public/screenshots/live-feed.webp').extract({left:0,top:0,width:1080,height:1440}).resize(540,720).jpeg({quality:72,mozjpeg:true}).toBuffer().then(b=>console.log(b.toString('base64')))"
// and paste the output into APP_SCREENSHOT_DATA_URI.
export const runtime = 'nodejs';

export const revalidate = 86400;
const alt = 'The Streamer Times app: live streams and predicted stream times for Twitch and YouTube';
const size = OG_SIZE;
const contentType = 'image/png';

// ISR needs this (2026-08-29, AGENTS.md "OG image routes"): without it an OG
// route under [locale] renders per request.
export function generateImageMetadata() {
  return [{ id: 'og', alt, size, contentType }];
}

export default function Image() {
  return new ImageResponse(
    renderOgFrame({
      title: 'Never miss a stream again',
      subtitle: 'Go-live alerts and AI stream predictions. Free on iOS and Android.',
      sideImage: APP_SCREENSHOT_DATA_URI,
    }),
    { ...OG_SIZE, headers: ogCacheHeaders(revalidate) },
  );
}
