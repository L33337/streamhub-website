import type { MetadataRoute } from 'next';
import { UI_LANGS } from '@/lib/i18n-core';

const SITE_URL = 'https://streamertimes.tv';

export const revalidate = 86400;

// M22: every private path class exists once unprefixed (English) and once per
// non-English locale prefix (/de/settings, …). robots matching is
// prefix-based, so each variant needs its own entry. /en/* 308s to unprefixed
// and /api/ lives outside the locale tree — neither needs locale variants.
function withLocaleVariants(paths: string[]): string[] {
  return paths.flatMap((path) => [
    path,
    ...UI_LANGS.filter((lang) => lang !== 'en').map((lang) => `/${lang}${path}`),
  ]);
}

// Disallows every group repeats: a crawler reads ONLY its most specific
// matching group, so nothing is inherited from the * group.
const SHARED_DISALLOWS = [
  '/api/',
  ...withLocaleVariants(['/auth/', '/settings', '/favorites', '/feed', '/program', '/onboarding']),
];

// Search crawlers additionally skip /schedule/<id>: those URLs churn every
// prediction cycle (ai_slot_pred_* ids embed a timestamp) and expired slots
// 308 to the streamer page — Google burned ~500 crawls/day on them (GSC
// "Page with redirect" noise) before the Googlebot group existed; Bing was
// still crawling them until it got its own group (2026-07-20).
const SEARCH_CRAWLER_DISALLOWS = [...SHARED_DISALLOWS, ...withLocaleVariants(['/schedule/'])];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: SEARCH_CRAWLER_DISALLOWS,
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: SEARCH_CRAWLER_DISALLOWS,
      },
      // DuckDuckBot is a pure search crawler — it never renders link embeds, so
      // the unfurl exemption below does not apply to it and its crawl budget
      // belongs on indexable pages (added 2026-07-29). DuckDuckGo's web results
      // come from Bing, so this only steers its own supplementary crawling.
      {
        userAgent: 'DuckDuckBot',
        allow: '/',
        disallow: SEARCH_CRAWLER_DISALLOWS,
      },
      // Known search/AI/SEO crawlers that never render link embeds: same
      // /schedule/ treatment as Googlebot. Added 2026-08-03 when the churned
      // slot ids surfaced as the site's top ISR-write cost (every cold crawl
      // of a fresh id × 12 locales is a billed render) — the "measurable crawl
      // waste" threshold the note below always reserved. Embed crawlers
      // (Discordbot, Twitterbot, facebookexternalhit, Slackbot, WhatsApp, …)
      // deliberately stay on the * group so shared slot URLs keep unfurling.
      {
        userAgent: [
          'YandexBot',
          'Applebot',
          'PetalBot',
          'Bytespider',
          'Amazonbot',
          'CCBot',
          'GPTBot',
          'ClaudeBot',
          'PerplexityBot',
          'meta-externalagent',
          'AhrefsBot',
          'SemrushBot',
          'MJ12bot',
          'DotBot',
        ],
        allow: '/',
        disallow: SEARCH_CRAWLER_DISALLOWS,
      },
      // NO /schedule/ in the * group: Discordbot/Twitterbot respect robots.txt
      // — a wildcard block would kill link embeds of user-shared slot URLs.
      // Residual: unlisted search bots may still crawl /schedule/ — accepted
      // to keep unfurls working; extend the group above if one shows up.
      // /feed IS here: like /settings and /favorites it is auth-gated and
      // always 307s anonymous crawlers (to /app while auth is dormant, to
      // the login page once enabled) — there is never content to fetch.
      {
        userAgent: '*',
        allow: '/',
        disallow: SHARED_DISALLOWS,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
