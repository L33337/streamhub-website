import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getPartnerApi,
  type PublicRankingEntry,
} from '@/lib/server/partner-api';
import { buildBreadcrumbJsonLd } from '@/lib/seo';
import { gameSlug, findGameBySlug } from '@/lib/game-slug';
import { formatCompactNumber } from '@/lib/format/number';
import { rankGameStreamers } from '@/lib/game-ranking';
import {
  buildRankingItemListJsonLd,
  getRankingPageSpec,
  hasMissingValues,
  isRankingIndexable,
} from '@/lib/rankings';
import { RankingTable } from '@/components/web/RankingTable';

export const revalidate = 3600;

const SITE_URL = 'https://streamertimes.tv';

// Depth-50 ranking (vs. the game hub's compact top 12). Fetch extra because
// null/0-follower streamers are filtered out before ranking.
const RANK_FETCH_LIMIT = 60;
const RANK_DISPLAY_LIMIT = 50;

interface Props {
  params: Promise<{ slug: string }>;
}

interface GameRankingData {
  category: string | null;
  entries: PublicRankingEntry[];
}

// Shared between generateMetadata and the page (React cache dedupes per
// request). Failure-isolated: never throw during prerender — a thrown error
// aborts the entire production build (see app/game/[slug]/page.tsx).
const loadGameRanking = cache(async (slug: string): Promise<GameRankingData> => {
  const api = getPartnerApi();
  const empty: GameRankingData = { category: null, entries: [] };

  let game: { category: string } | null;
  try {
    const games = await api.listGames({ limit: 500, revalidate: 3600 });
    game = findGameBySlug(games.data, slug);
  } catch {
    return empty; // API unavailable → renders as notFound; ISR retries soon
  }
  if (!game) return empty;

  let ranked;
  try {
    const resp = await api.listStreamers({
      category: game.category,
      order: 'followers',
      limit: RANK_FETCH_LIMIT,
      revalidate: 3600,
    });
    ranked = rankGameStreamers(resp.data, RANK_DISPLAY_LIMIT);
  } catch {
    // Known game but ranking fetch failed → thin page, noindexed, self-heals.
    return { category: game.category, entries: [] };
  }

  // Adapt RankedGameStreamer → PublicRankingEntry so the shared RankingTable
  // and the most-followed column definitions apply unchanged.
  const entries: PublicRankingEntry[] = ranked.map(({ rank, streamer }) => ({
    rank,
    values: { follower_count: streamer.follower_count ?? 0 },
    streamer,
  }));
  return { category: game.category, entries };
});

// ISR-K1: without generateStaticParams this route renders per-request (ƒ) and
// never caches. Prerender all known game slugs, same as /game/[slug].
export async function generateStaticParams() {
  try {
    const resp = await getPartnerApi().listGames({ limit: 500 });
    return resp.data
      .map((g) => ({ slug: gameSlug(g.category) }))
      .filter((p) => p.slug.length > 0);
  } catch {
    // Backend unavailable at build → render on demand instead of failing the build.
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { category, entries } = await loadGameRanking(slug);
  if (!category) return { title: 'Game not found — StreamerTimes' };
  const url = `${SITE_URL}/rankings/game/${slug}`;
  const top = entries[0];
  const description =
    (top?.values.follower_count
      ? `${top.streamer.name} leads with ${formatCompactNumber(top.values.follower_count, 'en')} followers. `
      : '') +
    `The top ${category} streamers ranked by channel followers across Twitch and YouTube — full leaderboard, updated daily.`;
  const meta: Metadata = {
    title: `Top ${category} Streamers — Ranked by Followers`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `Top ${category} streamers — ranked by followers`,
      description,
      url,
      siteName: 'Streamer Times',
      type: 'website',
    },
  };
  // Thin-content gate: a depth ranking with a handful of rows would be a
  // near-duplicate of the game hub's own table — keep it out of the index
  // (and out of the sitemap, which mirrors this via streamer_count >= 10).
  if (!isRankingIndexable(entries.length)) {
    meta.robots = { index: false, follow: true };
  }
  return meta;
}

export default async function GameRankingPage({ params }: Props) {
  const { slug } = await params;
  const { category, entries } = await loadGameRanking(slug);
  if (!category) notFound();

  // Reuse the most-followed column definitions (Followers primary + Avg viewers).
  const mostFollowedSpec = getRankingPageSpec('most-followed')!;
  const columns = mostFollowedSpec.columns;
  const top = entries[0];

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'Home', url: SITE_URL },
    { name: 'Rankings', url: `${SITE_URL}/rankings` },
    { name: category },
  ]);
  const itemList = buildRankingItemListJsonLd(`Top ${category} streamers`, entries);

  const intro =
    `The top ${entries.length} ${category} streamer${entries.length === 1 ? '' : 's'} we track, ranked by channel followers and subscribers.` +
    (top?.values.follower_count
      ? ` ${top.streamer.name} tops the list with ${formatCompactNumber(top.values.follower_count, 'en')} ${top.streamer.platforms.includes('twitch') ? 'followers' : 'subscribers'}.`
      : '');

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {entries.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
        />
      )}

      <p className="text-sm text-text-muted">
        <Link href="/rankings" className="hover:text-accent-cyan">
          Rankings
        </Link>{' '}
        / {category}
      </p>
      <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">
        Top {category} streamers by followers
      </h1>

      {entries.length > 0 ? (
        <>
          <p className="mt-3 max-w-2xl text-text-secondary">{intro}</p>
          <p className="mt-2 max-w-2xl text-sm text-text-muted">
            Streamers active in {category} over the last 28 days, ranked by
            followers. Counts refresh regularly and can lag live platform
            numbers. Updated daily.
          </p>
          <div className="mt-6">
            <RankingTable
              caption={`${category} streamers ranked by follower count`}
              columns={columns}
              entries={entries}
              rowAnchorPrefix="rank"
            />
          </div>
          {hasMissingValues(mostFollowedSpec, entries) && (
            <p className="mt-2 text-xs text-text-muted">
              — means we haven&apos;t collected enough data for that channel yet, for
              example viewer sampling for recently added channels.
            </p>
          )}
        </>
      ) : (
        <p className="mt-3 max-w-2xl text-text-secondary">
          This ranking is warming up — we need a bit more data before it&apos;s
          meaningful. Check back soon.
        </p>
      )}

      <p className="mt-12 border-t border-divider pt-6 text-sm text-text-secondary">
        <Link href={`/game/${slug}`} className="text-accent-cyan hover:text-text-primary">
          Live now &amp; schedule for {category} →
        </Link>
        {'  ·  '}
        <Link href="/rankings" className="text-accent-cyan hover:text-text-primary">
          All rankings
        </Link>
        {'  ·  '}
        <Link href="/games" className="text-accent-cyan hover:text-text-primary">
          All games &amp; categories
        </Link>
      </p>
    </main>
  );
}
