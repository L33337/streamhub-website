import { ImageResponse } from 'next/og';
import { renderOgFrame, OG_SIZE, ogCacheHeaders } from '@/lib/og/frame';
import { recapPeriodLabel } from '@/lib/recaps';
import { loadRecap } from '@/lib/server/recaps';

// OG image for one recap article: branded frame with the article title and
// its period. Always English (social cards follow the leaderboard-image
// convention); no remote thumbnail — Satori fetches nothing, and the text
// frame stays byte-stable across regenerations.
// nodejs so PARTNER_API_KEY reaches the route in `next dev`.
export const runtime = 'nodejs';
export const revalidate = 900;
const alt = 'Streamer recap on Streamer Times';
const size = { width: 1200, height: 630 };
const contentType = 'image/png';

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

// ISR needs this (2026-08-29): an OG route under [locale] that exports only
// revalidate still renders per request; with generateImageMetadata Next builds
// it as …/opengraph-image/[__metadata_id__] and caches it (AGENTS.md "OG image routes").
export async function generateImageMetadata({ params }: Props) {
  // Next probes this route during build page-data collection with empty
  // params — never throw (build-abort rule); the alt stays generic anyway.
  await params;
  return [{ id: 'og', alt, size, contentType }];
}

export default async function Image({ params }: Props) {
  const { slug } = await params;

  let title = 'Streamer Recap';
  let subtitle = 'Weekly & monthly ranking highlights';
  let eyebrow = 'Streamer Times';
  try {
    const article = await loadRecap(slug, 'en');
    if (article) {
      title = article.title;
      eyebrow =
        article.kind === 'weekly'
          ? 'Streamer Times — Weekly Recap'
          : 'Streamer Times — Monthly Recap';
      subtitle = recapPeriodLabel(article.kind, article.period_start, article.period_end, 'en');
    }
  } catch {
    // keep the generic fallback frame
  }

  return new ImageResponse(renderOgFrame({ title, subtitle, eyebrow }), { ...OG_SIZE, headers: ogCacheHeaders(revalidate) });
}
