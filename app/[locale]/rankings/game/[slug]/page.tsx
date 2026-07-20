import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getPartnerApi,
  type PublicGame,
  type PublicRankingEntry,
  type PublicStreamSlot,
} from '@/lib/server/partner-api';
import { buildBreadcrumbJsonLd, buildVideoGameJsonLd } from '@/lib/seo';
import { gameSlug, findGameBySlug } from '@/lib/game-slug';
import { isVideoGameCategory } from '@/lib/game-categories';
import { formatCompactNumber } from '@/lib/format/number';
import {
  buildGameRankingFaq,
  buildGameRankingRows,
  latestFollowerRefresh,
  rankGameStreamers,
  type GameRankingRow,
  type RankedGameStreamer,
} from '@/lib/game-ranking';
import {
  buildRankingItemListJsonLd,
  formatRefreshedAt,
  isRankingIndexable,
} from '@/lib/rankings';
import { GameBoxArt } from '@/components/web/games/GameCard';
import { GameRankingExplorer } from '@/components/web/games/GameRankingExplorer';
import { RankingPagination } from '@/components/web/RankingPagination';
import { GAME_RANKING_PAGE_SIZE, pageCount } from '@/lib/streamer-rankings';

// 300 (was 3600): the table now carries LIVE badges + live viewer numbers —
// same freshness class as the game hub (/game/[slug]).
export const revalidate = 300;

const SITE_URL = 'https://streamertimes.tv';

/**
 * Fetch the WHOLE category pool in one request (500 = the partner API's max
 * limit), then rank and slice into pages server-side.
 *
 * Deliberately not offset pagination: rankGameStreamers re-sorts client-side on
 * (followers, avg viewers, name, id) and drops zero-follower rows, which is NOT
 * the (followers, id) order the API pages by. Slicing an offset window would
 * therefore re-sort only within that window and shuffle rows across page
 * boundaries. Ranking the full pool first makes every rank absolute and exact —
 * which the streamer-page deep links depend on. Largest category today: 98.
 */
const RANK_FETCH_LIMIT = 500;

interface Props {
  params: Promise<{ slug: string; page?: string }>;
}

interface GameRankingData {
  category: string | null;
  /** Full games-list row (box art, 28d stats, trend, related). Null on unknown slug. */
  game: PublicGame | null;
  ranked: RankedGameStreamer[];
  rows: GameRankingRow[];
  liveCount: number;
  liveViewerTotal: number | null;
  /** Related categories that exist in the catalog, with their slugs. */
  related: { category: string; slug: string }[];
}

// Shared between generateMetadata and the page (React cache dedupes per
// request). Failure-isolated: never throw during prerender — a thrown error
// aborts the entire production build (see app/game/[slug]/page.tsx).
const loadGameRanking = cache(async (slug: string): Promise<GameRankingData> => {
  const api = getPartnerApi();
  const empty: GameRankingData = {
    category: null,
    game: null,
    ranked: [],
    rows: [],
    liveCount: 0,
    liveViewerTotal: null,
    related: [],
  };

  let game: PublicGame | null;
  let catalog = new Set<string>();
  try {
    const games = await api.listGames({ limit: 500, revalidate: 3600 });
    game = findGameBySlug(games.data, slug);
    catalog = new Set(games.data.map((g) => g.category));
  } catch {
    return empty; // API unavailable → renders as notFound; ISR retries soon
  }
  if (!game) return empty;

  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 365 * 86_400_000);
  const sixHoursFromNow = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 86_400_000);

  // Ranking is the page's backbone; live + upcoming slots are decoration
  // (badges, next-stream cells) — each degrades independently.
  const [rankedCall, liveCall, upcomingCall] = await Promise.allSettled([
    api.listStreamers({
      category: game.category,
      order: 'followers',
      limit: RANK_FETCH_LIMIT,
      revalidate: 3600,
    }),
    api.listSchedules({
      category: game.category,
      status: ['live'],
      includeAlwaysOn: true,
      from: oneYearAgo.toISOString(),
      to: sixHoursFromNow.toISOString(),
      limit: 100,
    }),
    api.listSchedules({
      category: game.category,
      status: ['upcoming'],
      includePredictions: true,
      from: now.toISOString(),
      to: sevenDaysFromNow.toISOString(),
      limit: 200,
    }),
  ]);

  if (rankedCall.status === 'rejected') {
    // Known game but ranking fetch failed → thin page, noindexed, self-heals.
    return { ...empty, category: game.category, game };
  }

  const ranked = rankGameStreamers(rankedCall.value.data, RANK_FETCH_LIMIT);
  const liveSlots: PublicStreamSlot[] =
    liveCall.status === 'fulfilled' ? liveCall.value.data : [];
  const upcomingSlots: PublicStreamSlot[] =
    upcomingCall.status === 'fulfilled' ? upcomingCall.value.data : [];
  const rows = buildGameRankingRows(ranked, liveSlots, upcomingSlots);

  // Live banner numbers derived from the SAME slot fetch as the row badges,
  // so banner and badges can never disagree (game.live_* is cached longer).
  const liveIds = new Set(liveSlots.map((s) => s.streamer_id));
  const freshViewers = liveSlots
    .map((s) => s.viewer_count)
    .filter((v): v is number => v != null);
  const liveViewerTotal =
    freshViewers.length > 0 ? freshViewers.reduce((a, b) => a + b, 0) : null;

  const related = (game.related_categories ?? [])
    .filter((r) => catalog.has(r.category))
    .map((r) => ({ category: r.category, slug: gameSlug(r.category) }))
    .filter((r) => r.slug.length > 0)
    .slice(0, 6);

  return {
    category: game.category,
    game,
    ranked,
    rows,
    liveCount: liveIds.size,
    liveViewerTotal,
    related,
  };
});

