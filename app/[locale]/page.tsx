import type { Metadata } from 'next';
import Link from 'next/link';
import { getPartnerApi, type PublicStreamSlot } from '@/lib/server/partner-api';
import { fetchTrendingRail } from '@/lib/server/trending';
import { getLiveStreamerIdSet } from '@/lib/server/live-streamers';
import { fetchTopClipsOfWeek } from '@/lib/server/home-clips';
import {
  countQuickFacts,
  EMPTY_QUICK_FACTS,
  fetchHomeQuickFacts,
  type HomeQuickFacts,
} from '@/lib/server/quick-facts';
import { MIN_QUICK_FACT_CARDS } from '@/lib/home/quick-facts';
import { fetchFeaturedStreamers } from '@/lib/server/home-featured';
import { fetchWeekMostStreamed } from '@/lib/server/most-streamed';
import { BUCKET_MS, getNextSlotByStreamer } from '@/lib/server/next-streams';
import { fetchStreamerFeedStats } from '@/lib/server/streamer-feed-stats';
import { pickWikiStreamers } from '@/lib/home/streamer-wiki';
import {
  filterFutureSlots,
  floorToBucket,
  preferWithNextSlot,
  sampleRandom,
  seededRandom,
  topCategoriesByHours,
} from '@/lib/home/logic';
import { LIVE_RAIL_POOL_MAX, pickBiggestLiveSlots } from '@/lib/home/live-rail';
import { LINEUP_POOL_MAX } from '@/lib/home/lineup-filters';
import { gameSlug } from '@/lib/game-slug';
import { isUiLang, localeHref, type UiLang } from '@/lib/i18n-core';
import { hubLexFor } from '@/lib/i18n-hub';
import { siteMetaFor } from '@/lib/i18n-sitemeta';
import { applyLocaleSeo, INDEXABLE_HUB_LOCALES, jsonLdHtml } from '@/lib/seo';
import { HomeMasthead } from '@/components/web/home/HomeMasthead';
import {
  HomeSectionNav,
  type HomeSectionNavItem,
} from '@/components/web/home/HomeSectionNav';
import { SignedOutOnly } from '@/components/web/home/SignedOutOnly';
import { HomeLiveRail } from '@/components/web/home/HomeLiveRail';
import { HomeUpNext } from '@/components/web/home/HomeUpNext';
import { HomeInterruptCard } from '@/components/web/home/HomeInterruptCard';
import { HomeClipsRail } from '@/components/web/home/HomeClipsRail';
import { HomeQuickFacts as HomeQuickFactsSection } from '@/components/web/home/HomeQuickFacts';
import { HomeRisers } from '@/components/web/home/HomeRisers';
import { HomeMostStreamed } from '@/components/web/home/HomeMostStreamed';
import { HomeMostWatched } from '@/components/web/home/HomeMostWatched';
import { HomeDiscoverGrid } from '@/components/web/home/HomeDiscoverGrid';
import { HomeEndCap } from '@/components/web/home/HomeEndCap';
import { HomeTrendingRail } from '@/components/web/home/HomeTrendingRail';
import { HomeStreamerWiki, WIKI_CARD_COUNT } from '@/components/web/home/HomeStreamerWiki';

// 60 → 120 s on 2026-08-29: the homepage (12 locales, 1.7 MB each, never
// byte-identical because of live counters) was 34 % of all ISR writes. Two
// minutes of staleness on an anonymous feed is invisible — the live rail's
// runtime lines are re-derived in the browser every minute anyway. Every fetch
// in this tree must stay ≥ 120 (Next's min() rule caps the route at the lowest
// fetch revalidate), see HOME_REVALIDATE below.
export const revalidate = 120;
const HOME_REVALIDATE = 120;

const SITE_URL = 'https://streamertimes.tv';

/**
 * The lineup's 24 h window, cursor-paginated. One 500-slot page covers it
 * today (~440 predictions in production), the second is headroom — the
 * section's dropdowns search the whole window, so a silent truncation would
 * take languages and categories with it.
 */
