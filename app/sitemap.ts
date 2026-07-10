import type { MetadataRoute } from 'next';
import { getPartnerApi, PartnerApiError } from '@/lib/server/partner-api';
import { gameSlug } from '@/lib/game-slug';
import { isIndexableStreamerSlug, latestChange } from '@/lib/seo';
import { LEGAL_LAST_UPDATED } from '@/lib/legal-dates';

export const revalidate = 3600;

const SITE_URL = 'https://streamertimes.tv';
const MAX_PAGES = 50; // safety cap = 25k streamers
const PAGE_LIMIT = 500;

// Frozen at `next build` (injected via next.config.ts env), so static pages
// without an editorial date report an honest, stable build timestamp instead
// of a per-render "now". Falls back to runtime only in dev where it's unset.
const BUILD_TIME = new Date(process.env.BUILD_TIME ?? Date.now());

const STATIC_URLS: MetadataRoute.Sitemap = [
  {
    url: SITE_URL,
    lastModified: BUILD_TIME,
    changeFrequency: 'hourly',
    priority: 1.0,
  },
  {
    url: `${SITE_URL}/app`,
    lastModified: BUILD_TIME,
    changeFrequency: 'monthly',
    priority: 0.5,
  },
  {
    url: `${SITE_URL}/streamers`,
    lastModified: BUILD_TIME,
    changeFrequency: 'daily',
    priority: 0.6,
  },
  {
    url: `${SITE_URL}/games`,
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
        // Index-gate: skip streamers that have never gone live and aren't
        // editorially featured. Their pages render only an empty-schedule state
        // and are noindex'd at the page level (see buildStreamerMetadata), so
        // listing them here only wastes crawl budget on URLs Google will drop.
        // The public DTO carries no history flag; last_status_change_at !== null
        // is the proxy for "was live at least once". A streamer re-enters the
        // sitemap automatically once it goes live or is featured again.
        // Degenerate legacy slugs ('' or leading '-') never enter the sitemap:
        // their pages are permanently noindex'd, and the empty id would emit a
        // bare /streamer/ URL that 404s.
        if (!isIndexableStreamerSlug(s.id)) continue;
        if (s.last_status_change_at === null && !s.is_featured) continue;

        streamerUrls.push({
          url: `${SITE_URL}/streamer/${encodeURIComponent(s.id)}`,
          // Honest <lastmod>: updated_at only moves on metadata writes (avatar,
          // discovery), so it misses live↔offline flips that change the page's
          // title/description. last_status_change_at captures those. Take the
          // later of the two so Google sees a real "changed" signal.
          lastModified: latestChange(s.updated_at, s.last_status_change_at),
          changeFrequency: 'daily',
          priority: 0.7,
        });
      }

      cursor = resp.pagination.next_cursor ?? undefined;
      pages++;
    } while (cursor && pages < MAX_PAGES);

    // Game/category hub pages (≥3 streamers). Small set — one page.
    const gamesResp = await api.listGames({ limit: PAGE_LIMIT, revalidate: 3600 });
    for (const g of gamesResp.data) {
      const slug = gameSlug(g.category);
      if (!slug) continue;
      gameUrls.push({
        url: `${SITE_URL}/game/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.6,
      });
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

  return [...STATIC_URLS, ...streamerUrls, ...gameUrls];
}
