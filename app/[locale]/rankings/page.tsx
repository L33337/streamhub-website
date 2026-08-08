import type { Metadata } from 'next';
import Link from 'next/link';
import { getPartnerApi, type PublicGame } from '@/lib/server/partner-api';
import { applyLocaleSeo, buildBreadcrumbJsonLd, INDEXABLE_HUB_LOCALES, jsonLdHtml } from '@/lib/seo';
import { isUiLang, localeHref, type UiLang } from '@/lib/i18n-core';
import { hubLexFor } from '@/lib/i18n-hub';
import { siteMetaFor } from '@/lib/i18n-sitemeta';
import { gameSlug } from '@/lib/game-slug';
import { formatRefreshedAt, RANKING_PAGES } from '@/lib/rankings';
import { RankingTable } from '@/components/web/RankingTable';
import { toRankingHeaders } from '@/lib/rankings-row';
import {
  buildRankingFacets,
  rankingFacetItem,
  reachableMatchCounts,
} from '@/lib/rankings-facets';
import { RankingSectionFilters } from '@/components/web/rankings/RankingSectionFilters';
import { loadRankingPool } from '@/lib/server/rankings-pool';
import { getLiveStreamerIdSet } from '@/lib/server/live-streamers';
import { getNextSlotByStreamer } from '@/lib/server/next-streams';
import { languageDisplayName } from '@/lib/format/language';

// 300 (not 3600): live badges + the "live right now" stat need a fresh live
// set; the ranking fetches themselves stay data-cached for an hour (fetch-level
// revalidate below), so regeneration is cheap. Same convention as /streamers.
export const revalidate = 300;

const SITE_URL = 'https://streamertimes.tv';
/**
 * Rows per preview. The hub is an index, not a leaderboard — five rows keep all
 * five rankings (plus their filters) reachable on one phone screen, and each
 * section links out to its full Top 100.
 */
const PREVIEW_LIMIT = 5;
// Game-ranking chips: link every game whose ranking page is indexable
// (streamer_count >= 10, the sitemap's proxy gate) up to the cap — the hub is
// the main crawl path into /rankings/game/*. Falls back to the most popular
// games while nothing clears the gate (cold start).
const GAME_LINK_LIMIT = 24;
const GAME_LINK_FALLBACK_LIMIT = 8;
const GAME_RANKING_MIN_STREAMERS = 10;

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  const localized = siteMetaFor(locale).rankings;
  const meta: Metadata = {
    title:
      locale === 'en'
        ? 'Streamer Rankings — Most Followed, Most Watched & Most Active'
        : localized.title,
    // ≤155 chars (Bing flags >160; this listed all five metrics and ran 189).
    description:
      locale === 'en'
        ? 'Leaderboards for Twitch and YouTube streamers: most followed, fastest growing, most watched, most active and most punctual, plus rankings by game.'
        : localized.description,
    alternates: { canonical: `${SITE_URL}/rankings` },
    openGraph: {
      title:
        locale === 'en'
          ? 'Streamer Rankings — most followed, most watched & most active'
          : localized.title,
      description:
        locale === 'en'
          ? 'Leaderboards for Twitch and YouTube streamers, updated daily: followers, follower growth, viewers, hours streamed, schedule punctuality and per-game rankings.'
          : localized.description,
      url: `${SITE_URL}/rankings`,
      siteName: 'Streamer Times',
      type: 'website',
    },
  };
  return applyLocaleSeo(meta, locale, '/rankings', INDEXABLE_HUB_LOCALES);
}