const UPCOMING_PAGE_LIMIT = 500;
const UPCOMING_MAX_PAGES = 2;

/**
 * Pages of the live sweep. Simulcasts write one live slot per platform, so
 * the slot count runs ahead of the streamer count and a single 500-slot page
 * would start truncating silently somewhere past ~300 live streamers.
 */
const LIVE_PAGE_LIMIT = 500;
const LIVE_MAX_PAGES = 2;

/**
 * Anchor targets of the sticky section nav sit under two sticky bars
 * (header + chip row) — without this offset a chip jump hides the section
 * heading behind them (game-page convention, larger offset for the second
 * bar).
 */
const SECTION_ANCHOR_CLASS = 'scroll-mt-[calc(var(--header-height)+4rem)]';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  // Title/description come from SITE_META_STRINGS for EVERY locale (the `en`
  // entry used to be duplicated inline here — two copies of one string that
  // could drift; i18n-chrome.test.ts pins the English values). They mirror the
  // H1's three pillars: schedule, highlights, stats.
  const localized = siteMetaFor(locale).home;
  const meta: Metadata = {
    title: localized.title,
    description: localized.description,
    alternates: { canonical: SITE_URL },
    openGraph: {
      title:
        locale === 'en'
          ? 'Streamer Times — Stream Schedule. Highlights. Stats.'
          : localized.title,
      description:
        locale === 'en'
          ? 'Schedules, highlights and stats for Twitch and YouTube in one place — with real-time live status and AI-powered predictions.'
          : localized.description,
      url: SITE_URL,
      siteName: 'Streamer Times',
      type: 'website',
    },
  };
  return applyLocaleSeo(meta, locale, '/', INDEXABLE_HUB_LOCALES);
}

function buildWebSiteJsonLd(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    url: SITE_URL,
    name: 'Streamer Times',
    description:
      'Stream schedules, highlights and stats for Twitch and YouTube, with real-time live status and AI-powered predictions.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Live sweep for the rail, cursor-paginated (mirrors /live and
 * lib/server/live-streamers.ts). The rail's filters search the whole sweep,
 * so completeness matters here — it is no longer just the top of the list.
 *
 * The wide `from` window is required: live slots, especially always-on
 * channels, have start_times hours to weeks in the past. Caller passes a
 * BUCKETED `now` (see floorToBucket) so the fetch URL — and with it the
 * data-cache key — is shared across the 12 locale prerenders instead of
 * firing 12 separate sweeps; page 2's cursor is derived from page 1, so it
 * is just as shared.
 */
async function fetchLiveSlots(bucketedNow: Date): Promise<PublicStreamSlot[]> {
  const api = getPartnerApi();
  const from = new Date(bucketedNow.getTime() - 365 * 86_400_000).toISOString();
  const to = new Date(bucketedNow.getTime() + 6 * 60 * 60 * 1000).toISOString();
  const all: PublicStreamSlot[] = [];
  let cursor: string | undefined = undefined;
  let pages = 0;

  do {
    const resp = await api.listSchedules({
      status: ['live'],
      includeAlwaysOn: true,
      from,
      to,
      limit: LIVE_PAGE_LIMIT,
      cursor,
      revalidate: HOME_REVALIDATE,
    });
    all.push(...resp.data);
    cursor = resp.pagination.next_cursor ?? undefined;
    pages++;
  } while (cursor && pages < LIVE_MAX_PAGES);

  return all;
}

/**
 * The next 24 h of upcoming slots incl. AI predictions, cursor-paginated for
 * the same reason as the live sweep: "Today's lineup" filters by category,
 * language and start time across the WHOLE window, so a first-page-only fetch
 * would quietly amputate the evening (the API orders by start_time, so a cut
 * at 500 rows is a cut in time). Bucketed `now` keeps the URL — and the
 * data-cache entry — shared across the 12 locale prerenders.
 */
