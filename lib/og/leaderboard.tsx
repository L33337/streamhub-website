import { ImageResponse } from 'next/og';
import { getPartnerApi, type PublicRankingEntry } from '@/lib/server/partner-api';
import { renderOgFrame, OG_SIZE, ogCacheHeaders } from '@/lib/og/frame';

/** Must match `export const revalidate` in app/[locale]/rankings/<metric>/opengraph-image.tsx. */
const LEADERBOARD_OG_REVALIDATE = 300;
import { leaderboardOgProps } from '@/lib/og/leaderboard-props';
import { getRankingPageSpec, sanitizeRankingEntries } from '@/lib/rankings';
import { RANKING_PAGE_SIZE } from '@/lib/streamer-rankings';

// Per-metric OG card for the /rankings/<metric> leaderboard pages: metric
// title, the #1 lead line, and the top 3 as medal pills. Metadata file
// conventions attach only within their own segment (the hub's
// app/[locale]/rankings/opengraph-image.tsx never reached the subpages), so
// each metric folder has a thin opengraph-image.tsx delegating here. The
// pure props builder lives in lib/og/leaderboard-props.ts (client-safe,
// unit-tested).

/**
 * Shared route body for the five metric opengraph-image.tsx files. The fetch
 * mirrors the page's loadRanking call (same URL + revalidate → shared data
 * cache, zero extra Partner API load) and every failure degrades to the
 * pill-free card — a throw during prerender aborts the whole build.
 */
export async function buildLeaderboardOgImage(slug: string): Promise<ImageResponse> {
  const spec = getRankingPageSpec(slug);
  let entries: PublicRankingEntry[] = [];
  if (spec) {
    try {
      const resp = await getPartnerApi().getRankings(spec.metric, {
        limit: RANKING_PAGE_SIZE,
        revalidate: 3600,
      });
      entries = sanitizeRankingEntries(spec, resp.data);
    } catch {
      // keep the count-free fallback card
    }
  }
  return new ImageResponse(
    renderOgFrame(
      spec ? leaderboardOgProps(spec, entries) : { title: 'Streamer Rankings' },
    ),
    // The five leaderboard routes export `revalidate = 300`; keep the CDN
    // TTL identical (see ogCacheHeaders).
    { ...OG_SIZE, headers: ogCacheHeaders(LEADERBOARD_OG_REVALIDATE) },
  );
}
