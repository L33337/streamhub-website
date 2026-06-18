import type { Metadata } from 'next';
import Link from 'next/link';
import {
  getPartnerApi,
  PartnerApiError,
  type Paginated,
  type Platform,
  type PublicStreamer,
} from '@/lib/server/partner-api';
import { getLiveStreamerIdSet } from '@/lib/server/live-streamers';
import {
  SearchResultCard,
  type SearchResultStreamer,
} from '@/components/web/SearchResultCard';
import { SearchFilters } from '@/components/web/SearchFilters';

export const dynamic = 'force-dynamic';

const MIN_QUERY = 2;
const MAX_QUERY = 100;
const PAGE_SIZE = 50;

interface Props {
  searchParams: Promise<{
    q?: string;
    platform?: string;
    live?: string;
    cursor?: string;
  }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';
  if (query.length < MIN_QUERY) {
    return {
      title: 'Search Streamers | StreamerTimes',
      description: 'Search streamers by name on Streamer Times.',
      robots: { index: false, follow: true },
    };
  }
  return {
    title: `${query} — Search Streamers | StreamerTimes`,
    description: `Search results for "${query}" on Streamer Times. Find livestream schedules and AI predictions across Twitch and YouTube.`,
    // Internal search result pages are noindex (thin/duplicate content; unbounded
    // query permutations otherwise become "Crawled - currently not indexed" noise).
    // follow: true keeps crawl-through to the linked streamer pages alive.
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = (params.q ?? '').trim();
  const platformRaw = params.platform;
  const cursor = params.cursor;
  const liveOnly = params.live === 'true';

  const platformParam: Platform[] | undefined =
    platformRaw === 'twitch' || platformRaw === 'youtube'
      ? [platformRaw]
      : undefined;
  const activePlatform: Platform | null =
    platformParam ? platformParam[0] : null;

  if (query.length === 0) {
    return (
      <PageShell>
        <EmptyQueryState />
      </PageShell>
    );
  }
  if (query.length < MIN_QUERY) {
    return (
      <PageShell title={`Search results for “${query}”`}>
        <p className="mt-4 text-text-secondary">
          Please enter at least {MIN_QUERY} characters.
        </p>
      </PageShell>
    );
  }
  if (query.length > MAX_QUERY) {
    return (
      <PageShell title={`Search results for “${query.slice(0, 40)}…”`}>
        <ErrorState message="Search query is too long (max 100 characters)." />
      </PageShell>
    );
  }

  let results: Paginated<PublicStreamer>;
  let liveSet: Set<string>;
  try {
    [results, liveSet] = await Promise.all([
      getPartnerApi().listStreamers({
        search: query,
        platform: platformParam,
        limit: PAGE_SIZE,
        cursor,
        revalidate: 60,
      }),
      getLiveStreamerIdSet().catch(() => new Set<string>()),
    ]);
  } catch (err) {
    if (err instanceof PartnerApiError) {
      return (
        <PageShell title={`Search results for “${query}”`}>
          <ErrorState message="Search is temporarily unavailable. Please try again in a moment." />
        </PageShell>
      );
    }
    throw err;
  }

  const enriched: SearchResultStreamer[] = results.data.map((s) => ({
    ...s,
    is_live: liveSet.has(s.id),
  }));
  const filtered = liveOnly ? enriched.filter((r) => r.is_live) : enriched;

  return (
    <PageShell>
      <h1 className="text-3xl font-bold text-white">
        Search results for{' '}
        <span className="text-white">&ldquo;{query}&rdquo;</span>
      </h1>
      <SearchFilters q={query} platform={activePlatform} live={liveOnly} />

      {filtered.length === 0 ? (
        <NoResultsState query={query} liveOnly={liveOnly} />
      ) : (
        <ul className="mt-6 grid gap-3" aria-label={`Streamers matching ${query}`}>
          {filtered.map((s) => (
            <li key={s.id}>
              <SearchResultCard streamer={s} />
            </li>
          ))}
        </ul>
      )}

      {results.pagination.has_more && results.pagination.next_cursor && (
        <NextPageLink
          query={query}
          platform={platformRaw}
          live={liveOnly}
          cursor={results.pagination.next_cursor}
        />
      )}
    </PageShell>
  );
}

function PageShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      {title && <h1 className="text-3xl font-bold text-white">{title}</h1>}
      {children}
    </main>
  );
}

function EmptyQueryState() {
  return (
    <div className="mt-12 gradient-border p-8 text-center">
      <h2 className="text-2xl font-bold text-white">Find a streamer</h2>
      <p className="mt-3 text-text-secondary max-w-xl mx-auto">
        Start typing in the search bar above to find streamers by name across
        Twitch and YouTube.
      </p>
    </div>
  );
}

function NoResultsState({ query, liveOnly }: { query: string; liveOnly: boolean }) {
  return (
    <div className="mt-8 gradient-border p-8 text-center">
      <h2 className="text-xl font-bold text-text-primary">
        No streamers found{liveOnly ? ' that are live' : ''}
      </h2>
      <p className="mt-3 text-text-secondary">
        Nothing matches &ldquo;{query}&rdquo;
        {liveOnly ? ' right now' : ''}. Try a shorter or different query
        {liveOnly ? ', or remove the "Live only" filter' : ''}.
      </p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="mt-8 gradient-border p-8 text-center">
      <p className="text-accent-pink">{message}</p>
    </div>
  );
}

function NextPageLink({
  query,
  platform,
  live,
  cursor,
}: {
  query: string;
  platform: string | undefined;
  live: boolean;
  cursor: string;
}) {
  const params = new URLSearchParams();
  params.set('q', query);
  if (platform) params.set('platform', platform);
  if (live) params.set('live', 'true');
  params.set('cursor', cursor);
  return (
    <div className="mt-8 flex justify-center">
      <Link
        href={`/search?${params.toString()}`}
        className="inline-flex items-center rounded-lg border border-accent-cyan/60 bg-accent-cyan/10 px-4 py-2 text-sm font-semibold text-accent-cyan hover:bg-accent-cyan/20 transition-colors"
      >
        Load more results →
      </Link>
    </div>
  );
}
