import type { MetadataRoute } from 'next';
import { getPartnerApi, PartnerApiError } from '@/lib/server/partner-api';
import { dedupeGamesBySlug, gameSlug } from '@/lib/game-slug';
import {
  absoluteLocaleUrl,
  buildAlternates,
  INDEXABLE_GAME_LOCALES,
  INDEXABLE_HUB_LOCALES,
  isIndexableStreamerSlug,
  isStreamerSitemapIndexable,
  latestChange,
  streamerIndexableLocales,
} from '@/lib/seo';
import {
  MIN_INDEXABLE_GAME_STREAMERS,
  PLATFORM_VARIANT_SLUGS,
  RANKING_PLATFORMS,
} from '@/lib/rankings';
import { gamesHubSegments } from '@/lib/games-hub';
import { CONTENT_LAST_UPDATED, LEGAL_LAST_UPDATED } from '@/lib/legal-dates';

export const revalidate = 3600;

const SITE_URL = 'https://streamertimes.tv';
const MAX_PAGES = 50; // safety cap = 25k streamers
const PAGE_LIMIT = 500;

// Frozen at `next build` (injected via next.config.ts env), so static pages
// without an editorial date report an honest, stable build timestamp instead
// of a per-render "now". Falls back to runtime only in dev where it's unset.
const BUILD_TIME = new Date(process.env.BUILD_TIME ?? Date.now());

/**
 * M22 P3 (S3.4): one sitemap entry per indexable locale variant of a hub,
 * each carrying the full hreflang cluster (Google reads alternates from any
 * member; listing every indexable URL keeps discovery symmetric). Non-hub
 * static URLs stay English-only entries without alternates.
 */
function hubEntries(
  path: string,
  base: Omit<MetadataRoute.Sitemap[number], 'url' | 'alternates'>,
): MetadataRoute.Sitemap {
  const languages = buildAlternates(path, INDEXABLE_HUB_LOCALES);
  return INDEXABLE_HUB_LOCALES.map((l) => ({
    url: absoluteLocaleUrl(l, path),
    ...base,
    ...(languages ? { alternates: { languages } } : {}),
  }));
}

/**
 * M22 P4: per-locale DISCOVERY entries for the game pages — deliberately
 * WITHOUT alternates clusters. The sitemap's game gates are PROXIES
 * (streamer_count / live count) while the pages evaluate the real thin gate
 * (isGameHubIndexable incl. upcoming, isRankingIndexable on ranked rows); a
 * proxy-passing page that fails its real gate renders noindex without
 * hreflang, and a sitemap cluster it never confirms is exactly the "no
 * return tags" GSC error class the P3 post-deploy review eliminated for
 * streamer entries. The pages own the clusters; the sitemap only lists both
 * locale URLs for discovery (same rule as streamer entries).
 */
function gamePageEntries(
  path: string,
  base: Omit<MetadataRoute.Sitemap[number], 'url' | 'alternates'>,
): MetadataRoute.Sitemap {
  return INDEXABLE_GAME_LOCALES.map((l) => ({
    url: absoluteLocaleUrl(l, path),
    ...base,
  }));
}

