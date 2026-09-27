// Deep pages of the leaderboards: /rankings/<metric>/<n> for n >= 2 — and,
// since 2026-08-11, the per-platform variant /rankings/<metric>/youtube
// (indexable single-page leaderboard, resolved before the numeric parse).
// /rankings/<metric>/twitch 308s to /rankings/<metric> since 2026-09-27: the
// main leaderboard is the Twitch ranking now.
//
// Page 1 stays on the flat /rankings/<metric> route (the five fixed wrappers
// next to this folder) so the canonical URL of a ranking never gains a "/1"
// twin — this route rejects page 1 outright.
//
// A single dynamic [metric] segment rather than five more wrappers: unlike page
// 1 these pages are noindex and carry no per-metric copy of their own, so
// there is nothing for a wrapper to specialize. Next.js resolves the literal
// sibling directories (most-followed/, game/, …) before this dynamic segment,
// so /rankings/most-followed and /rankings/game/<slug> are unaffected.

import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import {
  buildLeaderboardMetadata,
  buildPlatformLeaderboardMetadata,
  LeaderboardPage,
  PlatformLeaderboardPage,
} from '../../leaderboard';
import {
  getPlatformVariant,
  getRankingPageSpec,
  isTwitchVariantPath,
  type RankingPlatform,
} from '@/lib/rankings';
import { isUiLang, localeHref, type UiLang } from '@/lib/i18n-core';
import { applyLocaleSeo } from '@/lib/seo';

// Matches the page-1 wrappers: LIVE badges need a fresh live set, while the
// ranking fetch itself stays data-cached for an hour.
export const revalidate = 300;

interface Props {
  params: Promise<{ locale: string; metric: string; page: string }>;
}

/**
 * Prerender nothing at build time (page counts depend on live pool sizes) but
 * keep the route generatable on demand. `dynamicParams` stays at its default
 * true; unknown metrics and out-of-range pages 404 in the component instead,
 * which also covers pools that shrink between builds.
 */
export function generateStaticParams(): Array<{ metric: string; page: string }> {
  return [];
}

/**
 * Strict positive-integer parse. Rejects "01", "2.0", "1e3", " 2" and anything
 * else that would render the same list under a second URL.
 */
function parsePage(raw: string): number | null {
  if (!/^[1-9][0-9]*$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) ? n : null;
}

/**
 * 'youtube' in the page slot selects the platform variant of the metric
 * (/rankings/most-followed/youtube) — a single-page leaderboard that shares
 * this dynamic segment with the numeric deep pages. null for every other
 * string, including variants that don't exist (most-reliable).
 */
function parsePlatform(metric: string, raw: string): RankingPlatform | null {
  if (raw !== 'youtube') return null;
  return getPlatformVariant(metric, raw) ? raw : null;
}

/**
 * /rankings/<metric>/twitch duplicated the main leaderboard once the main pool
 * became Twitch-only (2026-09-27). 308 to the canonical page, keeping the
 * locale, so the indexed variant URLs consolidate onto it.
 */
function redirectTwitchVariant(locale: UiLang, metric: string, page: string): void {
  if (isTwitchVariantPath(metric, page)) {
    permanentRedirect(localeHref(locale, `/rankings/${metric}`));
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, metric, page } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  redirectTwitchVariant(locale, metric, page);
  const platform = parsePlatform(metric, page);
  if (platform) {
    // en-only indexability, like the mixed leaderboards (M22 P3 default).
    const meta = await buildPlatformLeaderboardMetadata(metric, platform);
    if (meta) return applyLocaleSeo(meta, locale, `/rankings/${metric}/${platform}`);
  }
  const n = parsePage(page);
  if (!n || n < 2 || !getRankingPageSpec(metric)) {
    return { title: 'Not found — Streamer Times', robots: { index: false, follow: false } };
  }
  // M22 P3: en-only indexability matrix — pass-through for 'en' (pages >= 2
  // keep their own noindex,follow), noindex,follow + self-canonical elsewhere.
  return applyLocaleSeo(
    await buildLeaderboardMetadata(metric, n),
    locale,
    `/rankings/${metric}/${n}`,
  );
}

export default async function RankingDeepPage({ params }: Props) {
  const { locale: rawLocale, metric, page } = await params;
  redirectTwitchVariant(isUiLang(rawLocale) ? rawLocale : 'en', metric, page);
  const platform = parsePlatform(metric, page);
  if (platform) return <PlatformLeaderboardPage slug={metric} platform={platform} />;
  const n = parsePage(page);
  // page 1 lives at /rankings/<metric> — refuse the duplicate URL.
  if (!n || n < 2) notFound();
  if (!getRankingPageSpec(metric)) notFound();
  // Out-of-range pages (past the last one, or a pool that shrank) 404 from
  // inside LeaderboardPage, which is where the pool size is known.
  return <LeaderboardPage slug={metric} page={n} />;
}