async function fetchUpcomingSlots(
  bucketedNow: Date,
  windowEnd: Date,
): Promise<PublicStreamSlot[]> {
  const api = getPartnerApi();
  const from = bucketedNow.toISOString();
  const to = windowEnd.toISOString();
  const all: PublicStreamSlot[] = [];
  let cursor: string | undefined = undefined;
  let pages = 0;

  do {
    const resp = await api.listSchedules({
      status: ['upcoming'],
      includePredictions: true,
      from,
      to,
      limit: UPCOMING_PAGE_LIMIT,
      cursor,
      revalidate: HOME_REVALIDATE,
    });
    all.push(...resp.data);
    cursor = resp.pagination.next_cursor ?? undefined;
    pages++;
  } while (cursor && pages < UPCOMING_MAX_PAGES);

  return all;
}

export default async function HomePage({ params }: Props) {
  const { locale: rawLocale } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  const L = hubLexFor(locale);
  const api = getPartnerApi();
  const now = new Date();
  // Timestamped fetch URLs use the 5-min bucket so all 12 locale prerenders
  // (and ISR re-renders inside the window) share one data-cache entry per
  // call. Display/derivation logic keeps the real `now`.
  const bucketedNow = floorToBucket(now);
  const twentyFourHoursAhead = new Date(bucketedNow.getTime() + 24 * 60 * 60 * 1000);

  // Every fetch failure-isolated: a thrown error during prerender aborts the
  // ENTIRE production build (2026-07-07 incident) — the homepage is the last
  // page that may take the site down over one degraded API call.
  const [
    upcomingCall,
    liveCall,
    liveIdsCall,
    popularCall,
    trendingCall,
    gamesCall,
    mostWatchedCall,
    risersCall,
    clipsCall,
    factsCall,
    featuredIdsCall,
    mostStreamedCall,
  ] = await Promise.allSettled([
    fetchUpcomingSlots(bucketedNow, twentyFourHoursAhead),
    fetchLiveSlots(bucketedNow),
    getLiveStreamerIdSet({ revalidate: HOME_REVALIDATE }),
    // 60, not 20: the Streamer Wiki draws its nine cards at random from this
    // list on every regeneration, so the pool has to be several times the
    // nine on show or the "rotation" keeps recycling the same faces. It also
    // needs a top category AND a 28-day stream count per card, and
    // refresh_streamer_feed_stats() only covers approved streamers — 9 of the
    // 20 most-watched have no stats row at all. Complete candidates measured
    // 2026-07-31: top-20 → 11, top-40 → 20, top-60 → 33. 60 keeps the shared
    // next-slot lookup below at 72 ids, still inside its 100-id single-request
    // cap.
    api.listStreamers({
      order: 'popular',
      limit: 60,
      revalidate: 300,
    }),
    // The full Twitch top-games cache: with a sort control over the rail, ten
    // tiles reorder into barely a different list. /games fetches the same 20,
    // so the two share one data-cache entry.
    fetchTrendingRail(20),
    // Catalog for internal /game/* links (404 avoidance) AND the most-watched
    // categories column. Same URL + revalidate as the /games page call, so
    // this shares its data-cache entry instead of adding load.
    api.listGames({ limit: 500, revalidate: 600 }),
    api.getRankings('most-watched', { limit: 5, revalidate: 3600 }),
    api.getRankings('fastest-growing', { limit: 3, revalidate: 3600 }),
    // The whole pool, not a display cut: the section's dropdowns search every
    // clip they are given, so the cap IS the filter scope (HOME_CLIPS_POOL_MAX).
    fetchTopClipsOfWeek(),
    fetchHomeQuickFacts(),
    fetchFeaturedStreamers(),
    fetchWeekMostStreamed(3),
  ]);

  const upcomingSlots = upcomingCall.status === 'fulfilled' ? upcomingCall.value : [];
  const liveSlots = liveCall.status === 'fulfilled' ? liveCall.value : [];
  const liveIds =
    liveIdsCall.status === 'fulfilled' ? liveIdsCall.value : new Set<string>();
  const popularStreamers =
    popularCall.status === 'fulfilled' ? popularCall.value.data : [];
  const trending = trendingCall.status === 'fulfilled' ? trendingCall.value : [];
  const games = gamesCall.status === 'fulfilled' ? gamesCall.value.data : [];
  const mostWatchedEntries =
    mostWatchedCall.status === 'fulfilled' ? mostWatchedCall.value.data : [];
  const riserEntries = risersCall.status === 'fulfilled' ? risersCall.value.data : [];
  const homeClips =
    clipsCall.status === 'fulfilled'
      ? clipsCall.value
      : {
          clips: [],
          names: {} as Record<string, string>,
          languages: {} as Record<string, string>,
        };
  const quickFacts: HomeQuickFacts =
    factsCall.status === 'fulfilled' ? factsCall.value : EMPTY_QUICK_FACTS;
  const featuredStreamers =
    featuredIdsCall.status === 'fulfilled' ? featuredIdsCall.value : null;
  const featuredIds = featuredStreamers
    ? new Set(featuredStreamers.map((streamer) => streamer.id))
    : null;
  const mostStreamed =
    mostStreamedCall.status === 'fulfilled' ? mostStreamedCall.value : [];

  // Discover grid: 6 "random" featured streamers, preferring candidates whose
  // next stream is known — the cards promise "next stream + category".
  // Oversample 12, resolve their next slots in one small tail fetch (never
  // throws), then cap. Falls back to the popular list when the featured pool
  // is unavailable. W2.2 (2026-09-05): the sample is seeded on the 5-minute
  // BUCKET_MS anchor instead of Math.random — all locale regenerations inside
  // a bucket draw the same sample, so the next-slot fetch URL below is
  // data-cache-shareable (was a guaranteed miss per regeneration, ~3,300
  // uncacheable /v1/schedules calls/day). Rotation now happens per bucket.
  const discoverPool = featuredStreamers ?? popularStreamers;
  const discoverSample = sampleRandom(
    discoverPool,
    12,
    seededRandom(Math.floor(Date.now() / BUCKET_MS))
  );

  // One tail round trip for BOTH bottom sections. The next-slot lookup covers
  // the discover sample AND every popular streamer at once: 52 unique ids stay
  // under the Partner API's 100-id filter cap, so this is still the single
  // request it was before the Streamer Wiki needed slot data too.
  const [nextSlotsByStreamer, wikiStatsById] = await Promise.all([
    getNextSlotByStreamer([
      ...discoverSample.map((streamer) => streamer.id),
      ...popularStreamers.map((streamer) => streamer.id),
    ]),
    fetchStreamerFeedStats(popularStreamers.map((streamer) => streamer.id)),
  ]);
  const discoverNextSlots = nextSlotsByStreamer;
  const discoverStreamers = preferWithNextSlot(
    discoverSample,
    new Set(discoverNextSlots.keys()),
    6,
  );

  // Streamer Wiki (page bottom): the app's Discover cards over the popular
  // list. The nine cards are drawn at random and redrawn on every ISR
  // regeneration, so the section cycles through the roster instead of showing
  // the same nine forever. Excludes whatever the Discover grid above is
  // already showing — two card grids with the same faces read as a bug — and
  // floats candidates whose fact chip can be filled (live, or a known next
  // start) to the front of the draw.
  const wikiChipIds = new Set([
    ...liveIds,
    ...[...nextSlotsByStreamer.entries()]
      .filter(([, slot]) => slot.slot_kind !== 'cancelled')
      .map(([id]) => id),
  ]);
  const wikiStreamers = pickWikiStreamers(
    popularStreamers,
    wikiStatsById,
    new Set(discoverStreamers.map((streamer) => streamer.id)),
    wikiChipIds,
    WIKI_CARD_COUNT,
    Math.random,
  );

  // The WHOLE live sweep is rendered (capped only for safety) and the rail
  // hides everything past its default cut. The client filters the DOM, so a
  // language is findable only among rendered cards — with a top-30 pool,
  // "German" meant the 3 German streams big enough to make the top 30 while
  // 14 others were live, and pt/it/pl had no option at all.
  const liveRailSlots = pickBiggestLiveSlots(liveSlots, LIVE_RAIL_POOL_MAX);
  // Exact live count from the full sweep; the single-page fetch is the fallback.
  const liveCount = liveIds.size > 0 ? liveIds.size : liveRailSlots.length;
  // What each live streamer is playing right now — lets the Discover cards show
  // the current category instead of a future prediction (HomeDiscoverGrid).
  const liveCategories = new Map(
    liveSlots.map((slot) => [slot.streamer_id, slot.category ?? null] as const),
  );
  // "Today's lineup" is editorially curated: featured streamers only. When
  // the featured-id fetch failed, fall back to the unfiltered list — a mixed
  // lineup beats an empty section. Future starts only: the bucketed fetch
  // window trails real time by up to 5 min, and expired predictions would
  // render as "was expected at …" cards.
  //
  // The cap is the section's filter scope (2026-07-30): the dropdowns search
  // every card in the DOM, so cutting at 24 meant the language and time
  // filters could only ever see the next few hours. Slots arrive in
  // start_time order, so the cap keeps the soonest — the axis the section is
  // read by.
  const futureSlots = filterFutureSlots(upcomingSlots, now);
  const lineupSlots = (
    featuredIds
      ? futureSlots.filter((slot) => featuredIds.has(slot.streamer_id))
      : futureSlots
  ).slice(0, LINEUP_POOL_MAX);
  const topCategories = topCategoriesByHours(games, 5);

  // Maps stay server-side only (never cross a client boundary).
  const catalogSlugByName = new Map(
    games
      .map((g) => [g.category, gameSlug(g.category)] as const)
      .filter(([, slug]) => slug.length > 0),
  );
  const gamesByName = new Map(games.map((g) => [g.category, g] as const));

  const interruptAvatars = popularStreamers
    .map((streamer) => streamer.avatar_url)
    .filter((url): url is string => Boolean(url));

  // Section-nav chips mirror each section's own hide rule — a chip must
  // never point at a section that isn't on the page. HomeSectionNav prunes
  // empty anchors again at mount as a drift guard. The lineup section always
  // renders (it has an empty state), so its chip is unconditional.
  const risersVisible = riserEntries.some(
    (entry) => typeof entry.values.follower_gain_7d === 'number',
  );
  const quickFactCount = countQuickFacts(quickFacts);
  const statsVisible =
    quickFactCount >= MIN_QUICK_FACT_CARDS ||
    risersVisible ||
    mostStreamed.length > 0 ||
    mostWatchedEntries.length > 0 ||
    topCategories.length > 0;
  const sectionNavItems: HomeSectionNavItem[] = [
    ...(liveRailSlots.length > 0
      ? [{ id: 'home-live', label: L.homeFeed.sectionNav.live }]
      : []),
    { id: 'home-lineup', label: L.homeFeed.sectionNav.lineup },
    ...(trending.length > 0
      ? [{ id: 'home-trending', label: L.homeFeed.sectionNav.trending }]
      : []),
    ...(homeClips.clips.length > 0
      ? [{ id: 'home-clips', label: L.homeFeed.sectionNav.clips }]
      : []),
    ...(statsVisible ? [{ id: 'home-stats', label: L.homeFeed.sectionNav.stats }] : []),
    ...(discoverStreamers.length > 0
      ? [{ id: 'home-discover', label: L.homeFeed.sectionNav.discover }]
      : []),
  ];

  return (
    <main className="container mx-auto max-w-6xl px-6 pb-16 pt-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdHtml(buildWebSiteJsonLd()),
        }}
      />

      {/* The masthead only pitches sign-in / the app, so signed-in visitors
          skip it entirely and start at the section nav. The check is
          client-side — the page itself stays static for everyone (ISR-K1) and
          crawlers (always anonymous) keep the full H1. The signed-in fallback
          preserves the document's single h1 for screen readers. */}
      <SignedOutOnly
        fallback={<h1 className="sr-only">{L.hero.claim}</h1>}
      >
        <HomeMasthead locale={locale} />
      </SignedOutOnly>

      {/* The page map only earns its sticky row when there is enough page
          to map — below three sections it is chrome without value. */}
      {sectionNavItems.length >= 3 && (
        <HomeSectionNav items={sectionNavItems} ariaLabel={L.homeFeed.sectionNav.aria} />
      )}

      <div id="home-live" className={SECTION_ANCHOR_CLASS}>
        <HomeLiveRail
          slots={liveRailSlots}
          totalLive={liveCount}
          locale={locale}
          now={now}
        />
      </div>

      <div id="home-lineup" className={SECTION_ANCHOR_CLASS}>
        <HomeUpNext slots={lineupSlots} locale={locale} />
      </div>

      {/* Pure conversion pitch ("this page, but with only your streamers") —
          nothing left to convert once the visitor HAS an account, so it drops
          out for signed-in sessions, same client-side gate as the masthead.
          Anonymous crawlers keep it in the static HTML. No fallback: unlike
          the masthead this carries no h1, so nothing needs preserving. */}
      <SignedOutOnly>
        <HomeInterruptCard avatarUrls={interruptAvatars} locale={locale} />
      </SignedOutOnly>

      {/* Trending games — the homepage carries the most link equity, so these
          in-body /game/* and /games links matter more than the nav's. Rail
          degrades to null when trending is empty; cards render unlinked and
          stat-free when the catalog call failed (never internal 404s). The
          /games link stays unconditional so the hub link survives an empty
          trending cache. */}
      <div id="home-trending" className={SECTION_ANCHOR_CLASS}>
        <HomeTrendingRail
          trending={trending}
          gamesByName={gamesByName}
          catalogSlugByName={catalogSlugByName}
          locale={locale}
        />
        <p className="mt-2 text-sm">
          <Link
            href={localeHref(locale, '/games')}
            className="text-accent-cyan hover:text-text-primary"
          >
            {L.home.browseAllGames}
          </Link>
        </p>
      </div>

      <div id="home-clips" className={SECTION_ANCHOR_CLASS}>
        <HomeClipsRail
          clips={homeClips.clips}
          names={homeClips.names}
          languages={homeClips.languages}
          locale={locale}
        />
      </div>

      <div id="home-stats" className={SECTION_ANCHOR_CLASS}>
        <HomeQuickFactsSection facts={quickFacts} locale={locale} />

        {/* Risers + Most streamed share a row; each hides independently while
            its data source is empty/warming up, so the grid only splits when
            both render. */}
        <div
          className={
            risersVisible && mostStreamed.length > 0
              ? 'grid gap-x-6 md:grid-cols-2'
              : undefined
          }
        >
          <HomeRisers entries={riserEntries} locale={locale} />
          <HomeMostStreamed entries={mostStreamed} locale={locale} />
        </div>

        <HomeMostWatched
          streamerEntries={mostWatchedEntries}
          categories={topCategories}
          gameHubSlugByName={catalogSlugByName}
          locale={locale}
        />
      </div>

      <div id="home-discover" className={SECTION_ANCHOR_CLASS}>
        <HomeDiscoverGrid
          streamers={discoverStreamers}
          nextSlots={discoverNextSlots}
          liveIds={liveIds}
          liveCategories={liveCategories}
          locale={locale}
        />
      </div>

      <HomeEndCap locale={locale} />

      <HomeStreamerWiki
        streamers={wikiStreamers}
        statsById={wikiStatsById}
        nextSlots={nextSlotsByStreamer}
        liveIds={liveIds}
        locale={locale}
      />
    </main>
  );
}
