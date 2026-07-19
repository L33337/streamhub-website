// Shared renderer for the four /rankings/<metric> leaderboard pages. Not a
// route file — the thin page.tsx wrappers under most-followed/ etc. delegate
// here so metadata + body logic exists exactly once.

import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  getPartnerApi,
  type PublicRankingEntry,
  type RankingMetric,
} from '@/lib/server/partner-api';
import { buildBreadcrumbJsonLd } from '@/lib/seo';
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

const SITE_URL = 'https://streamertimes.tv';

interface LoadedRanking {
  entries: PublicRankingEntry[];
  /** ISO timestamp of the last nightly aggregate refresh; null for table-backed metrics or on failure. */
  refreshedAt: string | null;
}

// Failure-isolated loader shared by generateMetadata + the page body (React
// cache dedupes per request). Never throws — a thrown error during prerender
// aborts the ENTIRE production build (see app/game/[slug]/page.tsx); a failed
// fetch degrades to an empty, noindexed page that ISR self-heals within the
// hour. Rankings move nightly, so the 1h data-cache revalidate is plenty.
const loadRanking = cache(async (metric: RankingMetric): Promise<LoadedRanking> => {
  try {
    const resp = await getPartnerApi().getRankings(metric, { limit: 100, revalidate: 3600 });
    return { entries: resp.data, refreshedAt: resp.refreshed_at };
  } catch {
    return { entries: [], refreshedAt: null };
  }
});

async function loadEntries(spec: RankingPageSpec): Promise<LoadedRanking> {
  const { entries, refreshedAt } = await loadRanking(spec.metric);
  return { entries: sanitizeRankingEntries(spec, entries), refreshedAt };
}

export async function buildLeaderboardMetadata(slug: string): Promise<Metadata> {
  const spec = getRankingPageSpec(slug);
  if (!spec) return { title: 'Streamer Rankings — StreamerTimes' };
  const { entries } = await loadEntries(spec);
  const url = rankingCanonicalUrl(spec.slug);
  const title = spec.buildTitle(entries.length);
  const description = spec.buildDescription(entries[0]);
  const meta: Metadata = {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'Streamer Times', type: 'website' },
  };
  // Thin-content gate (cold start / API failure): render, but stay out of the
  // index until the leaderboard has enough real entries. Only set robots when
  // gating OUT — otherwise inherit the root index:true (lib/seo.ts convention).
  if (!isRankingIndexable(entries.length)) {
    meta.robots = { index: false, follow: true };
  }
  return meta;
}

export async function LeaderboardPage({ slug }: { slug: string }) {
  const spec = getRankingPageSpec(slug);
  if (!spec) return null; // unreachable from the fixed wrappers
  const { entries, refreshedAt } = await loadEntries(spec);
  const siblings = RANKING_PAGES.filter((p) => p.slug !== spec.slug);
  const refreshedLabel = formatRefreshedAt(refreshedAt);

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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {entries.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
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
            {spec.buildIntro(entries.length, entries[0])}
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
          <div className="mt-6">
            <RankingTable
              caption={spec.h1}
              columns={spec.columns}
              entries={entries}
              rowAnchorPrefix="rank"
            />
          </div>
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
