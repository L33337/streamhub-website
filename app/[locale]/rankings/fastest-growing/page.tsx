import type { Metadata } from 'next';
import { buildLeaderboardMetadata, LeaderboardPage } from '../leaderboard';
import { isUiLang, type UiLang } from '@/lib/i18n-core';
import { applyLocaleSeo } from '@/lib/seo';

// 300 (not 3600): the LIVE badges need a fresh live set; the ranking fetch
// itself stays data-cached for an hour (see leaderboard.tsx loadRanking).
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  // M22 P3: en-only indexability matrix — pass-through for 'en', noindex,follow
  // + self-canonical for every other locale variant.
  return applyLocaleSeo(
    await buildLeaderboardMetadata('fastest-growing'),
    locale,
    '/rankings/fastest-growing',
  );
}

export default function FastestGrowingPage() {
  return <LeaderboardPage slug="fastest-growing" />;
}
