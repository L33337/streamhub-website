import type { Metadata } from 'next';
import {
  getPartnerApi,
  PartnerApiError,
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
const PAGE_LIMIT = 500;
const MAX_PAGES = 4; // safety cap = 2000 streamers fetched for the A–Z index

export const metadata: Metadata = {
  title: 'All Streamers A–Z — Twitch & YouTube Live Schedules | StreamerTimes',
  description:
    'Browse every Twitch and YouTube streamer tracked on Streamer Times, A to Z. See who is live now, upcoming schedules, and AI-predicted next streams.',
  alternates: { canonical: `${SITE_URL}/streamers` },
  openGraph: {
    title: 'All Streamers A–Z — Twitch & YouTube Live Schedules',
    description:
      'Every Twitch and YouTube streamer tracked on Streamer Times, A to Z, with live status and AI-powered schedule predictions.',
    url: `${SITE_URL}/streamers`,
    siteName: 'Streamer Times',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

/** First-letter bucket key for a name: 'A'–'Z' or '#' for digits/symbols. */
function bucketKey(name: string): string {
  const first = name.trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first : '#';
}

// Bucket order: A–Z then '#'.
const LETTERS: string[] = [
  ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)),
  '#',
];

/**
 * Pages through the full streamer list (alphabetical) so every streamer page is
 * reachable from one crawlable HTML index, instead of only the top 100. Cursor
 * loop mirrors the sitemap generator in app/sitemap.ts.
 */
async function fetchAllStreamers(): Promise<PublicStreamer[]> {
  const api = getPartnerApi();
  const all: PublicStreamer[] = [];
  let cursor: string | undefined = undefined;
  let pages = 0;

  do {
    const resp = await api.listStreamers({
      order: 'name',
      limit: PAGE_LIMIT,
      cursor,
      revalidate: 300,
    });
    all.push(...resp.data);
    cursor = resp.pagination.next_cursor ?? undefined;
    pages++;
  } while (cursor && pages < MAX_PAGES);

  return all;
}

export default async function StreamersIndexPage() {
  let streamers: PublicStreamer[] = [];
  let liveSet: Set<string> = new Set();
  let failed = false;

  try {
    const [all, liveResp] = await Promise.all([
      fetchAllStreamers(),
      getLiveStreamerIdSet().catch(() => new Set<string>()),
    ]);
    streamers = all;
    liveSet = liveResp;
  } catch (err) {
    if (!(err instanceof PartnerApiError)) throw err;
    failed = true;
  }

  // Group into A–Z (+ '#') buckets, preserving the API's alphabetical order.
  const buckets = new Map<string, SearchResultStreamer[]>();
  for (const s of streamers) {
    const key = bucketKey(s.name);
    const arr = buckets.get(key) ?? [];
    arr.push({ ...s, is_live: liveSet.has(s.id) });
    buckets.set(key, arr);
  }
  const activeLetters = LETTERS.filter((l) => buckets.has(l));

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

      <h1 className="text-3xl font-bold text-white">
        All Twitch &amp; YouTube streamers A–Z
      </h1>
      <p className="mt-3 max-w-2xl text-text-secondary">
        Every streamer tracked on Streamer Times — see who is live now and what
        they stream next. Jump to a letter or scroll the full list.
      </p>

      {failed || streamers.length === 0 ? (
        <div className="mt-8 gradient-border p-8 text-center">
          <p className="text-accent-pink">
            Streamers are temporarily unavailable. Please try again in a moment.
          </p>
        </div>
      ) : (
        <>
          {/* Sticky A–Z jump bar (pattern mirrors DayNavBar). */}
          <nav
            aria-label="Jump to a letter"
            className="sticky top-[var(--header-height)] z-10 -mx-4 mt-6 mb-2 border-b border-divider bg-background/95 px-4 py-3 backdrop-blur"
          >
            <ul className="flex flex-wrap gap-1.5" role="list">
              {activeLetters.map((letter) => (
                <li key={letter}>
                  <a
                    href={`#letter-${letter === '#' ? 'hash' : letter}`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border-default bg-background-elevated text-xs font-semibold text-text-primary transition-colors hover:border-accent-cyan/60 hover:bg-background-highlight hover:text-accent-cyan"
                  >
                    {letter}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {activeLetters.map((letter) => {
            const group = buckets.get(letter) ?? [];
            return (
              <section
                key={letter}
                id={`letter-${letter === '#' ? 'hash' : letter}`}
                aria-labelledby={`heading-${letter === '#' ? 'hash' : letter}`}
                className="mt-8 scroll-mt-28"
              >
                <h2
                  id={`heading-${letter === '#' ? 'hash' : letter}`}
                  className="text-xl font-bold text-accent-cyan"
                >
                  {letter}
                </h2>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {group.map((s) => (
                    <li key={s.id}>
                      <SearchResultCard streamer={s} compact />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </>
      )}
    </main>
  );
}
