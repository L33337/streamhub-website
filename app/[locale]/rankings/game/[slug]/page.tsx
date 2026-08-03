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
import {
  applyLocaleSeo,
  buildBreadcrumbJsonLd,
  buildVideoGameJsonLd,
  INDEXABLE_GAME_LOCALES,
  jsonLdHtml,
  pickMetaDescription,
} from '@/lib/seo';
import { isUiLang, localeHref, type UiLang } from '@/lib/i18n-core';
import { hubLexFor } from '@/lib/i18n-hub';
import { gameSlug, findGameBySlug } from '@/lib/game-slug';
import { isVideoGameCategory } from '@/lib/game-categories';
import { formatCompactNumber } from '@/lib/format/number';
import {
  buildGameRankingFaqLocalized,
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
import { getNextSlotByStreamer } from '@/lib/server/next-streams';
import { floorToBucket } from '@/lib/home/logic';
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
  params: Promise<{ locale: string; slug: string; page?: string }>;
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

  // 5-min bucket for fetch-URL timestamps (lib/home/logic.ts convention):
  // raw ms-precision `now` gave every regeneration of every locale variant its
  // own data-cache keys — guaranteed MISS + billed ISR write per render.
  const now = floorToBucket(new Date());
  const oneYearAgo = new Date(now.getTime() - 365 * 86_400_000);
  const sixHoursFromNow = new Date(now.getTime() + 6 * 60 * 60 * 1000);

  // Ranking is the page's backbone; live slots are decoration (LIVE badge +
  // viewers) — each degrades independently.
  const [rankedCall, liveCall] = await Promise.allSettled([
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
  ]);

  if (rankedCall.status === 'rejected') {
    // Known game but ranking fetch failed → thin page, noindexed, self-heals.
    return { ...empty, category: game.category, game };
  }

  const ranked = rankGameStreamers(rankedCall.value.data, RANK_FETCH_LIMIT);
  const liveSlots: PublicStreamSlot[] =
    liveCall.status === 'fulfilled' ? liveCall.value.data : [];
  // "Next stream" means "when is this streamer next live", INDEPENDENT of game.
  // A category-filtered upcoming fetch would blank the cell for a top-follower
  // streamer whose next predicted stream is a different game (the bug this
  // replaces). Earliest upcoming slot per ranked streamer, category-agnostic —
  // degrades to an empty map on failure (column renders "—"), never throws.
  const nextStreamByStreamer = await getNextSlotByStreamer(
    ranked.map((r) => r.streamer.id),
  );
  const rows = buildGameRankingRows(ranked, liveSlots, [
    ...nextStreamByStreamer.values(),
  ]);

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
  const { locale: rawLocale, slug, page: rawPage } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  const L = hubLexFor(locale).gameRanking;
  const page = parseGamePage(rawPage);
  if (page === null) {
    return { title: L.notFoundTitle, robots: { index: false, follow: false } };
  }
  const { category, rows } = await loadGameRanking(slug);
  if (!category) return { title: hubLexFor(locale).game.notFoundTitle };
  const url =
    page === 1
      ? `${SITE_URL}/rankings/game/${slug}`
      : `${SITE_URL}/rankings/game/${slug}/${page}`;
  const top = rows[0];
  // Coarse, slow-moving numbers only — never live viewer counts in metadata
  // (hourly churn hurts SEO more than the numbers help; see /game/[slug]).
  //
  // Richest-first assembly against the 155-char budget (Bing flags >160). The
  // lexicon's 'en' entries are byte-identical to the pre-M22-P4 inline copy.
  const leadIn = top
    ? L.metaLeadIn(top.name, formatCompactNumber(top.followerCount, locale))
    : '';
  const description = pickMetaDescription(...L.metaDescription(category, leadIn));
  const meta: Metadata = {
    title: L.metaTitle(category, page),
    description,
    alternates: { canonical: url },
    openGraph: {
      title: L.ogTitle(category),
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
      title: L.ogTitle(category),
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
  // M22 P4: game pages are indexable in en+de (INDEXABLE_GAME_LOCALES);
  // other locales viewable but noindex,follow + self-canonical (incoming
  // noindex sticks and never gets a cluster).
  return applyLocaleSeo(
    meta,
    locale,
    page === 1 ? `/rankings/game/${slug}` : `/rankings/game/${slug}/${page}`,
    INDEXABLE_GAME_LOCALES,
  );
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
  const { locale: rawLocale, slug, page: rawPage } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  const Lex = hubLexFor(locale);
  const L = Lex.gameRanking;
  const C = Lex.gameChips;
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
    { name: Lex.crumbs.home, url: SITE_URL },
    { name: Lex.crumbs.rankings, url: `${SITE_URL}/rankings` },
    { name: category },
  ]);
  // Adapt to PublicRankingEntry so the shared Person ItemList builder applies.
  const itemListEntries: PublicRankingEntry[] = ranked.map(({ rank, streamer }) => ({
    rank,
    values: { follower_count: streamer.follower_count ?? 0 },
    streamer,
  }));
  const itemList = buildRankingItemListJsonLd(
    Lex.rankings.topGameStreamers(category),
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
      ? L.introPage1(allRows.length, category) +
        (top
          ? L.topsTheList(
              top.name,
              formatCompactNumber(top.followerCount, locale),
              top.platforms.includes('twitch'),
            )
          : '')
      : L.introPageN(
          (page - 1) * GAME_RANKING_PAGE_SIZE + 1,
          (page - 1) * GAME_RANKING_PAGE_SIZE + rows.length,
          allRows.length,
          category,
        );

  const followerRefreshLabel = formatRefreshedAt(
    latestFollowerRefresh(ranked.map((r) => r.streamer)),
    locale,
  );
  const faq = buildGameRankingFaqLocalized(L, locale, {
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
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(breadcrumb) }}
      />
      {/* Page 1 only: pages 2+ are noindex, so structured data there is dead weight. */}
      {page === 1 && rows.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdHtml(itemList) }}
        />
      )}
      {videoGameJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdHtml(videoGameJsonLd) }}
        />
      )}

      <p className="text-sm text-text-muted">
        <Link href={localeHref(locale, '/rankings')} className="hover:text-accent-cyan">
          {Lex.crumbs.rankings}
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
            {L.h1(category)}
          </h1>
          {rows.length > 0 && (
            <>
              <p className="mt-3 max-w-2xl text-text-secondary">{intro}</p>
              {/* Stats chips — every chip conditional on its (nullable) field. */}
              <ul
                className="mt-3 flex flex-wrap gap-2 text-xs"
                aria-label={C.aria(category)}
              >
                <li className="rounded-full border border-border-default bg-background-elevated px-2.5 py-1 text-text-secondary">
                  <span className="font-semibold text-text-primary">
                    {game.streamer_count}
                  </span>{' '}
                  {C.streamersLabel(game.streamer_count)}
                </li>
                {liveCount > 0 && (
                  <li className="rounded-full border border-live/40 bg-background-elevated px-2.5 py-1 text-live">
                    <span className="font-semibold">{liveCount}</span> {C.liveNowLabel}
                    {liveViewerTotal != null && (
                      <>
                        {' '}
                        ·{' '}
                        <span className="font-semibold">
                          {formatCompactNumber(liveViewerTotal, locale)}
                        </span>{' '}
                        {C.watchingLabel}
                      </>
                    )}
                  </li>
                )}
                {game.hours_28d != null && game.hours_28d > 0 && (
                  <li className="rounded-full border border-border-default bg-background-elevated px-2.5 py-1 text-text-secondary">
                    <span className="font-semibold text-text-primary">
                      {formatCompactNumber(Math.round(game.hours_28d), locale)}h
                    </span>{' '}
                    {C.streamedLabel}
                  </li>
                )}
                {game.peak_viewer_28d != null && game.peak_viewer_28d > 0 && (
                  <li className="rounded-full border border-border-default bg-background-elevated px-2.5 py-1 text-text-secondary">
                    {C.peakLead}
                    <span className="font-semibold text-text-primary">
                      {formatCompactNumber(game.peak_viewer_28d, locale)}
                    </span>
                    {C.peakTail}
                  </li>
                )}
                {game.trend_delta_percent != null && (
                  <li
                    className={`rounded-full border border-border-default bg-background-elevated px-2.5 py-1 font-semibold ${
                      game.trend_delta_percent >= 0 ? 'text-live' : 'text-accent-pink'
                    }`}
                    title={C.trendTitle}
                  >
                    {game.trend_delta_percent >= 0 ? '▲' : '▼'}{' '}
                    {Math.abs(game.trend_delta_percent)}%{C.trendTail}
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
            {L.methodology(category)}
            {followerRefreshLabel && <>{L.followersRefreshed(followerRefreshLabel)}</>}
          </p>
          <div className="mt-6">
            <GameRankingExplorer
              rows={rows}
              locale={locale}
              labels={{
                sortAria: L.sortAria,
                sortFollowers: L.sortFollowers,
                sortHours: L.sortHours,
                sortViewers: L.sortViewers,
                filterLangAria: L.filterLangAria,
                allChip: L.allChip,
                noMatch: L.noMatch,
                tableCaption: L.tableCaption(category),
                thRank: L.thRank,
                thStreamer: L.thStreamer,
                thFollowers: L.thFollowers,
                thAvgViewers: L.thAvgViewers,
                thHours: L.thHours,
                thShare: L.thShare,
                thShareTitle: L.thShareTitle(category),
                thNextStream: L.thNextStream,
                liveNowCell: L.liveNowCell,
                watchingTail: L.watchingTail,
                trendNewBadge: L.trendNewBadge,
                trendNewTitle: L.trendNewTitle,
                trendUpTemplate: L.trendUpTemplate,
                trendDownTemplate: L.trendDownTemplate,
                mainGameTemplate: L.mainGameTemplate,
              }}
            />
          </div>
          <RankingPagination
            page={page}
            pages={pages}
            hrefFor={(n) =>
              localeHref(
                locale,
                n === 1 ? `/rankings/game/${slug}` : `/rankings/game/${slug}/${n}`,
              )
            }
            label={L.paginationAria(category)}
            prevLabel={L.prev}
            nextLabel={L.next}
          />
          {hasMissing && (
            <p className="mt-2 text-xs text-text-muted">{L.missingDataNote}</p>
          )}
          {faq.length > 0 && (
            <section aria-labelledby="game-ranking-faq-heading" className="mt-12 max-w-2xl">
              <h2 id="game-ranking-faq-heading" className="text-xl font-bold text-white">
                {L.aboutRanking}
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
        <p className="mt-3 max-w-2xl text-text-secondary">{L.warmingUp}</p>
      )}

      {related.length > 0 && (
        <section aria-labelledby="related-rankings-heading" className="mt-12">
          <h2 id="related-rankings-heading" className="text-sm font-semibold uppercase tracking-wider text-text-muted">
            {L.relatedRankings}
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2" aria-label={L.relatedRankingsAria}>
            {related.map((r) => (
              <li key={r.category}>
                <Link
                  href={localeHref(locale, `/rankings/game/${r.slug}`)}
                  className="inline-block rounded-full border border-border-default bg-background-elevated px-4 py-1.5 text-sm text-text-primary transition-colors hover:border-accent-cyan/60 hover:text-accent-cyan"
                >
                  {Lex.rankings.topGameStreamers(r.category)}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-text-muted">{Lex.game.relatedNote}</p>
        </section>
      )}

      <p className="mt-12 border-t border-divider pt-6 text-sm text-text-secondary">
        <Link
          href={localeHref(locale, `/game/${slug}`)}
          className="text-accent-cyan hover:text-text-primary"
        >
          {L.liveAndSchedule(category)}
        </Link>
        {'  ·  '}
        <Link
          href={localeHref(locale, '/rankings')}
          className="text-accent-cyan hover:text-text-primary"
        >
          {L.allRankings}
        </Link>
        {'  ·  '}
        <Link
          href={localeHref(locale, '/games')}
          className="text-accent-cyan hover:text-text-primary"
        >
          {Lex.common.allGamesCategories}
        </Link>
      </p>
    </main>
  );
}