const STATIC_URLS: MetadataRoute.Sitemap = [
  ...hubEntries('/', {
    lastModified: BUILD_TIME,
    changeFrequency: 'hourly',
    priority: 1.0,
  }),
  {
    url: `${SITE_URL}/app`,
    lastModified: BUILD_TIME,
    changeFrequency: 'monthly',
    priority: 0.5,
  },
  ...hubEntries('/live', {
    // Honest per-render "now": the live hub's content genuinely changes every
    // regeneration (same treatment as /games below).
    lastModified: new Date(),
    changeFrequency: 'hourly',
    priority: 0.8,
  }),
  ...hubEntries('/tonight', {
    // Honest per-render "now": the evening line-up genuinely changes with every
    // prediction run (same treatment as /live above).
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.8,
  }),
  ...hubEntries('/streamers', {
    lastModified: BUILD_TIME,
    changeFrequency: 'daily',
    priority: 0.6,
  }),
  ...hubEntries('/games', {
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.6,
  }),
  // Sorted hub views. Separate URLs with their own titles, copy and orderings
  // (not duplicates of /games — each is self-canonical), so they belong in the
  // sitemap. Generated from the same registry that defines the routes, so a
  // new view can never be added without its sitemap entry.
  ...gamesHubSegments().map((segment) => ({
    url: `${SITE_URL}/games/${segment}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.5,
  })),
  ...hubEntries('/rankings', {
    // Honest per-render "now": the leaderboards move with each nightly refresh
    // (same treatment as /games).
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.7,
  }),
  {
    url: `${SITE_URL}/rankings/most-followed`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.6,
  },
  {
    url: `${SITE_URL}/rankings/fastest-growing`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.6,
  },
  {
    url: `${SITE_URL}/rankings/most-watched`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.6,
  },
  {
    url: `${SITE_URL}/rankings/most-active`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.6,
  },
  {
    url: `${SITE_URL}/rankings/most-reliable`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.6,
  },
  // Per-platform leaderboard variants (2026-08-11). Listed statically like the
  // metric pages above: a thin platform slice emits noindex itself, so the
  // residual mismatch self-corrects (same convention as /rankings/game/*).
  ...PLATFORM_VARIANT_SLUGS.flatMap((slug) =>
    RANKING_PLATFORMS.map((platform) => ({
      url: `${SITE_URL}/rankings/${slug}/${platform}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.5,
    })),
  ),
  {
    // Weekly movers recap. Listed while it warms up (same treatment as
    // fastest-growing above — the page emits noindex until it has movers).
    url: `${SITE_URL}/rankings/climbers`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.5,
  },
  {
    // M24 opportunity ranking. Listed while it warms up (page emits noindex
    // below MIN_INDEXABLE_BEST_GAMES rows, same treatment as climbers).
    url: `${SITE_URL}/best-games-to-stream`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.6,
  },
  {
    url: `${SITE_URL}/developers`,
    lastModified: BUILD_TIME,
    changeFrequency: 'monthly',
    priority: 0.4,
  },
  {
    // Source page cited by the model-computed income facts on wiki profiles.
    url: `${SITE_URL}/methodology/income-estimates`,
    lastModified: BUILD_TIME,
    changeFrequency: 'yearly',
    priority: 0.3,
  },
  {
    // "How predictions work" (2026-08-27): en-only content page, linked from
    // the footer, the homepage prediction fact, streamer/tonight FAQs and the
    // slot reasoning box. <lastmod> = the page's own "Last updated" date.
    url: `${SITE_URL}/predictions`,
    lastModified: new Date(CONTENT_LAST_UPDATED['methodology-predictions']),
    changeFrequency: 'monthly',
    priority: 0.4,
  },
  {
    url: `${SITE_URL}/privacy-policy`,
    lastModified: new Date(LEGAL_LAST_UPDATED['privacy-policy']),
    changeFrequency: 'yearly',
    priority: 0.2,
  },
  {
    url: `${SITE_URL}/terms-of-service`,
    lastModified: new Date(LEGAL_LAST_UPDATED['terms-of-service']),
    changeFrequency: 'yearly',
    priority: 0.2,
  },
  {
    url: `${SITE_URL}/support`,
    lastModified: BUILD_TIME,
    changeFrequency: 'monthly',
    priority: 0.3,
  },
  {
    url: `${SITE_URL}/impressum`,
    lastModified: new Date(LEGAL_LAST_UPDATED.impressum),
    changeFrequency: 'yearly',
    priority: 0.2,
  },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const streamerUrls: MetadataRoute.Sitemap = [];
  const gameUrls: MetadataRoute.Sitemap = [];
  const recapUrls: MetadataRoute.Sitemap = [];
  // One reference time for every streamer's activity window in this build.
  const generatedAt = new Date();

  try {
    const api = getPartnerApi();
    let cursor: string | undefined = undefined;
    let pages = 0;

    do {
      const resp = await api.listStreamers({
        order: 'name',
        limit: PAGE_LIMIT,
        cursor,
        revalidate: 3600,
      });

      for (const s of resp.data) {
        // Index-gate: list exactly the streamers whose page is indexable —
        // live, an upcoming stream within 7 days, or featured AND streamed in
        // the last 56 days (SEO F2, 2026-09). The DTO's activity facts are the
        // same ones buildStreamerMetadata gates on, so a listed URL no longer
        // turns out to be noindex (22 such contradictions before F2), and a
        // dormant featured streamer no longer earns an entry for an empty
        // schedule. Against an API without those fields the helper falls back
        // to the pre-F2 proxy (last_status_change_at !== null || featured).
        // Degenerate legacy slugs ('' or leading '-') never enter the sitemap:
        // their pages are permanently noindex'd, and the empty id would emit a
        // bare /streamer/ URL that 404s.
        if (!isIndexableStreamerSlug(s.id)) continue;
        if (!isStreamerSitemapIndexable(s, generatedAt)) continue;

        // M22 P3 (S3.4): non-English streamers index as an en + own-language
        // pair — emit BOTH URLs for discovery. English/unknown-language
        // streamers stay single unprefixed entries.
        //
        // NO hreflang alternates here, deliberately (fixed 2026-07-27 after a
        // post-deploy review). The gate above now reads the page gate's facts,
        // but the two are still evaluated at different times: this sitemap is
        // cached for an hour, the page for 30 minutes and purged on every live
        // flip, so a streamer can cross the gate in between. A page that has
        // turned noindex emits no hreflang tags, a cluster declared here would
        // have no return tags, and GSC would report an hreflang error. The
        // page-level cluster is exact and reciprocal, and Google accepts
        // hreflang from either source — so the pages own it alone.
        const path = `/streamer/${encodeURIComponent(s.id)}`;
        for (const l of streamerIndexableLocales(s.language)) {
          streamerUrls.push({
            url: absoluteLocaleUrl(l, path),
            // Honest <lastmod>: updated_at only moves on metadata writes (avatar,
            // discovery), so it misses live↔offline flips that change the page's
            // title/description (last_status_change_at) and prediction runs that
            // rewrite its schedule (predictions_updated_at). Take the latest so
            // Google sees a real "changed" signal.
            lastModified: latestChange(
              s.updated_at,
              s.last_status_change_at,
              s.predictions_updated_at,
            ),
            changeFrequency: 'daily',
            priority: l === 'en' ? 0.7 : 0.6,
          });
        }
      }

      cursor = resp.pagination.next_cursor ?? undefined;
      pages++;
    } while (cursor && pages < MAX_PAGES);

    // Game/category hub pages: only categories that clear the page's STABLE
    // thin-content term, streamer_count >= MIN_INDEXABLE_GAME_STREAMERS.
    // The page gate (isGameHubIndexable) additionally admits a small category
    // while it has live or upcoming activity; the sitemap deliberately stops
    // listing those (SEO F5, 2026-09): 25 of the 67 live categories on
    // 2026-09-13 were such transients, whose URL appeared for an hour and then
    // pointed at a noindex page (or, before F5, a 404 once the category left
    // the catalog). Such a page is still reachable and indexable through
    // internal links while it is active.
    // One entry per slug: case-variant duplicates ("BOMBANANA!"/"Bombanana!")
    // slug to the same URL, and the page resolves the same winner.
    // No lastModified on game URLs: a per-render "now" on every regeneration
    // teaches Google the value is meaningless — omit rather than fake.
    const gamesResp = await api.listGames({ limit: PAGE_LIMIT, revalidate: 3600 });
    const games = dedupeGamesBySlug(gamesResp.data);
    for (const g of games) {
      const slug = gameSlug(g.category);
      if (g.streamer_count >= MIN_INDEXABLE_GAME_STREAMERS) {
        gameUrls.push(
          ...gamePageEntries(`/game/${slug}`, {
            changeFrequency: 'daily',
            priority: 0.6,
          }),
        );
      }
      // Per-game ranking pages (/rankings/game/[slug]). streamer_count >= 10 is
      // a cheap proxy for the page's own ≥10-ranked-entries index gate (exact
      // parity would cost one API call per game); the residual mismatch
      // self-corrects because sub-threshold pages emit noindex.
      if (g.streamer_count >= 10) {
        gameUrls.push(
          ...gamePageEntries(`/rankings/game/${slug}`, {
            changeFrequency: 'daily',
            priority: 0.5,
          }),
        );
      }
    }

    // M24 /game/{slug}/best-time pages. ONE call — the best-to-stream list
    // returns exactly the categories passing the page's own tracked>=5 gate,
    // so this is an exact (not proxy) index gate. Best-effort: if the endpoint
    // is unavailable (older API), just omit the subpages — deliberately NOT
    // rethrowing like the blocks above, because these URLs are additive.
    try {
      const best = await api.listBestGamesToStream();
      const hubSlugs = new Set(games.map((g) => gameSlug(g.category)));
      for (const entry of best.data) {
        const slug = gameSlug(entry.category);
        // Only categories that also have a hub page — /best-time resolves its
        // category through the same catalog and 404s otherwise.
        if (!slug || !hubSlugs.has(slug)) continue;
        gameUrls.push({
          url: `${SITE_URL}/game/${slug}/best-time`,
          changeFrequency: 'weekly',
          priority: 0.5,
        });
      }
    } catch (err) {
      console.warn(
        '[sitemap] best-to-stream unavailable, omitting /best-time URLs:',
        err instanceof Error ? err.message : err,
      );
    }

    // AI recap articles (/rankings/recap archive + editions, 2026-08-09).
    // available_languages is an EXACT index gate: an article's locale variant
    // is indexable iff its translation exists (the page noindexes EN
    // fallbacks), so only those URLs are listed. NO hreflang here — the
    // page-level cluster is exact and reciprocal even when a translation
    // lands between sitemap build and page render (streamer-URL convention).
    // Best-effort like /best-time: additive URLs, omit on failure.
    try {
      const recapsResp = await api.listRecaps({ limit: 50, revalidate: 3600 });
      if (recapsResp.data.length > 0) {
        // Archive hub only once it has content (it noindexes while empty).
        recapUrls.push(
          ...hubEntries('/rankings/recap', {
            changeFrequency: 'weekly',
            priority: 0.5,
          }),
        );
      }
      for (const r of recapsResp.data) {
        for (const l of INDEXABLE_HUB_LOCALES) {
          if (!r.available_languages.includes(l)) continue;
          recapUrls.push({
            url: absoluteLocaleUrl(l, `/rankings/recap/${r.slug}`),
            // Honest <lastmod>: editions are immutable after publication.
            ...(r.published_at ? { lastModified: new Date(r.published_at) } : {}),
            changeFrequency: 'weekly',
            priority: l === 'en' ? 0.6 : 0.5,
          });
        }
      }
    } catch (err) {
      console.warn(
        '[sitemap] recaps unavailable, omitting /rankings/recap URLs:',
        err instanceof Error ? err.message : err,
      );
    }
  } catch (err) {
    // The sitemap is all-or-nothing: NEVER serve a truncated list. A degraded
    // 200 (static-only) tells Google "these streamer URLs no longer exist" and
    // it drops them from the index. Instead we rethrow — under ISR
    // (revalidate=3600) Next keeps serving the last successfully generated
    // sitemap, and Google retains its previously-discovered URLs. Only a cold
    // cache during an outage 500s, which Google simply retries.
    if (err instanceof PartnerApiError) {
      console.error('[sitemap] Partner API failed:', err.code, err.message);
    } else {
      console.error('[sitemap] Unexpected error:', err);
    }
    throw err;
  }

  return [...STATIC_URLS, ...streamerUrls, ...gameUrls, ...recapUrls];
}
