import type { MetadataRoute } from 'next';
import { getPartnerApi, PartnerApiError } from '@/lib/server/partner-api';

export const revalidate = 3600;

const SITE_URL = 'https://streamertimes.tv';
const MAX_PAGES = 50; // safety cap = 25k streamers
const PAGE_LIMIT = 500;

const STATIC_URLS: MetadataRoute.Sitemap = [
  {
    url: SITE_URL,
    lastModified: new Date(),
    changeFrequency: 'hourly',
    priority: 1.0,
  },
  {
    url: `${SITE_URL}/app`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.5,
  },
  {
    url: `${SITE_URL}/privacy-policy`,
    lastModified: new Date(),
    changeFrequency: 'yearly',
    priority: 0.2,
  },
  {
    url: `${SITE_URL}/terms-of-service`,
    lastModified: new Date(),
    changeFrequency: 'yearly',
    priority: 0.2,
  },
  {
    url: `${SITE_URL}/support`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.3,
  },
  {
    url: `${SITE_URL}/impressum`,
    lastModified: new Date(),
    changeFrequency: 'yearly',
    priority: 0.2,
  },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const streamerUrls: MetadataRoute.Sitemap = [];

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
        streamerUrls.push({
          url: `${SITE_URL}/streamer/${encodeURIComponent(s.id)}`,
          lastModified: new Date(s.updated_at),
          changeFrequency: 'daily',
          priority: 0.7,
        });
      }

      cursor = resp.pagination.next_cursor ?? undefined;
      pages++;
    } while (cursor && pages < MAX_PAGES);
  } catch (err) {
    // Don't crash the route if the Partner API is down — return the static
    // section so robots can at least crawl the canonical pages.
    if (err instanceof PartnerApiError) {
      console.error('[sitemap] Partner API failed:', err.code, err.message);
    } else {
      console.error('[sitemap] Unexpected error:', err);
    }
  }

  return [...STATIC_URLS, ...streamerUrls];
}
