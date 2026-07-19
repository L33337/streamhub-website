import type { Metadata } from 'next';
import Link from 'next/link';
import { getPartnerApi, type PublicGame } from '@/lib/server/partner-api';
import { buildBreadcrumbJsonLd } from '@/lib/seo';
import { gameSlug } from '@/lib/game-slug';
import { formatRefreshedAt, RANKING_PAGES, sanitizeRankingEntries } from '@/lib/rankings';
import { RankingTable } from '@/components/web/RankingTable';
import { getLiveStreamerIdSet } from '@/lib/server/live-streamers';

// 300 (not 3600): live badges + the "live right now" stat need a fresh live
// set; the ranking fetches themselves stay data-cached for an hour (fetch-level
// revalidate below), so regeneration is cheap. Same convention as /streamers.
export const revalidate = 300;

const SITE_URL = 'https://streamertimes.tv';
const PREVIEW_LIMIT = 10;
// Game-ranking chips: link every game whose ranking page is indexable
// (streamer_count >= 10, the sitemap's proxy gate) up to the cap — the hub is
// the main crawl path into /rankings/game/*. Falls back to the most popular
// games while nothing clears the gate (cold start).
const GAME_LINK_LIMIT = 24;
const GAME_LINK_FALLBACK_LIMIT = 8;
const GAME_RANKING_MIN_STREAMERS = 10;

export const metadata: Metadata = {
  title: 'Streamer Rankings — Most Followed, Most Watched & Most Active',
  description:
    'Live leaderboards for Twitch and YouTube streamers: the most followed, most watched, most active and most punctual streamers we track, plus rankings by game. Updated daily.',
  alternates: { canonical: `${SITE_URL}/rankings` },
  openGraph: {
    title: 'Streamer Rankings — most followed, most watched & most active',
    description:
      'Leaderboards for Twitch and YouTube streamers, updated daily: followers, viewers, hours streamed, schedule punctuality and per-game rankings.',
    url: `${SITE_URL}/rankings`,
    siteName: 'Streamer Times',
    type: 'website',
  },
};

