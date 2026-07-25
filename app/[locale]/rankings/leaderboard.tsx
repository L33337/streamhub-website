// Shared renderer for the four /rankings/<metric> leaderboard pages. Not a
// route file — the thin page.tsx wrappers under most-followed/ etc. delegate
// here so metadata + body logic exists exactly once.

import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getPartnerApi,
  type PublicRankingEntry,
  type RankingMetric,
} from '@/lib/server/partner-api';
import { buildBreadcrumbJsonLd, jsonLdHtml } from '@/lib/seo';
import {
  buildRankingItemListJsonLd,
  formatRefreshedAt,
  getRankingPageSpec,
  hasMissingValues,
  isRankingIndexable,
  rankingCanonicalUrl,
  sanitizeRankingEntries,
  RANKING_PAGES,
  type RankingPageSpec,
} from '@/lib/rankings';
import { RankingTable } from '@/components/web/RankingTable';
import { RankingSpotlight } from '@/components/web/RankingSpotlight';
import { RankingPagination } from '@/components/web/RankingPagination';
import { pageCount, RANKING_PAGE_SIZE } from '@/lib/streamer-rankings';
import { getLiveStreamerIdSet } from '@/lib/server/live-streamers';
import { getNextSlotByStreamer } from '@/lib/server/next-streams';
import { gameSlug } from '@/lib/game-slug';

const SITE_URL = 'https://streamertimes.tv';

interface LoadedRanking {
  entries: PublicRankingEntry[];
  /** ISO timestamp of the last nightly aggregate refresh; null for table-backed metrics or on failure. */
  refreshedAt: string | null;
  /** Exact pool size across all pages (0 on failure). */
  total: number;
}

// Failure-isolated loader shared by generateMetadata + the page body (React
// cache dedupes per request). Never throws — a thrown error during prerender
// aborts the ENTIRE production build (see app/game/[slug]/page.tsx); a failed
// fetch degrades to an empty, noindexed page that ISR self-heals within the
// hour. Rankings move nightly, so the 1h data-cache revalidate is plenty.
const loadRanking = cache(
  async (metric: RankingMetric, page: number): Promise<LoadedRanking> => {
    try {
      const resp = await getPartnerApi().getRankings(metric, {
        limit: RANKING_PAGE_SIZE,
        offset: (page - 1) * RANKING_PAGE_SIZE,
        revalidate: 3600,
      });
      return {
        entries: resp.data,
        refreshedAt: resp.refreshed_at,
        // An API deployment without pagination still returns entries; fall back
        // to "this page is everything" so the page renders un-paginated.
        total: resp.pagination?.total ?? resp.data.length,
      };
    } catch {
      return { entries: [], refreshedAt: null, total: 0 };
    }
  },
);

async function loadEntries(spec: RankingPageSpec, page: number): Promise<LoadedRanking> {
  const loaded = await loadRanking(spec.metric, page);
  return {
    ...loaded,
    // Absolute start rank — the row anchors the streamer pages link into.
    entries: sanitizeRankingEntries(spec, loaded.entries, (page - 1) * RANKING_PAGE_SIZE + 1),
  };
}

export async function buildLeaderboardMetadata(slug: string, page = 1): Promise<Metadata> {
  const spec = getRankingPageSpec(slug);
  if (!spec) return { title: 'Streamer Rankings — StreamerTimes' };
  const { entries, total } = await loadEntries(spec, page);
  const url = leaderboardUrl(spec.slug, page);
  const baseTitle = spec.buildTitle(total || entries.length);
  // Page 2+ must not duplicate page 1's title/description verbatim — near-identical
  // <title>s across a paginated set is a classic duplicate-content signal.
  const title = page === 1 ? baseTitle : `${baseTitle} — Page ${page}`;
  const description =
    page === 1
      ? spec.buildDescription(entries[0])
      : `${spec.h1} ranked ${rangeLabel(page, entries.length)} on Streamer Times. ${spec.methodologyNote}`;
  const meta: Metadata = {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'Streamer Times', type: 'website' },
  };
  // Thin-content gate (cold start / API failure): render, but stay out of the
  // index until the leaderboard has enough real entries. Only set robots when
  // gating OUT — otherwise inherit the root index:true (lib/seo.ts convention).
  //
  // Pages 2+ are always noindex,follow: they are near-duplicate list pages whose
  // individual ranks carry little standalone search value, but `follow` keeps
  // them as a crawl path to the streamer pages they link to (and to the deep
  // ranks the streamer pages link back into).
  if (page > 1 || !isRankingIndexable(entries.length)) {
    meta.robots = { index: false, follow: true };
  }
  return meta;
}

