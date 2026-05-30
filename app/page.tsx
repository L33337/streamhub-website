import type { Metadata } from 'next';
import { getPartnerApi } from '@/lib/server/partner-api';
import { HomeHero } from '@/components/web/HomeHero';
import { UpcomingGrid } from '@/components/web/UpcomingGrid';
import { PopularStreamersFooter } from '@/components/web/PopularStreamersFooter';
import { ApiPromo } from '@/components/web/ApiPromo';

export const revalidate = 60;

const SITE_URL = 'https://streamertimes.tv';

export const metadata: Metadata = {
  title:
    'Live Streamer Schedule — Twitch & YouTube Stream Guide | StreamerTimes',
  description:
    'Find out when your favorite streamers go live on Twitch and YouTube. Real-time live status, upcoming schedule, and AI-powered predictions.',
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: 'Streamer Times — Live Streamer Schedule',
    description:
      'Real-time Twitch and YouTube live status with AI-powered schedule predictions.',
    url: SITE_URL,
    siteName: 'Streamer Times',
    type: 'website',
  },
};

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

export default async function HomePage() {
  const api = getPartnerApi();
  const now = new Date();
  const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const [upcomingResp, popularResp] = await Promise.all([
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
  ]);

  return (
    <main className="container mx-auto max-w-6xl px-6 pb-16 pt-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildWebSiteJsonLd()),
        }}
      />

      <HomeHero />

      <UpcomingGrid slots={upcomingResp.data} />

      <PopularStreamersFooter streamers={popularResp.data} />

      <ApiPromo />
    </main>
  );
}
