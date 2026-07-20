import type { Metadata } from 'next';
import { DEFAULT_GAMES_HUB_VIEW, gamesHubUrl } from '@/lib/games-hub';
import { loadGamesHub } from '@/lib/server/games-hub-data';
import { GamesHubView } from '@/components/web/games/GamesHubView';

// 10 min: the page carries live numbers (live streamers/viewers per game), so
// an hourly window would show stale "live" counts.
export const revalidate = 600;

const SPEC = DEFAULT_GAMES_HUB_VIEW;

/**
 * Dynamic metadata (was a static export until 2026-07-20): the catalog size is
 * a real differentiator and the page regenerates every 10 minutes anyway.
 * Only slow-moving figures reach the title/description — see the churn rule in
 * lib/games-hub.ts. loadGamesHub() is request-cached, so this costs no extra
 * fetch on top of the page render.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await loadGamesHub();
  const title = SPEC.buildTitle(meta);
  const description = SPEC.buildDescription(meta);
  const url = gamesHubUrl(SPEC);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title: SPEC.h1, description, url, siteName: 'Streamer Times', type: 'website' },
    // Without a page-level twitter block, X cards fall back to the root
    // layout's generic site title/image. Next auto-wires the colocated
    // opengraph-image as twitter:image once this block exists.
    twitter: { card: 'summary_large_image', title: SPEC.h1, description },
  };
}

export default function GamesIndexPage() {
  return <GamesHubView spec={SPEC} />;
}