// ISR-K1: without generateStaticParams this route renders per-request (ƒ) and
// never caches. Prerender all known game slugs, same as /game/[slug].
export async function generateStaticParams({
  params,
}: {
  params: { locale: string };
}) {
  // M22: prebuild known slugs only for the English tree — the 11 other locale
  // variants render on demand (ISR, dynamicParams=true) so the build stays flat.
  if (params.locale !== 'en') return [];
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
  const { slug, page: rawPage } = await params;
  const page = parseGamePage(rawPage);
  if (page === null) {
    return { title: 'Not found — StreamerTimes', robots: { index: false, follow: false } };
  }
  const { category, game, rows } = await loadGameRanking(slug);
  if (!category) return { title: 'Game not found — StreamerTimes' };
  const url =
    page === 1
      ? `${SITE_URL}/rankings/game/${slug}`
      : `${SITE_URL}/rankings/game/${slug}/${page}`;
  const top = rows[0];
  // Coarse, slow-moving numbers only — never live viewer counts in metadata
  // (hourly churn hurts SEO more than the numbers help; see /game/[slug]).
  const hours = game?.hours_28d;
  const hoursSentence =
    hours != null && hours >= 10
      ? ` ~${formatCompactNumber(Math.round(hours), 'en')} hours streamed in the last 28 days.`
      : '';
  const description =
    (top
      ? `${top.name} leads with ${formatCompactNumber(top.followerCount, 'en')} followers. `
      : '') +
    `The top ${category} streamers ranked by channel followers across Twitch and YouTube — full leaderboard with live status, hours streamed and next streams, updated daily.` +
    hoursSentence;
  const meta: Metadata = {
    title:
      page === 1
        ? `Top ${category} Streamers — Ranked by Followers`
        : `Top ${category} Streamers — Ranked by Followers — Page ${page}`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `Top ${category} streamers — ranked by followers`,
      description,
      url,
      siteName: 'Streamer Times',
      type: 'website',
    },
    // Without a page-level twitter block, X cards fall back to the root
    // layout's generic site title/image. Next auto-wires the colocated
    // opengraph-image as twitter:image once this block exists.
    twitter: {
      card: 'summary_large_image',
      title: `Top ${category} streamers — ranked by followers`,
      description,
    },
  };
  // Thin-content gate: a depth ranking with a handful of rows would be a
  // near-duplicate of the game hub's own table — keep it out of the index
  // (and out of the sitemap, which mirrors this via streamer_count >= 10).
  // Pages 2+ are always noindex,follow — near-duplicate list pages, but still
  // a crawl path to the streamer pages they link to.
  if (page > 1 || !isRankingIndexable(rows.length)) {
    meta.robots = { index: false, follow: true };
  }
  return meta;
}

/**
 * Optional trailing page segment. `undefined` (the flat route) is page 1;
 * anything that is not a plain positive integer >= 2 is rejected, so page 1
 * never gains a "/1" twin and "/01" style duplicates 404.
 */
