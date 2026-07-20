import type { Metadata } from 'next';
import Link from 'next/link';
import { getPartnerApi } from '@/lib/server/partner-api';
import { fetchTrendingRail } from '@/lib/server/trending';
import { gameSlug } from '@/lib/game-slug';
import { HomeHero } from '@/components/web/HomeHero';
import { isUiLang, localeHref, type UiLang } from '@/lib/i18n-core';
import { siteMetaFor } from '@/lib/i18n-sitemeta';
import { applyLocaleSeo } from '@/lib/seo';
import { UpcomingGrid } from '@/components/web/UpcomingGrid';
import { PopularStreamersFooter } from '@/components/web/PopularStreamersFooter';
import { ApiPromo } from '@/components/web/ApiPromo';
import { TrendingRail } from '@/components/web/games/TrendingRail';

export const revalidate = 60;

const SITE_URL = 'https://streamertimes.tv';

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
  return applyLocaleSeo(meta, locale, '/');
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

export default async function HomePage({ params }: Props) {
  const { locale: rawLocale } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  const api = getPartnerApi();
  const now = new Date();
  const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Every fetch failure-isolated: a thrown error during prerender aborts the
  // ENTIRE production build (2026-07-07 incident) — the homepage is the last
  // page that may take the site down over one degraded API call.
  const [upcomingCall, popularCall, trendingCall, gamesCall] =
    await Promise.allSettled([
      api.listSchedules({
        status: ['upcoming'],
        includePredictions: true,
        from: now.toISOString(),
        to: twentyFourHoursFromNow.toISOString(),
        limit: 8,
        revalidate: 60,
      }),
      api.listStreamers({
        order: 'popular',
        limit: 20,
        revalidate: 300,
      }),
      fetchTrendingRail(10),
      // Catalog for the trending rail's 404-avoidance (only games with a hub
      // page get linked). Same URL + revalidate as the /games page call, so
      // this shares its data-cache entry instead of adding load.
      api.listGames({ limit: 500, revalidate: 600 }),
    ]);

  const upcomingSlots =
    upcomingCall.status === 'fulfilled' ? upcomingCall.value.data : [];
  const popularStreamers =
    popularCall.status === 'fulfilled' ? popularCall.value.data : [];
  const trending = trendingCall.status === 'fulfilled' ? trendingCall.value : [];
  // Map stays server-side only (TrendingRail is a server component).
  const catalogSlugByName = new Map(
    (gamesCall.status === 'fulfilled' ? gamesCall.value.data : [])
      .map((g) => [g.category, gameSlug(g.category)] as const)
      .filter(([, slug]) => slug.length > 0),
  );

  return (
    <main className="container mx-auto max-w-6xl px-6 pb-16 pt-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildWebSiteJsonLd()),
        }}
      />

      <HomeHero />

      <UpcomingGrid slots={upcomingSlots} />

      {/* Trending games — the homepage carries the most link equity, so these
          in-body /game/* and /games links matter more than the nav's. Rail
          degrades to null when trending is empty; cards render unlinked when
          the catalog call failed (never internal 404s). */}
      <TrendingRail trending={trending} catalogSlugByName={catalogSlugByName} />
      {trending.length > 0 && (
        <p className="mt-2 text-sm">
          <Link
            href={localeHref(locale, '/games')}
            className="text-accent-cyan hover:text-text-primary"
          >
            Browse all games &amp; categories →
          </Link>
        </p>
      )}

      {/* Crawlable in-body link to the live hub — the homepage carries the
          most link equity, so this outweighs the header/footer links. */}
      <p className="mt-6 text-sm">
        <Link
          href={localeHref(locale, '/live')}
          className="text-accent-cyan hover:text-text-primary"
        >
          See everyone who&apos;s live right now →
        </Link>
      </p>

      <PopularStreamersFooter streamers={popularStreamers} />

      <ApiPromo />
    </main>
  );
}