export default async function RankingsHubPage() {
  const api = getPartnerApi();

  // One preview call per leaderboard + the game list — all failure-isolated:
  // a failed call hides that section (never throw during prerender; ISR
  // self-heals within the hour). The games call starts before the awaits so
  // everything runs concurrently.
  const gamesPromise = api.listGames({ limit: 500, revalidate: 3600 }).catch(() => null);
  const livePromise = getLiveStreamerIdSet().catch(() => new Set<string>());
  // Roster size for the stats strip: the offset mode returns an exact
  // pagination.total, so limit 1 buys the count without paying for rows.
  const totalPromise = api
    .listStreamers({ limit: 1, offset: 0, revalidate: 3600 })
    .then((r) => r.pagination.total ?? null)
    .catch(() => null);
  const previewCalls = await Promise.allSettled(
    RANKING_PAGES.map((spec) =>
      api.getRankings(spec.metric, { limit: PREVIEW_LIMIT, revalidate: 3600 }),
    ),
  );
  const liveIds = await livePromise;
  const totalStreamers = await totalPromise;

  const sections = RANKING_PAGES.map((spec, i) => {
    const call = previewCalls[i];
    const raw = call?.status === 'fulfilled' ? call.value.data : [];
    return { spec, entries: sanitizeRankingEntries(spec, raw) };
  }).filter((s) => s.entries.length > 0);

  // Latest aggregate refresh across the leaderboards — one visible freshness
  // line for the whole hub (refreshed_at is null for table-backed metrics).
  const refreshedLabel = formatRefreshedAt(
    previewCalls
      .map((c) => (c.status === 'fulfilled' ? c.value.refreshed_at : null))
      .filter((v): v is string => v !== null)
      .sort()
      .at(-1) ?? null,
  );

  const gamesResp = await gamesPromise;
  const games: PublicGame[] = gamesResp?.data ?? [];

  // Aggregate stats strip — every stat is failure-isolated and simply omitted
  // when its source call failed or returned nothing (0 is never rendered:
  // a zero here means "source down", not a real zero).
  const stats: { value: string; label: string }[] = [];
  if (totalStreamers != null && totalStreamers > 0) {
    stats.push({
      value: totalStreamers.toLocaleString('en-US'),
      label: 'streamers tracked',
    });
  }
  if (liveIds.size > 0) {
    stats.push({ value: liveIds.size.toLocaleString('en-US'), label: 'live right now' });
  }
  if (games.length > 0) {
    stats.push({
      value: gamesResp?.pagination.has_more ? `${games.length}+` : String(games.length),
      label: 'games & categories',
    });
  }
  const allGameLinks = games
    .map((g) => ({ category: g.category, slug: gameSlug(g.category), count: g.streamer_count }))
    .filter((g) => g.slug.length > 0);
  const indexableGameLinks = allGameLinks
    .filter((g) => g.count >= GAME_RANKING_MIN_STREAMERS)
    .slice(0, GAME_LINK_LIMIT);
  const gameLinks =
    indexableGameLinks.length > 0
      ? indexableGameLinks
      : allGameLinks.slice(0, GAME_LINK_FALLBACK_LIMIT);

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'Home', url: SITE_URL },
    { name: 'Rankings' },
  ]);
  const collectionPage = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Streamer Rankings',
    url: `${SITE_URL}/rankings`,
    hasPart: RANKING_PAGES.map((spec) => ({
      '@type': 'WebPage',
      name: spec.h1,
      url: `${SITE_URL}/rankings/${spec.slug}`,
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPage) }}
      />

      <h1 className="text-3xl font-bold text-white md:text-4xl">Streamer rankings</h1>
      <p className="mt-3 max-w-2xl text-text-secondary">
        Who are the biggest, busiest and most dependable streamers on Twitch and
        YouTube? Four leaderboards over every streamer we track — updated daily
        from real broadcast data.
        {refreshedLabel && (
          <span className="text-text-muted"> Data refreshed {refreshedLabel}.</span>
        )}
      </p>

      {stats.length > 0 && (
        <p className="mt-5 flex flex-wrap items-baseline gap-x-8 gap-y-2 text-sm text-text-secondary">
          {stats.map((s) => (
            <span key={s.label} className="whitespace-nowrap">
              <span className="text-xl font-bold tabular-nums text-accent-cyan">
                {s.value}
              </span>{' '}
              {s.label}
            </span>
          ))}
        </p>
      )}

      {sections.map(({ spec, entries }) => (
        <section key={spec.slug} aria-labelledby={`${spec.slug}-heading`} className="mt-10">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id={`${spec.slug}-heading`} className="text-xl font-bold text-white">
              {spec.h1}
            </h2>
            <Link
              href={`/rankings/${spec.slug}`}
              className="text-sm text-accent-cyan hover:text-text-primary"
            >
              See the full ranking →
            </Link>
          </div>
          <p className="mt-1 text-sm text-text-muted">{spec.methodologyNote}</p>
          <div className="mt-4">
            <RankingTable
              caption={spec.h1}
              columns={spec.columns}
              entries={entries}
              liveIds={liveIds}
            />
          </div>
        </section>
      ))}

      {sections.length === 0 && (
        <p className="mt-10 text-text-secondary">
          The leaderboards are warming up — check back soon.
        </p>
      )}

      <section aria-labelledby="by-game-heading" className="mt-12">
        <h2 id="by-game-heading" className="text-xl font-bold text-white">
          Rankings by game
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          The most followed streamers for each game and category.
        </p>
        {gameLinks.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Popular game rankings">
            {gameLinks.map((g) => (
              <li key={g.slug}>
                <Link
                  href={`/rankings/game/${g.slug}`}
                  className="inline-block rounded-full border border-border-default bg-background-elevated px-4 py-1.5 text-sm text-text-primary transition-colors hover:border-accent-cyan/60 hover:text-accent-cyan"
                >
                  Top {g.category} streamers
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-sm">
          <Link href="/games" className="text-accent-cyan hover:text-text-primary">
            All games &amp; categories →
          </Link>
        </p>
      </section>

      <p className="mt-12 border-t border-divider pt-6 text-sm text-text-secondary">
        <Link href="/live" className="text-accent-cyan hover:text-text-primary">
          Who is live right now?
        </Link>
        {'  ·  '}
        <Link href="/streamers" className="text-accent-cyan hover:text-text-primary">
          Browse all streamers A–Z
        </Link>
      </p>
    </main>
  );
}