function parseGamePage(raw: string | undefined): number | null {
  if (raw === undefined) return 1;
  if (!/^[1-9][0-9]*$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) && n >= 2 ? n : null;
}

export default async function GameRankingPage({ params }: Props) {
  const { slug, page: rawPage } = await params;
  const page = parseGamePage(rawPage);
  if (page === null) notFound();
  const { category, game, ranked, rows: allRows, liveCount, liveViewerTotal, related } =
    await loadGameRanking(slug);
  if (!category || !game) notFound();

  const pages = pageCount(allRows.length, GAME_RANKING_PAGE_SIZE);
  const rows = allRows.slice(
    (page - 1) * GAME_RANKING_PAGE_SIZE,
    page * GAME_RANKING_PAGE_SIZE,
  );
  // A deep page past the end is a URL that should not exist. Page 1 is exempt:
  // it legitimately renders the warming-up state during cold start and must
  // never 404 a canonical URL over a transient fetch failure.
  if (page > 1 && rows.length === 0) notFound();

  const top = rows[0];

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'Home', url: SITE_URL },
    { name: 'Rankings', url: `${SITE_URL}/rankings` },
    { name: category },
  ]);
  // Adapt to PublicRankingEntry so the shared Person ItemList builder applies.
  const itemListEntries: PublicRankingEntry[] = ranked.map(({ rank, streamer }) => ({
    rank,
    values: { follower_count: streamer.follower_count ?? 0 },
    streamer,
  }));
  const itemList = buildRankingItemListJsonLd(
    `Top ${category} streamers`,
    itemListEntries,
  );
  // VideoGame structured data ONLY for actual video games — same gate as the
  // game hub (box art is not a game signal, Just Chatting has box art too).
  const videoGameJsonLd = isVideoGameCategory(category)
    ? buildVideoGameJsonLd({
        name: category,
        url: `${SITE_URL}/rankings/game/${slug}`,
        imageUrl: game.box_art_url,
      })
    : null;

  const intro =
    page === 1
      ? `The top ${allRows.length} ${category} streamer${allRows.length === 1 ? '' : 's'} we track, ranked by channel followers and subscribers.` +
        (top
          ? ` ${top.name} tops the list with ${formatCompactNumber(top.followerCount, 'en')} ${top.platforms.includes('twitch') ? 'followers' : 'subscribers'}.`
          : '')
      : `Ranks ${(page - 1) * GAME_RANKING_PAGE_SIZE + 1}–${(page - 1) * GAME_RANKING_PAGE_SIZE + rows.length} of ${allRows.length} ${category} streamers we track, ranked by channel followers and subscribers.`;

  const followerRefreshLabel = formatRefreshedAt(
    latestFollowerRefresh(ranked.map((r) => r.streamer)),
  );
  const faq = buildGameRankingFaq({
    category,
    rows,
    streamerCount: game.streamer_count,
    hours28d: game.hours_28d ?? null,
    streams28d: game.streams_28d ?? null,
  });
  const hasMissing = rows.some(
    (r) =>
      (r.avgViewCount == null || r.avgViewCount <= 0) ||
      (rows.some((x) => x.hours28d != null) && r.hours28d == null),
  );

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {/* Page 1 only: pages 2+ are noindex, so structured data there is dead weight. */}
      {page === 1 && rows.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
        />
      )}
      {videoGameJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(videoGameJsonLd) }}
        />
      )}

      <p className="text-sm text-text-muted">
        <Link href="/rankings" className="hover:text-accent-cyan">
          Rankings
        </Link>{' '}
        / {category}
      </p>

      <div className="mt-3 flex items-start gap-4 sm:gap-6">
        {game.box_art_url && (
          <div className="w-24 flex-shrink-0 sm:w-32">
            <GameBoxArt
              boxArtUrl={game.box_art_url}
              name={category}
              sizes="(min-width: 640px) 128px, 96px"
              priority
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold text-white md:text-4xl">
            Top {category} streamers by followers
          </h1>
          {rows.length > 0 && (
            <>
              <p className="mt-3 max-w-2xl text-text-secondary">{intro}</p>
              {/* Stats chips — every chip conditional on its (nullable) field. */}
              <ul
                className="mt-3 flex flex-wrap gap-2 text-xs"
                aria-label={`${category} statistics`}
              >
                <li className="rounded-full border border-border-default bg-background-elevated px-2.5 py-1 text-text-secondary">
                  <span className="font-semibold text-text-primary">
                    {game.streamer_count}
                  </span>{' '}
                  streamer{game.streamer_count === 1 ? '' : 's'}
                </li>
                {liveCount > 0 && (
                  <li className="rounded-full border border-live/40 bg-background-elevated px-2.5 py-1 text-live">
                    <span className="font-semibold">{liveCount}</span> live now
                    {liveViewerTotal != null && (
                      <>
                        {' '}
                        ·{' '}
                        <span className="font-semibold">
                          {formatCompactNumber(liveViewerTotal, 'en')}
                        </span>{' '}
                        watching
                      </>
                    )}
                  </li>
                )}
                {game.hours_28d != null && game.hours_28d > 0 && (
                  <li className="rounded-full border border-border-default bg-background-elevated px-2.5 py-1 text-text-secondary">
                    <span className="font-semibold text-text-primary">
                      {formatCompactNumber(Math.round(game.hours_28d), 'en')}h
                    </span>{' '}
                    streamed / 28d
                  </li>
                )}
                {game.peak_viewer_28d != null && game.peak_viewer_28d > 0 && (
                  <li className="rounded-full border border-border-default bg-background-elevated px-2.5 py-1 text-text-secondary">
                    Peak{' '}
                    <span className="font-semibold text-text-primary">
                      {formatCompactNumber(game.peak_viewer_28d, 'en')}
                    </span>{' '}
                    viewers / 28d
                  </li>
                )}
                {game.trend_delta_percent != null && (
                  <li
                    className={`rounded-full border border-border-default bg-background-elevated px-2.5 py-1 font-semibold ${
                      game.trend_delta_percent >= 0 ? 'text-live' : 'text-accent-pink'
                    }`}
                    title="Week-over-week change in active streamers"
                  >
                    {game.trend_delta_percent >= 0 ? '▲' : '▼'}{' '}
                    {Math.abs(game.trend_delta_percent)}% this week
                  </li>
                )}
              </ul>
            </>
          )}
        </div>
      </div>

      {rows.length > 0 ? (
        <>
          <p className="mt-4 max-w-2xl text-sm text-text-muted">
            Streamers active in {category} over the last 28 days, ranked by
            followers. Counts refresh regularly and can lag live platform
            numbers.
            {followerRefreshLabel && <> Follower counts refreshed {followerRefreshLabel}.</>}
          </p>
          <div className="mt-6">
            <GameRankingExplorer rows={rows} category={category} />
          </div>
          <RankingPagination
            page={page}
            pages={pages}
            hrefFor={(n) =>
              n === 1 ? `/rankings/game/${slug}` : `/rankings/game/${slug}/${n}`
            }
            label={`${category} ranking pages`}
          />
          {hasMissing && (
            <p className="mt-2 text-xs text-text-muted">
              — means we haven&apos;t collected enough data for that channel yet, for
              example viewer sampling for recently added channels.
            </p>
          )}
          {faq.length > 0 && (
            <section aria-labelledby="game-ranking-faq-heading" className="mt-12 max-w-2xl">
              <h2 id="game-ranking-faq-heading" className="text-xl font-bold text-white">
                About this ranking
              </h2>
              <dl className="mt-4 space-y-5">
                {faq.map(({ q, a }) => (
                  <div key={q}>
                    <dt className="font-semibold text-text-primary">{q}</dt>
                    <dd className="mt-1 text-sm text-text-secondary">{a}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </>
      ) : (
        <p className="mt-3 max-w-2xl text-text-secondary">
          This ranking is warming up — we need a bit more data before it&apos;s
          meaningful. Check back soon.
        </p>
      )}

      {related.length > 0 && (
        <section aria-labelledby="related-rankings-heading" className="mt-12">
          <h2 id="related-rankings-heading" className="text-sm font-semibold uppercase tracking-wider text-text-muted">
            Related rankings
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Related game rankings">
            {related.map((r) => (
              <li key={r.category}>
                <Link
                  href={`/rankings/game/${r.slug}`}
                  className="inline-block rounded-full border border-border-default bg-background-elevated px-4 py-1.5 text-sm text-text-primary transition-colors hover:border-accent-cyan/60 hover:text-accent-cyan"
                >
                  Top {r.category} streamers
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-text-muted">
            Games with overlapping streamer rosters in the last 28 days.
          </p>
        </section>
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