/** Canonical URL of a leaderboard page — page 1 keeps the clean, un-suffixed URL. */
export function leaderboardUrl(slug: string, page: number): string {
  return page === 1 ? rankingCanonicalUrl(slug) : `${rankingCanonicalUrl(slug)}/${page}`;
}

/** "101–200" for the rank range a page covers. */
function rangeLabel(page: number, count: number): string {
  const first = (page - 1) * RANKING_PAGE_SIZE + 1;
  return count > 0 ? `${first}–${first + count - 1}` : `from ${first}`;
}

export async function LeaderboardPage({ slug, page = 1 }: { slug: string; page?: number }) {
  const spec = getRankingPageSpec(slug);
  if (!spec) return null; // unreachable from the fixed wrappers
  // Live badges are decoration — a failed live lookup must never break the
  // page, so it degrades to an empty set (no badges).
  const livePromise = getLiveStreamerIdSet().catch(() => new Set<string>());
  // Games list gates the "Main game" links: /rankings/game/[slug] 404s for
  // categories outside it, so those render as plain text. Failure → empty map
  // → every main game renders unlinked (never breaks the page).
  const gamesPromise = getPartnerApi()
    .listGames({ limit: 500, revalidate: 3600 })
    .catch(() => null);
  const { entries, refreshedAt, total } = await loadEntries(spec, page);
  const pages = pageCount(total, RANKING_PAGE_SIZE);
  // A deep page with nothing on it is a URL that should not exist — 404 rather
  // than serve an empty "warming up" body under a real-looking rank range.
  // Page 1 is exempt: it legitimately renders the warming-up state during cold
  // start and on an API blip, and must never 404 a canonical URL over a
  // transient fetch failure.
  if (page > 1 && entries.length === 0) notFound();
  // Never throws (failure paths inside degrade to an empty/partial map).
  const nextSlots = await getNextSlotByStreamer(entries.map((e) => e.streamer.id));
  const liveIds = await livePromise;
  const mainGameSlugs = new Map<string, string>(
    ((await gamesPromise)?.data ?? [])
      .map((g) => [g.category, gameSlug(g.category)] as const)
      .filter(([, slug]) => slug.length > 0),
  );
  const siblings = RANKING_PAGES.filter((p) => p.slug !== spec.slug);
  const refreshedLabel = formatRefreshedAt(refreshedAt);
  const top = entries[0];
  const primaryColumn = spec.columns.find((c) => c.primary) ?? spec.columns[0];

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'Home', url: SITE_URL },
    { name: 'Rankings', url: `${SITE_URL}/rankings` },
    { name: spec.navLabel },
  ]);
  const itemList = buildRankingItemListJsonLd(spec.h1, entries);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(breadcrumb) }}
      />
      {/* Page 1 only: pages 2+ are noindex, so structured data there is dead weight. */}
      {page === 1 && entries.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdHtml(itemList) }}
        />
      )}

      <p className="text-sm text-text-muted">
        <Link href="/rankings" className="hover:text-accent-cyan">
          Rankings
        </Link>{' '}
        / {spec.navLabel}
      </p>
      <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">{spec.h1}</h1>

      <nav aria-label="Ranking categories" className="mt-4 flex flex-wrap gap-2">
        {RANKING_PAGES.map((p) =>
          p.slug === spec.slug ? (
            <span
              key={p.slug}
              aria-current="page"
              className="inline-block rounded-full border border-accent-cyan/60 bg-background-elevated px-4 py-1.5 text-sm font-semibold text-accent-cyan"
            >
              {p.navLabel}
            </span>
          ) : (
            <Link
              key={p.slug}
              href={`/rankings/${p.slug}`}
              className="inline-block rounded-full border border-border-default bg-background-elevated px-4 py-1.5 text-sm text-text-primary transition-colors hover:border-accent-cyan/60 hover:text-accent-cyan"
            >
              {p.navLabel}
            </Link>
          ),
        )}
      </nav>

      {entries.length > 0 ? (
        <>
          <p className="mt-4 max-w-2xl text-text-secondary">
            {page === 1
              ? spec.buildIntro(total || entries.length, entries[0])
              : `Ranks ${rangeLabel(page, entries.length)} of ${total} ${spec.h1.toLowerCase()} on Streamer Times.`}
          </p>
          <p className="mt-2 max-w-2xl text-sm text-text-muted">
            {spec.methodologyNote}
            {refreshedLabel && (
              <>
                {' '}
                Data refreshed <time dateTime={refreshedAt!}>{refreshedLabel}</time>.
              </>
            )}
          </p>
          {/* The spotlight is the #1 streamer — meaningless on a deeper page. */}
          {page === 1 && top && primaryColumn && (
            <RankingSpotlight
              entry={top}
              metricValue={primaryColumn.format(top)}
              metricLabel={primaryColumn.header}
              isLive={liveIds.has(top.streamer.id)}
              nextSlot={nextSlots.get(top.streamer.id)}
              mainGameSlugs={mainGameSlugs}
            />
          )}
          <div className="mt-6">
            <RankingTable
              caption={spec.h1}
              columns={spec.columns}
              entries={entries}
              rowAnchorPrefix="rank"
              liveIds={liveIds}
              nextSlots={nextSlots}
              mainGameSlugs={mainGameSlugs}
            />
          </div>
          <RankingPagination
            page={page}
            pages={pages}
            hrefFor={(n) => (n === 1 ? `/rankings/${spec.slug}` : `/rankings/${spec.slug}/${n}`)}
            label={`${spec.navLabel} pages`}
          />
          <p className="mt-2 text-xs text-text-muted">
            Next stream: announced schedule or AI-predicted (~) start within the next
            7 days, shown in your local time, with the expected game below it.
          </p>
          {hasMissingValues(spec, entries) && (
            <p className="mt-2 text-xs text-text-muted">
              — means we haven&apos;t collected enough data for that channel yet, for
              example viewer sampling for recently added channels.
            </p>
          )}
          {spec.faq.length > 0 && (
            <section aria-labelledby="ranking-faq-heading" className="mt-12 max-w-2xl">
              <h2 id="ranking-faq-heading" className="text-xl font-bold text-white">
                About this ranking
              </h2>
              <dl className="mt-4 space-y-5">
                {spec.faq.map(({ q, a }) => (
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
        <p className="mt-4 max-w-2xl text-text-secondary">
          This ranking is warming up — we need a bit more data before it&apos;s
          meaningful. Check back soon.
        </p>
      )}

      <p className="mt-12 border-t border-divider pt-6 text-sm text-text-secondary">
        <Link href="/rankings" className="text-accent-cyan hover:text-text-primary">
          ← All rankings
        </Link>
        {siblings.map((p) => (
          <span key={p.slug}>
            {'  ·  '}
            <Link
              href={`/rankings/${p.slug}`}
              className="text-accent-cyan hover:text-text-primary"
            >
              {p.navLabel}
            </Link>
          </span>
        ))}
        {'  ·  '}
        <Link href="/streamers" className="text-accent-cyan hover:text-text-primary">
          Browse all streamers A–Z
        </Link>
      </p>
    </main>
  );
}
