import 'server-only';

import { cache } from 'react';
import { getPartnerApi, type PublicRankingEntry } from './partner-api';
import { sanitizeRankingEntries, type RankingPageSpec } from '@/lib/rankings';

/**
 * Paged access to a WHOLE ranking pool, for the /rankings hub's filterable
 * Top-5 previews.
 *
 * The leaderboard endpoint caps a response at 100 rows and cannot filter by
 * category or language, so both jobs the hub needs — counting the filter
 * options over the full pool, and finding the top five rows of one selection —
 * come down to walking the pool page by page. Two consumers, one walker:
 *
 *   loadRankingPool()        → every page (the ISR page, for the facet counts)
 *   findTopRankingMatches()  → pages until N matches are found (the API route)
 *
 * Caching is what makes that affordable. Every page URL is timestamp-free, so
 * the Next data cache holds it for an hour and it is shared across ISR
 * regenerations, all 12 locale variants of the page, the build workers and the
 * API route (lib/server/live-streamers.ts learned this the hard way: unstable
 * URLs multiplied one sweep into one-per-caller and saturated the partner API
 * during `next build`). React `cache` dedupes within a single request on top.
 *
 * Every failure path degrades to the pages collected so far — a hub section
 * with no data is hidden, a half-loaded pool undercounts its options, and
 * neither ever throws during prerender (a throw aborts the whole build).
 */

/** Partner API max rows per rankings response. */
const PAGE_SIZE = 100;

/**
 * Ceiling on pages per metric (12 → 1,200 entries). Today's largest pool is
 * ~680, so this is pure headroom; it exists so a roster that grows into the
 * thousands (CLAUDE.md targets 1,000+ streamers) cannot silently turn one page
 * render into 50 API calls. When it bites, the facet counts describe the head
 * of the ranking instead of all of it — which is why hitting it logs.
 */
const MAX_PAGES = 12;

/**
 * Pages fetched concurrently per metric after the first. The five metrics load
 * in parallel too, so this is deliberately small: 5 × 2 in flight, not 5 × 12.
 */
const PAGE_CONCURRENCY = 2;

/** Data-cache lifetime of one page. Rankings move nightly. */
const REVALIDATE_SECONDS = 3600;

interface PoolPage {
  entries: PublicRankingEntry[];
  /** Exact pool size across all pages; 0 on failure. */
  total: number;
  refreshedAt: string | null;
}

export interface RankingPool {
  /** Sanitized entries in rank order, carrying their ABSOLUTE ranks. */
  entries: PublicRankingEntry[];
  /** Exact pool size the API reports (may exceed `entries.length` — see truncated). */
  total: number;
  refreshedAt: string | null;
  /** True when MAX_PAGES cut the walk short: `entries` is the head only. */
  truncated: boolean;
}

/**
 * One page of a leaderboard, failure-isolated. `page` is 1-based.
 *
 * React-cached so the ISR page and anything else in the same request share it;
 * the fetch inside is data-cached for an hour and shared far wider.
 */
const loadPoolPage = cache(
  async (metric: RankingPageSpec['metric'], page: number): Promise<PoolPage> => {
    try {
      const resp = await getPartnerApi().getRankings(metric, {
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        revalidate: REVALIDATE_SECONDS,
      });
      return {
        entries: resp.data,
        // An API deployment without pagination still returns entries; fall back
        // to "this page is everything".
        total: resp.pagination?.total ?? resp.data.length,
        refreshedAt: resp.refreshed_at,
      };
    } catch (err) {
      console.warn(
        `[rankings-pool] ${metric} page ${page} failed:`,
        err instanceof Error ? err.message : err,
      );
      return { entries: [], total: 0, refreshedAt: null };
    }
  },
);

/** Sanitizes one page and stamps the absolute ranks of its offset. */
function sanitizePage(
  spec: RankingPageSpec,
  page: PoolPage,
  pageNumber: number,
): PublicRankingEntry[] {
  return sanitizeRankingEntries(spec, page.entries, (pageNumber - 1) * PAGE_SIZE + 1);
}

/** Number of pages a pool of `total` rows spans, clamped to MAX_PAGES. */
function pagesFor(total: number): number {
  return Math.min(MAX_PAGES, Math.max(1, Math.ceil(total / PAGE_SIZE)));
}

/**
 * The whole pool of one metric (up to MAX_PAGES × PAGE_SIZE entries).
 *
 * Used by the hub page to count the filter options, which is the one job that
 * genuinely needs every row: an option's count has to describe the pool the
 * filtered fetch will then search, or the dropdown promises matches the rows
 * can't deliver.
 */
export async function loadRankingPool(spec: RankingPageSpec): Promise<RankingPool> {
  const first = await loadPoolPage(spec.metric, 1);
  const entries = sanitizePage(spec, first, 1);
  const total = first.total;
  let refreshedAt = first.refreshedAt;

  const pages = pagesFor(total);
  for (let page = 2; page <= pages; page += PAGE_CONCURRENCY) {
    const batch = await Promise.all(
      Array.from({ length: Math.min(PAGE_CONCURRENCY, pages - page + 1) }, (_, i) =>
        loadPoolPage(spec.metric, page + i).then((loaded) => ({
          loaded,
          pageNumber: page + i,
        })),
      ),
    );
    for (const { loaded, pageNumber } of batch) {
      entries.push(...sanitizePage(spec, loaded, pageNumber));
      if (loaded.refreshedAt && (!refreshedAt || loaded.refreshedAt > refreshedAt)) {
        refreshedAt = loaded.refreshedAt;
      }
    }
  }

  const truncated = total > pages * PAGE_SIZE;
  if (truncated) {
    console.warn(
      `[rankings-pool] ${spec.metric} pool capped at ${pages * PAGE_SIZE} of ${total} entries — filter counts describe the head only`,
    );
  }
  return { entries, total, refreshedAt, truncated };
}

/**
 * Walks the pool page by page and returns the first `need` entries the
 * predicate accepts.
 *
 * The early stop is the whole point: the common selections ("English", "Just
 * Chatting") are satisfied by page 1, while a rare language legitimately walks
 * deeper — the pages it touches are the same cached ones the hub page already
 * warmed, so depth costs latency, not extra API load.
 */
export async function findTopRankingMatches(
  spec: RankingPageSpec,
  matches: (entry: PublicRankingEntry) => boolean,
  need: number,
): Promise<PublicRankingEntry[]> {
  const found: PublicRankingEntry[] = [];
  const first = await loadPoolPage(spec.metric, 1);
  const pages = pagesFor(first.total);

  for (let page = 1; page <= pages; page++) {
    const loaded = page === 1 ? first : await loadPoolPage(spec.metric, page);
    for (const entry of sanitizePage(spec, loaded, page)) {
      if (matches(entry)) {
        found.push(entry);
        if (found.length >= need) return found;
      }
    }
    // A short/empty page means the pool ended earlier than `total` claimed
    // (rows dropped by sanitization, or a failed fetch) — stop rather than
    // walking to MAX_PAGES over empty responses.
    if (loaded.entries.length < PAGE_SIZE) break;
  }
  return found;
}
