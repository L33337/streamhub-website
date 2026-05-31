import type { Metadata } from 'next';
import {
  getPartnerApi,
  PartnerApiError,
  type Paginated,
  type PublicStreamer,
} from '@/lib/server/partner-api';
import { getLiveStreamerIdSet } from '@/lib/server/live-streamers';
import {
  SearchResultCard,
  type SearchResultStreamer,
} from '@/components/web/SearchResultCard';
import { buildBreadcrumbJsonLd } from '@/lib/seo';

export const revalidate = 300;

const SITE_URL = 'https://streamertimes.tv';
const PAGE_SIZE = 100;

export const metadata: Metadata = {
  title: 'Browse Streamers — Twitch & YouTube Live Schedules | StreamerTimes',
  description:
    'Browse the most popular Twitch and YouTube streamers tracked on Streamer Times. See who is live now, upcoming schedules, and AI-predicted next streams.',
  alternates: { canonical: `${SITE_URL}/streamers` },
  openGraph: {
    title: 'Browse Streamers — Twitch & YouTube Live Schedules',
    description:
      'The most popular Twitch and YouTube streamers, their live status, and AI-powered schedule predictions.',
    url: `${SITE_URL}/streamers`,
    siteName: 'Streamer Times',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export default async function StreamersIndexPage() {
  let results: Paginated<PublicStreamer> | null = null;
  let liveSet: Set<string> = new Set();

  try {
    const [streamersResp, liveResp] = await Promise.all([
      getPartnerApi().listStreamers({
        order: 'popular',
        limit: PAGE_SIZE,
        revalidate: 300,
      }),
      getLiveStreamerIdSet().catch(() => new Set<string>()),
    ]);
    results = streamersResp;
    liveSet = liveResp;
  } catch (err) {
    if (!(err instanceof PartnerApiError)) throw err;
    // Render the shell with an error note rather than crashing the route.
  }

  const enriched: SearchResultStreamer[] = (results?.data ?? []).map((s) => ({
    ...s,
    is_live: liveSet.has(s.id),
  }));

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'Home', url: SITE_URL },
    { name: 'Streamers' },
  ]);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <h1 className="text-3xl font-bold text-white">Browse all streamers</h1>
      <p className="mt-3 max-w-2xl text-text-secondary">
        The most popular Twitch and YouTube streamers tracked on Streamer Times
        — see who is live now and what they stream next.
      </p>

      {enriched.length === 0 ? (
        <div className="mt-8 gradient-border p-8 text-center">
          <p className="text-accent-pink">
            Streamers are temporarily unavailable. Please try again in a moment.
          </p>
        </div>
      ) : (
        <ul
          className="mt-6 grid gap-3 sm:grid-cols-2"
          aria-label="Popular streamers"
        >
          {enriched.map((s) => (
            <li key={s.id}>
              <SearchResultCard streamer={s} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
