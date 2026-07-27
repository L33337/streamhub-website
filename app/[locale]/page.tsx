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
  countStartingSoon,
  floorToBucket,
  pickLiveRailSlots,
  preferWithNextSlot,
  sampleRandom,
  topCategoriesByHours,
} from '@/lib/home/logic';
import { gameSlug } from '@/lib/game-slug';
import { isUiLang, localeHref, type UiLang } from '@/lib/i18n-core';
import { hubLexFor } from '@/lib/i18n-hub';
import { siteMetaFor } from '@/lib/i18n-sitemeta';
import { applyLocaleSeo, INDEXABLE_HUB_LOCALES, jsonLdHtml } from '@/lib/seo';
import { HomeMasthead } from '@/components/web/home/HomeMasthead';
import { HomeSessionBanner } from '@/components/web/home/HomeSessionBanner';
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

/** Fetched wide (soon-count honesty), rendered capped (24 SlotCards max). */
const UPCOMING_FETCH_LIMIT = 100;
const UPCOMING_RENDER_LIMIT = 24;
const SOON_WINDOW_HOURS = 6;

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  const localized = siteMetaFor(locale).home;
  const meta: Metadata = {
    title:
      locale === 'en'
        ? 'Live Streamer Schedule — Twitch & YouTube Stream Guide | StreamerTimes'
        : localized.title,
    description:
      locale === 'en'
        ? 'Find out when your favorite streamers go live on Twitch and YouTube. Real-time live status, upcoming schedule, and AI-powered predictions.'
        : localized.description,
    alternates: { canonical: SITE_URL },
    openGraph: {
      title: locale === 'en' ? 'Streamer Times — Live Streamer Schedule' : localized.title,
      description:
        locale === 'en'
          ? 'Real-time Twitch and YouTube live status with AI-powered schedule predictions.'
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
      'Live streamer schedule for Twitch and YouTube with AI-powered predictions.',
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

  const liveRailSlots = pickLiveRailSlots(liveSlots, 12);
  // Exact live count from the full sweep; the single-page fetch is the fallback.
  const liveCount = liveIds.size > 0 ? liveIds.size : liveRailSlots.length;
  // Ticker stays a SITE-WIDE stat (all streamers); only the rendered lineup
  // below is curated.
  const soonCount = countStartingSoon(upcomingSlots, now, SOON_WINDOW_HOURS);
  // "Today's lineup" is editorially curated: featured streamers only. When
  // the featured-id fetch failed, fall back to the unfiltered list — a mixed
  // lineup beats an empty section.
  const lineupSlots = (
    featuredIds
      ? upcomingSlots.filter((slot) => featuredIds.has(slot.streamer_id))
      : upcomingSlots
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

  return (
    <main className="container mx-auto max-w-6xl px-6 pb-16 pt-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdHtml(buildWebSiteJsonLd()),
        }}
      />

      {/* Signed-in visitors get a client-side pointer to their real feed —
          the page itself stays static for everyone (ISR-K1). */}
      <HomeSessionBanner
        text={L.homeFeed.sessionBanner.text}
        cta={L.homeFeed.sessionBanner.cta}
        href={localeHref(locale, '/feed')}
      />

      <HomeMasthead
        locale={locale}
        liveCount={liveCount}
        soonCount={soonCount}
        soonHours={SOON_WINDOW_HOURS}
      />

      <HomeLiveRail slots={liveRailSlots} totalLive={liveCount} locale={locale} />

      <HomeUpNext slots={lineupSlots} locale={locale} />

      <HomeInterruptCard avatarUrls={interruptAvatars} locale={locale} />

      {/* Trending games — the homepage carries the most link equity, so these
          in-body /game/* and /games links matter more than the nav's. Rail
          degrades to null when trending is empty; cards render unlinked and
          stat-free when the catalog call failed (never internal 404s). The
          /games link stays unconditional so the hub link survives an empty
          trending cache. */}
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

      <HomeClipsRail
        clips={homeClips.clips}
        names={homeClips.names}
        title={L.homeFeed.clipsTitle}
      />

      <HomeQuickFactsSection facts={quickFacts} locale={locale} />

      {/* Risers + Most streamed share a row; each hides independently while
          its data source is empty/warming up, so the grid only splits when
          both render. */}
      <div
        className={
          riserEntries.some(
            (entry) => typeof entry.values.follower_gain_7d === 'number',
          ) && mostStreamed.length > 0
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

      <HomeDiscoverGrid
        streamers={discoverStreamers}
        nextSlots={discoverNextSlots}
        liveIds={liveIds}
        locale={locale}
      />

      <HomeEndCap locale={locale} />

      <PopularStreamersFooter streamers={popularStreamers} locale={locale} />
    </main>
  );
}
