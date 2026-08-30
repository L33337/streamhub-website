import { ImageResponse } from 'next/og';
import { getPartnerApi } from '@/lib/server/partner-api';
import { findGameBySlug } from '@/lib/game-slug';
import { TIMING_DAY_NAMES } from '@/lib/game-timing';
import { renderOgFrame, OG_SIZE, ogCacheHeaders } from '@/lib/og/frame';

// M24: own opengraph-image for /best-time — Next 16 file conventions do NOT
// inherit across segments (documented 2026-07-28 SEO round), so without this
// file the page would fall back to the root layout's generic card.
// nodejs runtime + degrade-never-throw, same rules as ../opengraph-image.tsx.
export const runtime = 'nodejs';
export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
}

function prettifySlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export async function generateImageMetadata({ params }: Props) {
  const { slug } = (await params) ?? {};
  const label = typeof slug === 'string' && slug.length > 0 ? prettifySlug(slug) : 'this game';
  return [
    {
      id: 'og',
      alt: `Best time to stream ${label} — Streamer Times`,
      size: OG_SIZE,
      contentType: 'image/png',
    },
  ];
}

export default async function Image({ params }: Props) {
  const { slug } = await params;

  let category: string | null = null;
  let slotLine: string | null = null;
  try {
    const api = getPartnerApi();
    const games = await api.listGames({ limit: 500 });
    const game = findGameBySlug(games.data, slug);
    category = game?.category ?? null;
    if (game) {
      const rows = await api.listGames({
        category: game.category,
        include: 'timing',
        limit: 1,
        revalidate: 3600,
      });
      const top = rows.data[0]?.timing?.best_slots?.[0];
      if (top) {
        slotLine = `Best window: ${TIMING_DAY_NAMES[top.dow]} ${String(top.hour).padStart(2, '0')}:00 UTC`;
      }
    }
  } catch {
    category = null;
  }

  const title = `Best time to stream ${category ?? prettifySlug(slug)}`;

  return new ImageResponse(
    renderOgFrame({
      title,
      subtitle: slotLine ?? 'Viewer demand vs competition, hour by hour',
    }),
    { ...OG_SIZE, headers: ogCacheHeaders(revalidate) },
  );
}
