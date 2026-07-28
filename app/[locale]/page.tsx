import type { Metadata } from 'next';
import Link from 'next/link';
import { getPartnerApi, type PublicStreamSlot } from '@/lib/server/partner-api';
import { fetchTrendingRail } from '@/lib/server/trending';
import { getLiveStreamerIdSet } from '@/lib/server/live-streamers';
import { fetchTopClipsOfWeek } from '@/lib/server/home-clips';
import { fetchHomeQuickFacts, type HomeQuickFacts } from '@/lib/server/quick-facts';
import { fetchFeaturedStreamers } from '@/lib/server/home-featured';
import { fetchWeekMostStreamed } from '@/lib/server/most-streamed';
import { getNextSlotByStreamer } from '@/lib/server/next-streams';
import {
  filterFutureSlots,
  floorToBucket,
  preferWithNextSlot,
  sampleRandom,
  topCategoriesByHours,
} from '@/lib/home/logic';
import { pickBiggestLiveSlots } from '@/lib/home/live-rail';
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
import { PopularStreamersFooter } from '@/components/web/PopularStreamersFooter';

export const revalidate = 60;

const SITE_URL = 'https://streamertimes.tv';

/** Fetched wide (the 24h window feeds several sections), rendered capped. */
const UPCOMING_FETCH_LIMIT = 100;
const UPCOMING_RENDER_LIMIT = 24;

/**
 * Cards in the "Most Watched right now" rail. Also the pool its two filters
 * operate on — see the call site.
 */
const LIVE_RAIL_POOL = 30;

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
 * Live sweep for the rail: one 500-slot page (the rail only needs the top of
 * it; the exact count comes from getLiveStreamerIdSet). The wide `from`
 * window is required — live slots, especially always-on channels, have
 * start_times hours to weeks in the past (lib/server/live-streamers.ts
 * convention). Caller passes a BUCKETED `now` (see floorToBucket) so the
 * fetch URL — and with it the data-cache key — is shared across the 12
 * locale prerenders instead of firing 12 separate sweeps.
 */
async function fetchLiveSlots(bucketedNow: Date): Promise<PublicStreamSlot[]> {
  const api = getPartnerApi();
  const from = new Date(bucketedNow.getTime() - 365 * 86_400_000).toISOString();
  const to = new Date(bucketedNow.getTime() + 6 * 60 * 60 * 1000).toISOString();
  const resp = await api.listSchedules({
    status: ['live'],
    includeAlwaysOn: true,
    from,
    to,
    limit: 500,
    revalidate: 60,
  });
  return resp.data;
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
    api.listSchedules({
      status: ['upcoming'],
      includePredictions: true,
      from: bucketedNow.toISOString(),
      to: twentyFourHoursAhead.toISOString(),
      limit: UPCOMING_FETCH_LIMIT,
      revalidate: 60,
    }),
    fetchLiveSlots(bucketedNow),
    getLiveStreamerIdSet(),
    api.listStreamers({
      order: 'popular',
      limit: 20,
      revalidate: 300,
    }),
    fetchTrendingRail(10),
    // Catalog for internal /game/* links (404 avoidance) AND the most-watched
    // categories column. Same URL + revalidate as the /games page call, so
    // this shares its data-cache entry instead of adding load.
    api.listGames({ limit: 500, revalidate: 600 }),
    api.getRankings('most-watched', { limit: 5, revalidate: 3600 }),
    api.getRankings('fastest-growing', { limit: 3, revalidate: 3600 }),
    fetchTopClipsOfWeek(12),
    fetchHomeQuickFacts(),
    fetchFeaturedStreamers(),
    fetchWeekMostStreamed(3),
  ]);

  const upcomingSlots =
    upcomingCall.status === 'fulfilled' ? upcomingCall.value.data : [];
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
      : { clips: [], names: {} as Record<string, string> };
  const quickFacts: HomeQuickFacts =
    factsCall.status === 'fulfilled'
      ? factsCall.value
      : { prediction: null, peak: null, reliable: null, pause: null };
  const featuredStreamers =
    featuredIdsCall.status === 'fulfilled' ? featuredIdsCall.value : null;
  const featuredIds = featuredStreamers
    ? new Set(featuredStreamers.map((streamer) => streamer.id))
    : null;
  const mostStreamed =
    mostStreamedCall.status === 'fulfilled' ? mostStreamedCall.value : [];

  // Discover grid: 6 RANDOM featured streamers (rotates with every ISR
  // regeneration), preferring candidates whose next stream is known — the
  // cards promise "next stream + category". Oversample 12, resolve their
  // next slots in one small tail fetch (never throws), then cap. Falls back
  // to the popular list when the featured pool is unavailable.
  const discoverPool = featuredStreamers ?? popularStreamers;
  const discoverSample = sampleRandom(discoverPool, 12, Math.random);
  const discoverNextSlots = await getNextSlotByStreamer(
    discoverSample.map((streamer) => streamer.id),
  );
  const discoverStreamers = preferWithNextSlot(
    discoverSample,
    new Set(discoverNextSlots.keys()),
    6,
  );

  // Rendering more than the visible dozen is what makes the category/language
  // dropdowns meaningful: the client filters the DOM, so a language can only
  // be found among the cards that were rendered. 30 keeps the section a
  // "biggest right now" cut (its heading and note say so) while giving the
  // smaller languages a realistic chance of appearing.
  const liveRailSlots = pickBiggestLiveSlots(liveSlots, LIVE_RAIL_POOL);
  // Exact live count from the full sweep; the single-page fetch is the fallback.
  const liveCount = liveIds.size > 0 ? liveIds.size : liveRailSlots.length;
  // "Today's lineup" is editorially curated: featured streamers only. When
  // the featured-id fetch failed, fall back to the unfiltered list — a mixed
  // lineup beats an empty section. Future starts only: the bucketed fetch
  // window trails real time by up to 5 min, and expired predictions would
  // render as "was expected at …" cards.
  const futureSlots = filterFutureSlots(upcomingSlots, now);
  const lineupSlots = (
    featuredIds
      ? futureSlots.filter((slot) => featuredIds.has(slot.streamer_id))
      : futureSlots
  ).slice(0, UPCOMING_RENDER_LIMIT);
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
  const quickFactCount = [
    quickFacts.prediction,
    quickFacts.peak,
    quickFacts.reliable,
    quickFacts.pause,
  ].filter(Boolean).length;
  const statsVisible =
    quickFactCount >= 2 ||
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

      <HomeInterruptCard avatarUrls={interruptAvatars} locale={locale} />

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
          title={L.homeFeed.clipsTitle}
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
          locale={locale}
        />
      </div>

      <HomeEndCap locale={locale} />

      <PopularStreamersFooter streamers={popularStreamers} locale={locale} />
    </main>
  );
}
