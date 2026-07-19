import type { Metadata } from 'next';
import Link from 'next/link';
import {
  getPartnerApi,
  PartnerApiError,
  type PublicGame,
} from '@/lib/server/partner-api';
import { buildBreadcrumbJsonLd } from '@/lib/seo';
import { gameSlug } from '@/lib/game-slug';

export const revalidate = 3600;

const SITE_URL = 'https://streamertimes.tv';

export const metadata: Metadata = {
  title: 'Browse Games & Categories — Twitch & YouTube Streamers | StreamerTimes',
  description:
    'Find streamers by game. Browse who is live now, upcoming schedules, and AI-predicted next streams for the most-streamed games and categories on Twitch and YouTube.',
  alternates: { canonical: `${SITE_URL}/games` },
  openGraph: {
    title: 'Browse Games & Categories — Twitch & YouTube Streamers',
    description:
      'Find streamers by the game they play — live status and stream schedules across Twitch and YouTube.',
    url: `${SITE_URL}/games`,
    siteName: 'Streamer Times',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export default async function GamesIndexPage() {
  let games: PublicGame[] = [];
  let failed = false;

  try {
    const resp = await getPartnerApi().listGames({ limit: 500, revalidate: 3600 });
    games = resp.data;
  } catch (err) {
    if (!(err instanceof PartnerApiError)) throw err;
    failed = true;
  }

  // Attach slugs; drop any category that slugs to nothing (no hub URL for it).
  const withSlug = games
    .map((g) => ({ ...g, slug: gameSlug(g.category) }))
    .filter((g) => g.slug.length > 0);

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
        coming up across Twitch and YouTube.{' '}
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
        <ul
          className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          aria-label="Games and categories"
        >
          {withSlug.map((g) => (
            <li key={g.slug}>
              <Link
                href={`/game/${g.slug}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border-default bg-background-elevated px-4 py-3 transition-colors hover:border-accent-cyan/60 hover:bg-background-highlight"
              >
                <span className="truncate font-semibold text-text-primary">
                  {g.category}
                </span>
                <span className="shrink-0 text-xs text-text-muted">
                  {g.streamer_count} streamer{g.streamer_count === 1 ? '' : 's'}
                </span>
              </Link>
              {/* Crawl path into the per-game leaderboard; gate mirrors the
                  sitemap's streamer_count >= 10 indexability proxy. */}
              {g.streamer_count >= 10 && (
                <Link
                  href={`/rankings/game/${g.slug}`}
                  className="mt-1 inline-block px-1 text-xs text-text-muted transition-colors hover:text-accent-cyan"
                >
                  Top {g.category} streamers →
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
