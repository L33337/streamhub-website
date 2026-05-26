import type { MetadataRoute } from 'next';

const SITE_URL = 'https://streamertimes.tv';

export const revalidate = 86400;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/auth/', '/settings', '/favorites'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
