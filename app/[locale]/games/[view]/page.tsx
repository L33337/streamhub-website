import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { gamesHubPath, gamesHubSegments, gamesHubUrl, gamesHubViewBySegment } from '@/lib/games-hub';
import { isUiLang, type UiLang } from '@/lib/i18n-core';
import { applyLocaleSeo } from '@/lib/seo';
import { loadGamesHub } from '@/lib/server/games-hub-data';
import { GamesHubView } from '@/components/web/games/GamesHubView';

export const revalidate = 600;

/**
 * Sorted sub-views of the games hub: /games/most-streamed, /games/trending.
 *
 * These exist as real routes (rather than client-side tab state or a ?sort=
 * param) so each ordering is separately indexable and can target its own head
 * term. The catalog of indexable game pages is intrinsically small — ~27 of
 * ~260 categories clear the thin-content gate — so the hub has to earn
 * rankings itself rather than only distributing link equity downward.
 */
export const dynamicParams = false; // any other segment 404s instead of rendering the default

export function generateStaticParams(): { view: string }[] {
  return gamesHubSegments().map((view) => ({ view }));
}

type Props = { params: Promise<{ locale: string; view: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, view } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  const spec = gamesHubViewBySegment(view);
  if (!spec) return { title: 'Not found — StreamerTimes' };

  const { meta } = await loadGamesHub();
  const title = spec.buildTitle(meta);
  const description = spec.buildDescription(meta);
  const url = gamesHubUrl(spec);
  const pageMeta: Metadata = {
    title,
    description,
    // Self-canonical: these are distinct pages with distinct orderings and
    // copy, NOT duplicates of /games. Pointing them at /games would waste the
    // whole point of splitting them out.
    alternates: { canonical: url },
    openGraph: { title: spec.h1, description, url, siteName: 'Streamer Times', type: 'website' },
    twitter: { card: 'summary_large_image', title: spec.h1, description },
  };
  // M22 P3: en-only indexability matrix — pass-through for 'en', noindex,follow
  // + self-canonical for every other locale variant.
  return applyLocaleSeo(pageMeta, locale, gamesHubPath(spec));
}

export default async function GamesHubSubView({ params }: Props) {
  const { view } = await params;
  const spec = gamesHubViewBySegment(view);
  // Unreachable with dynamicParams=false, but keeps the component honest if
  // that flag is ever relaxed.
  if (!spec) notFound();
  return <GamesHubView spec={spec} />;
}
