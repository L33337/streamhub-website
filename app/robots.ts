import type { MetadataRoute } from 'next';

const SITE_URL = 'https://streamertimes.tv';

export const revalidate = 86400;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Googlebot gets its own group: /schedule/<id> URLs churn every
      // prediction cycle (ai_slot_pred_* ids embed a timestamp), so Google
      // kept burning ~500 crawls/day on expired slots that 308 to the
      // streamer page — GSC then lists them all under "Page with redirect".
      // A crawler reads ONLY its most specific matching group, so this group
      // must repeat every disallow from the * group.
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/api/', '/auth/', '/settings', '/favorites', '/feed', '/schedule/'],
      },
      // NO /schedule/ here: Discordbot/Twitterbot respect robots.txt — a
      // wildcard block would kill link embeds of user-shared slot URLs.
      // /feed IS here: like /settings and /favorites it is auth-gated and
      // always 307s anonymous crawlers (to /app while auth is dormant, to
      // the login page once enabled) — there is never content to fetch.
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/auth/', '/settings', '/favorites', '/feed'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