export default async function RankingsHubPage({ params }: Props) {
  const { locale: rawLocale } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  const L = hubLexFor(locale);
  const api = getPartnerApi();

  // The game list + the two stats calls — all failure-isolated: a failed call
  // hides what it feeds (never throw during prerender; ISR self-heals within
  // the hour). They start before the awaits so everything runs concurrently.
  const gamesPromise = api.listGames({ limit: 500, revalidate: 3600 }).catch(() => null);
  const livePromise = getLiveStreamerIdSet().catch(() => new Set<string>());
  // Roster size for the stats strip: the offset mode returns an exact
  // pagination.total, so limit 1 buys the count without paying for rows.
  const totalPromise = api
    .listStreamers({ limit: 1, offset: 0, revalidate: 3600 })
    .then((r) => r.pagination.total ?? null)
    .catch(() => null);
  // The WHOLE pool per leaderboard, not just the five rows shown: the filter
  // dropdowns count their options over it, and those counts must describe the
  // same pool /api/rankings/filter then searches — otherwise an option would
  // promise matches the rows can't deliver. Hour-cached, timestamp-free page
  // URLs, so this is ~35 requests per hour shared across all 12 locales, the
  // API route and the build workers (lib/server/rankings-pool.ts).
  const pools = await Promise.all(RANKING_PAGES.map((spec) => loadRankingPool(spec)));
  const liveIds = await livePromise;
  const totalStreamers = await totalPromise;

  const sections = RANKING_PAGES.map((spec, i) => ({
    spec,
    pool: pools[i],
    entries: pools[i].entries.slice(0, PREVIEW_LIMIT),
  })).filter((s) => s.entries.length > 0);

  // "Next stream" (+ its category) for every previewed streamer across all
  // sections — one deduped, chunked fetch over the ≤25 visible rows (the
  // filtered previews fetch their own). Degrades to an empty map on failure
  // (the column then renders "—"), never throws.
  const nextSlots = await getNextSlotByStreamer(
    sections.flatMap((s) => s.entries.map((e) => e.streamer.id)),
  );

  // Latest aggregate refresh across the leaderboards — one visible freshness
  // line for the whole hub (refreshed_at is null for table-backed metrics).
  const refreshedLabel = formatRefreshedAt(
    pools
      .map((pool) => pool.refreshedAt)
      .filter((v): v is string => v !== null)
      .sort()
      .at(-1) ?? null,
    locale,
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
      label: L.rankings.statStreamersTracked,
    });
  }
  if (liveIds.size > 0) {
    stats.push({
      value: liveIds.size.toLocaleString('en-US'),
      label: L.rankings.statLiveNow,
    });
  }
  if (games.length > 0) {
    stats.push({
      value: gamesResp?.pagination.has_more ? `${games.length}+` : String(games.length),
      label: L.rankings.statGamesCategories,
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
  // category → /rankings/game/ slug for every category that actually has a
  // page: the route 404s for anything outside the catalog.
  const gameSlugByCategory = new Map(allGameLinks.map((g) => [g.category, g.slug]));

  // Everything the filter islands need, resolved server-side: the hub lexicon
  // is server-only, and plural agreement (the "23 streamers" counter) lives in
  // it — so the counter is pre-rendered per reachable count instead of shipping
  // a template the browser would have to pluralize.
  const sectionFilters = sections.map(({ spec, pool }) => {
    const facets = buildRankingFacets(
      pool.entries.map((entry) => rankingFacetItem(entry)),
      (code) => languageDisplayName(code, locale) ?? code,
    );
    return {
      facets,
      strings: {
        // The dropdown chrome is shared verbatim with the homepage filters —
        // same control, same words, one set of translations.
        categoryLabel: L.homeFeed.liveFilterCategory,
        languageLabel: L.homeFeed.liveFilterLanguage,
        allCategories: L.homeFeed.liveFilterAllCategories,
        allLanguages: L.homeFeed.liveFilterAllLanguages,
        optionPattern: L.homeFeed.liveFilterOption('{label}', '{count}'),
        reset: L.homeFeed.liveFilterReset,
        matchesByCount: Object.fromEntries(
          reachableMatchCounts(facets).map((count) => [
            String(count),
            `${count} ${L.gameChips.streamersLabel(count)}`,
          ]),
        ),
        empty: L.rankings.filterEmpty,
        error: L.rankings.filterError,
        retry: L.rankings.filterRetry,
        seeFullRanking: L.rankings.seeFullRanking,
        // Only the followers ranking has per-category full rankings, so only
        // its link can carry a category selection outwards. The label is the
        // one the game hub already uses for that exact destination.
        categoryRankingLabels:
          spec.metric === 'most-followed'
            ? categoryPageStrings(facets.categories, gameSlugByCategory, (category) =>
                L.game.seeFullRanking(category),
              )
            : undefined,
      },
      categoryRankingHrefs:
        spec.metric === 'most-followed'
          ? categoryPageStrings(facets.categories, gameSlugByCategory, (_, slug) =>
              localeHref(locale, `/rankings/game/${slug}`),
            )
          : undefined,
    };
  });

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: L.crumbs.home, url: SITE_URL },
    { name: L.crumbs.rankings },
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
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(collectionPage) }}
      />

      <h1 className="text-3xl font-bold text-white md:text-4xl">{L.rankings.h1}</h1>
      <p className="mt-3 max-w-2xl text-text-secondary">
        {L.rankings.intro(sections.length)}
        {refreshedLabel && (
          <span className="text-text-muted">{L.rankings.dataRefreshed(refreshedLabel)}</span>
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

      {sections.map(({ spec, entries }, i) => (
        <section key={spec.slug} aria-labelledby={`${spec.slug}-heading`} className="mt-10">
          <h2 id={`${spec.slug}-heading`} className="text-xl font-bold text-white">
            {L.rankings.metricH1[spec.metric]}
          </h2>
          <p className="mt-1 text-sm text-text-muted">{L.rankings.metricNote[spec.metric]}</p>
          <div className="mt-4">
            {/* Filters + the "full ranking" link live in the island, because
                both change with the selection: the counter needs the match
                count, and the link points at the selected category's own
                ranking where one exists. The unfiltered Top 5 below stays
                server HTML — it is what crawlers and no-JS visitors get. */}
            <RankingSectionFilters
              metric={spec.slug}
              locale={locale}
              facets={sectionFilters[i].facets}
              strings={sectionFilters[i].strings}
              categoryRankingHrefs={sectionFilters[i].categoryRankingHrefs}
              fullRankingHref={localeHref(locale, `/rankings/${spec.slug}`)}
              chrome={{
                caption: L.rankings.metricH1[spec.metric],
                headers: toRankingHeaders(spec.columns, L.rankings),
                tableColStreamer: L.rankings.tableColStreamer,
                mainGameHeader: L.rankings.tableColMainGame,
                nextStreamHeader: L.rankings.tableColNextStream,
              }}
              ssrTable={
                <RankingTable
                  caption={L.rankings.metricH1[spec.metric]}
                  columns={spec.columns}
                  entries={entries}
                  liveIds={liveIds}
                  nextSlots={nextSlots}
                  mainGameSlugs={gameSlugByCategory}
                  locale={locale}
                />
              }
            />
          </div>
        </section>
      ))}

      {sections.length === 0 && (
        <p className="mt-10 text-text-secondary">{L.rankings.warmingUp}</p>
      )}

      <section aria-labelledby="by-game-heading" className="mt-12">
        <h2 id="by-game-heading" className="text-xl font-bold text-white">
          {L.rankings.byGameHeading}
        </h2>
        <p className="mt-1 text-sm text-text-muted">{L.rankings.byGameSubtitle}</p>
        {gameLinks.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2" aria-label={L.rankings.byGameAria}>
            {gameLinks.map((g) => (
              <li key={g.slug}>
                <Link
                  href={localeHref(locale, `/rankings/game/${g.slug}`)}
                  className="inline-block rounded-full border border-border-default bg-background-elevated px-4 py-1.5 text-sm text-text-primary transition-colors hover:border-accent-cyan/60 hover:text-accent-cyan"
                >
                  {L.rankings.topGameStreamers(g.category)}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-sm">
          <Link
            href={localeHref(locale, '/games')}
            className="text-accent-cyan hover:text-text-primary"
          >
            {L.common.allGamesCategories} →
          </Link>
        </p>
      </section>

      <p className="mt-12 border-t border-divider pt-6 text-sm text-text-secondary">
        <Link
          href={localeHref(locale, '/rankings/climbers')}
          className="text-accent-cyan hover:text-text-primary"
        >
          {L.rankings.climbersThisWeek}
        </Link>
        {'  ·  '}
        <Link
          href={localeHref(locale, '/live')}
          className="text-accent-cyan hover:text-text-primary"
        >
          {L.rankings.whoIsLive}
        </Link>
        {'  ·  '}
        <Link
          href={localeHref(locale, '/streamers')}
          className="text-accent-cyan hover:text-text-primary"
        >
          {L.common.browseStreamersAZ}
        </Link>
      </p>
    </main>
  );
}

/**
 * Per-category strings for the one metric whose categories have their own full
 * ranking (/rankings/game/<slug>). Only categories present in the games
 * catalog get an entry — the route 404s for the rest, and a missing key makes
 * the island keep the plain metric link.
 */
function categoryPageStrings(
  categories: readonly string[],
  slugByCategory: ReadonlyMap<string, string>,
  value: (category: string, slug: string) => string,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const category of categories) {
    const slug = slugByCategory.get(category);
    if (slug) out[category] = value(category, slug);
  }
  return out;
}
