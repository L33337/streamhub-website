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
  getRankingPageSpec,
  isRankingIndexable,
  rankingCanonicalUrl,
  sanitizeRankingEntries,
  RANKING_PAGES,
  type RankingPageSpec,
} from '@/lib/rankings';
import { RankingTable } from '@/components/web/RankingTable';

const SITE_URL = 'https://streamertimes.tv';

// Failure-isolated loader shared by generateMetadata + the page body (React
// cache dedupes per request). Never throws — a thrown error during prerender
// aborts the ENTIRE production build (see app/game/[slug]/page.tsx); a failed
// fetch degrades to an empty, noindexed page that ISR self-heals within the
// hour. Rankings move nightly, so the 1h data-cache revalidate is plenty.
const loadRanking = cache(
  async (metric: RankingMetric): Promise<PublicRankingEntry[]> => {
    try {
      const resp = await getPartnerApi().getRankings(metric, { limit: 100, revalidate: 3600 });
      return resp.data;
    } catch {
      return [];
    }
  },
);

async function loadEntries(spec: RankingPageSpec): Promise<PublicRankingEntry[]> {
  return sanitizeRankingEntries(spec, await loadRanking(spec.metric));
}

export async function buildLeaderboardMetadata(slug: string): Promise<Metadata> {
  const spec = getRankingPageSpec(slug);
  if (!spec) return { title: 'Streamer Rankings — StreamerTimes' };
  const entries = await loadEntries(spec);
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
  const entries = await loadEntries(spec);
  const siblings = RANKING_PAGES.filter((p) => p.slug !== spec.slug);

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

      {entries.length > 0 ? (
        <>
          <p className="mt-3 max-w-2xl text-text-secondary">
            {spec.buildIntro(entries.length, entries[0])}
          </p>
          <p className="mt-2 max-w-2xl text-sm text-text-muted">{spec.methodologyNote}</p>
          <div className="mt-6">
            <RankingTable caption={spec.h1} columns={spec.columns} entries={entries} />
          </div>
        </>
      ) : (
        <p className="mt-3 max-w-2xl text-text-secondary">
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
