import type { Metadata } from 'next';
import { DEFAULT_GAMES_HUB_VIEW, gamesHubUrl } from '@/lib/games-hub';
import { loadGamesHub } from '@/lib/server/games-hub-data';
import { GamesHubView } from '@/components/web/games/GamesHubView';
import { isUiLang, type UiLang } from '@/lib/i18n-core';
import { siteMetaFor } from '@/lib/i18n-sitemeta';
import { applyLocaleSeo, INDEXABLE_HUB_LOCALES } from '@/lib/seo';

// 10 min: the page carries live numbers (live streamers/viewers per game), so
// an hourly window would show stale "live" counts.
export const revalidate = 600;

const SPEC = DEFAULT_GAMES_HUB_VIEW;

interface Props {
  params: Promise<{ locale: string }>;
}

/**
 * Dynamic metadata (was a static export until 2026-07-20): the catalog size is
 * a real differentiator and the page regenerates every 10 minutes anyway.
 * Only slow-moving figures reach the title/description — see the churn rule in
 * lib/games-hub.ts. loadGamesHub() is request-cached, so this costs no extra
 * fetch on top of the page render.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  const { meta } = await loadGamesHub();
  const localized = siteMetaFor(locale).games;
  const title = locale === 'en' ? SPEC.buildTitle(meta) : localized.title;
  const description = locale === 'en' ? SPEC.buildDescription(meta) : localized.description;
  const url = gamesHubUrl(SPEC);
  const result: Metadata = {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: locale === 'en' ? SPEC.h1 : localized.title,
      description,
      url,
      siteName: 'Streamer Times',
      type: 'website',
    },
    // Without a page-level twitter block, X cards fall back to the root
    // layout's generic site title/image. Next auto-wires the colocated
    // opengraph-image as twitter:image once this block exists.
    twitter: {
      card: 'summary_large_image',
      title: locale === 'en' ? SPEC.h1 : localized.title,
      description,
    },
  };
  return applyLocaleSeo(result, locale, '/games', INDEXABLE_HUB_LOCALES);
}

export default async function GamesIndexPage({ params }: Props) {
  const { locale: rawLocale } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  return <GamesHubView spec={SPEC} locale={locale} />;
}
