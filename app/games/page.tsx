import type { Metadata } from 'next';
import Link from 'next/link';
import {
  getPartnerApi,
  PartnerApiError,
  type PublicGame,
} from '@/lib/server/partner-api';
import { buildBreadcrumbJsonLd } from '@/lib/seo';
import { gameSlug } from '@/lib/game-slug';
import { fetchTrendingRail, type TrendingGame } from '@/lib/server/trending';
import { formatCompactNumber } from '@/lib/format/number';
import { GameBoxArt, GameCard } from '@/components/web/games/GameCard';
import { GamesExplorer } from '@/components/web/games/GamesExplorer';

// 10 min: the page now carries live numbers (live streamers/viewers per
// game), so the old hourly window would show stale "live" counts.
export const revalidate = 600;

const SITE_URL = 'https://streamertimes.tv';

export const metadata: Metadata = {
  title: 'Browse Games & Categories — Twitch & YouTube Streamers | StreamerTimes',
  description:
    'Find streamers by game — live viewer counts, trending games and 28-day watch stats. See who is live now, upcoming schedules, and AI-predicted next streams on Twitch and YouTube.',
  alternates: { canonical: `${SITE_URL}/games` },
  openGraph: {
    title: 'Browse Games & Categories — Twitch & YouTube Streamers',
    description:
      'Find streamers by the game they play — live viewer counts, trending games and stream schedules across Twitch and YouTube.',
    url: `${SITE_URL}/games`,
    siteName: 'Streamer Times',
    type: 'website',
  },
  // Without a page-level twitter block, X cards fall back to the root
  // layout's generic site title/image. Next auto-wires the colocated
  // opengraph-image as twitter:image once this block exists.
  twitter: {
    card: 'summary_large_image',
    title: 'Browse Games & Categories — Twitch & YouTube Streamers',
    description:
      'Find streamers by the game they play — live viewer counts, trending games and stream schedules across Twitch and YouTube.',
  },
  robots: { index: true, follow: true },
};

type GameWithSlug = PublicGame & { slug: string };

function LiveNowSection({ games }: { games: GameWithSlug[] }) {
  const live = games
    .filter((g) => (g.live_streamer_count ?? 0) > 0)
    .sort((a, b) => (b.live_viewer_total ?? 0) - (a.live_viewer_total ?? 0))
    .slice(0, 8);
  if (live.length === 0) return null;

  return (
    <section aria-label="Games with live streams" className="mt-8">
      <h2 className="text-xl font-bold text-white">Live right now</h2>
      <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {live.map((g, i) => (
          <li key={g.slug}>
            {/* First 6 cards are above the fold — LCP candidates. */}
            <GameCard game={g} slug={g.slug} priority={i < 6} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function TrendingRail({
  trending,
  catalogSlugByName,
}: {
  trending: TrendingGame[];
  catalogSlugByName: Map<string, string>;
}) {
  if (trending.length === 0) return null;

  return (
    <section aria-label="Trending games on Twitch" className="mt-10">
      <h2 className="text-xl font-bold text-white">Trending on Twitch</h2>
      <p className="mt-1 text-xs text-text-muted">
        The biggest games on Twitch right now — not all of them are covered by
        our streamers yet.
      </p>
      <ul className="mt-3 flex gap-3 overflow-x-auto pb-2">
        {trending.map((t) => {
          const slug = catalogSlugByName.get(t.game_name);
          const card = (
            <div className="w-24 sm:w-28">
              <GameBoxArt boxArtUrl={t.box_art_url} name={t.game_name} sizes="112px" />
              <p
                className="mt-1 truncate text-xs font-medium text-text-primary"
                title={t.game_name}
              >
                {t.game_name}
              </p>
              <p className="text-[10px] text-text-muted">#{t.rank} on Twitch</p>
            </div>
          );
          return (
            <li key={t.rank} className="flex-shrink-0">
              {slug ? (
                // Internal link only when the game exists in OUR catalog —
                // never emit internal 404 links.
                <Link
                  href={`/game/${slug}`}
                  prefetch={false}
                  className="block rounded-lg transition-transform hover:scale-[1.02]"
                >
                  {card}
                </Link>
              ) : (
                card
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default async function GamesIndexPage() {
  let games: PublicGame[] = [];
  let failed = false;
  let trending: TrendingGame[] = [];

  // Both fetches failure-isolated: a thrown error during prerender would
  // abort the whole production build (2026-07-07 incident).
  const [gamesResult, trendingResult] = await Promise.allSettled([
    getPartnerApi().listGames({ limit: 500, revalidate: 600 }),
    fetchTrendingRail(20),
  ]);

  if (gamesResult.status === 'fulfilled') {
    games = gamesResult.value.data;
  } else if (gamesResult.reason instanceof PartnerApiError) {
    failed = true;
  } else {
    throw gamesResult.reason;
  }
  if (trendingResult.status === 'fulfilled') {
    trending = trendingResult.value;
  }

  // Attach slugs; drop any category that slugs to nothing (no hub URL for it).
  const withSlug: GameWithSlug[] = games
    .map((g) => ({ ...g, slug: gameSlug(g.category) }))
    .filter((g) => g.slug.length > 0);

  const catalogSlugByName = new Map(withSlug.map((g) => [g.category, g.slug]));
  const slugsByCategory = Object.fromEntries(catalogSlugByName);

  const totalLive = withSlug.reduce((sum, g) => sum + (g.live_streamer_count ?? 0), 0);

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'Home', url: SITE_URL },
    { name: 'Games' },
  ]);
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: withSlug.map((g, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: g.category,
      url: `${SITE_URL}/game/${g.slug}`,
    })),
  };

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />

      <h1 className="text-3xl font-bold text-white">Browse games &amp; categories</h1>
      <p className="mt-3 max-w-2xl text-text-secondary">
        Find streamers by the game they play — see who is live now and what is
        coming up across Twitch and YouTube.
        {totalLive > 0 && (
          <>
            {' '}
            <span className="font-semibold text-live">
              {formatCompactNumber(totalLive)} streamer{totalLive === 1 ? ' is' : 's are'} live
              right now.
            </span>
          </>
        )}{' '}
        <Link href="/streamers" className="text-accent-cyan hover:text-text-primary">
          Browse all streamers A–Z →
        </Link>
      </p>

      {failed || withSlug.length === 0 ? (
        <div className="mt-8 gradient-border p-8 text-center">
          <p className="text-accent-pink">
            Games are temporarily unavailable. Please try again in a moment.
          </p>
        </div>
      ) : (
        <>
          <LiveNowSection games={withSlug} />
          <TrendingRail trending={trending} catalogSlugByName={catalogSlugByName} />
          <div className="mt-10">
            <h2 className="text-xl font-bold text-white">All games &amp; categories</h2>
            <div className="mt-3">
              {/* Priority only when nothing is live above (else the live rail
                  owns the LCP and extra preloads would compete with it).
                  Approximation: with no live but a trending rail, the rail is
                  technically the first image section — accepted. */}
              <GamesExplorer
                games={withSlug}
                slugs={slugsByCategory}
                priorityCount={totalLive > 0 ? 0 : 6}
              />
            </div>
          </div>
        </>
      )}
    </main>
  );
}
