// Pure view-model layer for the /rankings leaderboard pages.
//
// One registry entry per metric drives the four Top-100 pages (route slug,
// copy builders, table columns) so the page components stay thin and all
// display logic is unit-testable (lib/__tests__/rankings.test.ts) — same
// convention as lib/game-ranking.ts.

import type { PublicRankingEntry, RankingMetric } from '@/lib/server/partner-api';
import { formatCompactNumber } from '@/lib/format/number';

const SITE_URL = 'https://streamertimes.tv';

// Thin-content gate: below this many entries a leaderboard page renders but
// emits robots noindex,follow and stays out of the sitemap (same philosophy
// as the streamer-page index gating in lib/seo.ts). Flips automatically as
// data accrues — most-reliable starts thin until M14 outcomes accumulate.
export const MIN_INDEXABLE_RANKING_ENTRIES = 10;

export function isRankingIndexable(entryCount: number): boolean {
  return entryCount >= MIN_INDEXABLE_RANKING_ENTRIES;
}

export function rankingCanonicalUrl(slug: string): string {
  return `${SITE_URL}/rankings/${slug}`;
}

// ============================================
// Value formatters (exported for tests)
// ============================================

/** 182.5 → "182.5 h", 100 → "100 h" (trailing .0 dropped). */
export function formatHours(hours: number | null | undefined): string {
  if (hours == null || !Number.isFinite(hours)) return '—';
  const rounded = Math.round(hours * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)} h`;
}

/** 0.9167 → "92%". */
export function formatHitRate(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return '—';
  return `${Math.round(rate * 100)}%`;
}

/** Signed minutes: -3 → "−3 min" (early), 16 → "+16 min" (late), 0 → "on time". */
export function formatDeviation(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes)) return '—';
  const rounded = Math.round(minutes);
  if (rounded === 0) return 'on time';
  return rounded > 0 ? `+${rounded} min` : `−${Math.abs(rounded)} min`;
}

/** 456 → "7 h 36 m", 60 → "1 h", 45 → "45 m". */
export function formatDurationMinutes(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) return '—';
  const whole = Math.round(minutes);
  const h = Math.floor(whole / 60);
  const m = whole % 60;
  if (h === 0) return `${m} m`;
  return m === 0 ? `${h} h` : `${h} h ${m} m`;
}

function compact(value: number | null | undefined): string {
  const s = formatCompactNumber(value ?? null, 'en');
  return s === '' ? '—' : s;
}

// ============================================
// Page registry
// ============================================

export interface RankingColumn {
  key: string;
  header: string;
  /** Primary metric column — rendered accent-cyan by RankingTable. */
  primary?: boolean;
  format: (entry: PublicRankingEntry) => string;
}

export interface RankingPageSpec {
  metric: RankingMetric;
  /** Route segment under /rankings/. Same string as the API metric today. */
  slug: string;
  navLabel: string;
  h1: string;
  /** SERP title, degraded honestly: 100+ → "Top 100 …", 10+ → "Top {n} …", else count-free. */
  buildTitle: (entryCount: number) => string;
  /** Meta description; embeds the #1 entry when available. */
  buildDescription: (top?: PublicRankingEntry) => string;
  /** On-page intro paragraph — honest count, never claims more than rendered. */
  buildIntro: (entryCount: number, top?: PublicRankingEntry) => string;
  /** One-line methodology/freshness note rendered under the intro. */
  methodologyNote: string;
  /** Value used for defensive sanitization — entries without a positive primary value are dropped. */
  primaryValue: (entry: PublicRankingEntry) => number | null | undefined;
  columns: RankingColumn[];
}

function degradedTitle(base: string, topTitle: string, entryCount: number): string {
  if (entryCount >= 100) return topTitle.replace('{n}', '100');
  if (entryCount >= MIN_INDEXABLE_RANKING_ENTRIES) return topTitle.replace('{n}', String(entryCount));
  return base;
}

const followerNoun = (top?: PublicRankingEntry): string =>
  top?.streamer.platforms.includes('twitch') ? 'followers' : 'subscribers';

export const RANKING_PAGES: RankingPageSpec[] = [
  {
    metric: 'most-followed',
    slug: 'most-followed',
    navLabel: 'Most followed',
    h1: 'Most followed streamers',
    buildTitle: (n) =>
      degradedTitle(
        'Most Followed Streamers on Twitch & YouTube',
        'Top {n} Most Followed Streamers on Twitch & YouTube',
        n,
      ),
    buildDescription: (top) =>
      (top?.values.follower_count
        ? `${top.streamer.name} leads with ${compact(top.values.follower_count)} ${followerNoun(top)}. `
        : '') +
      'The most followed livestreamers we track, ranked by channel followers and subscribers across Twitch and YouTube. Updated daily.',
    buildIntro: (n, top) =>
      `The ${n} most followed streamers on Streamer Times, ranked by channel followers on Twitch and subscribers on YouTube.` +
      (top?.values.follower_count
        ? ` ${top.streamer.name} tops the list with ${compact(top.values.follower_count)} ${followerNoun(top)}.`
        : ''),
    methodologyNote:
      'Updated daily. Follower and subscriber counts are refreshed regularly and can lag live platform numbers.',
    primaryValue: (e) => e.values.follower_count,
    columns: [
      {
        key: 'followers',
        header: 'Followers',
        primary: true,
        format: (e) => compact(e.values.follower_count),
      },
      {
        key: 'avg_viewers',
        header: 'Avg viewers',
        format: (e) => compact(e.streamer.avg_view_count),
      },
    ],
  },
  {
    metric: 'most-watched',
    slug: 'most-watched',
    navLabel: 'Most watched',
    h1: 'Most watched streamers',
    buildTitle: (n) =>
      degradedTitle(
        'Most Watched Streamers — Ranked by Average Viewers',
        'Top {n} Most Watched Streamers — Ranked by Average Viewers',
        n,
      ),
    buildDescription: (top) =>
      (top?.values.avg_view_count
        ? `${top.streamer.name} leads with ${compact(top.values.avg_view_count)} average live viewers. `
        : '') +
      'Livestreamers ranked by median concurrent viewers over the last 28 days, across Twitch and YouTube. Updated daily.',
    buildIntro: (n, top) =>
      `The ${n} most watched streamers we track, ranked by their typical concurrent live audience over the last 28 days.` +
      (top?.values.avg_view_count
        ? ` ${top.streamer.name} tops the list with ${compact(top.values.avg_view_count)} average live viewers.`
        : ''),
    methodologyNote:
      'Median concurrent live viewers over the last 28 days (hourly sampling). Updated daily.',
    primaryValue: (e) => e.values.avg_view_count,
    columns: [
      {
        key: 'avg_viewers',
        header: 'Avg viewers',
        primary: true,
        format: (e) => compact(e.values.avg_view_count),
      },
      {
        key: 'followers',
        header: 'Followers',
        format: (e) => compact(e.streamer.follower_count),
      },
    ],
  },
  {
    metric: 'most-active',
    slug: 'most-active',
    navLabel: 'Most active',
    h1: 'Most active streamers',
    buildTitle: () => 'Most Active Streamers — Hours Streamed & Streams per Week',
    buildDescription: (top) =>
      (top?.values.hours_streamed_28d
        ? `${top.streamer.name} leads with ${formatHours(top.values.hours_streamed_28d)} streamed in the last 28 days. `
        : '') +
      'Livestreamers ranked by total hours streamed in the last 28 days, with streams per week and typical stream length. Updated daily.',
    buildIntro: (n, top) =>
      `The ${n} most active streamers of the last 28 days, ranked by total hours live on Twitch and YouTube.` +
      (top?.values.hours_streamed_28d
        ? ` ${top.streamer.name} tops the list with ${formatHours(top.values.hours_streamed_28d)} streamed.`
        : ''),
    methodologyNote:
      'Total hours live in the last 28 days. Each stream is counted once; 24/7 always-on channels are excluded. Updated daily.',
    primaryValue: (e) => e.values.hours_streamed_28d,
    columns: [
      {
        key: 'hours',
        header: 'Hours (28d)',
        primary: true,
        format: (e) => formatHours(e.values.hours_streamed_28d),
      },
      {
        key: 'per_week',
        header: 'Streams / week',
        format: (e) =>
          e.values.streams_per_week != null ? String(e.values.streams_per_week) : '—',
      },
      {
        key: 'avg_duration',
        header: 'Avg duration',
        format: (e) => formatDurationMinutes(e.values.avg_stream_duration_minutes),
      },
    ],
  },
  {
    metric: 'most-reliable',
    slug: 'most-reliable',
    navLabel: 'Most punctual',
    h1: 'Most punctual streamers',
    buildTitle: () => 'Most Punctual Streamers — Schedule Reliability Ranking',
    buildDescription: (top) =>
      (top?.values.time_hit_rate
        ? `${top.streamer.name} starts on time for ${formatHitRate(top.values.time_hit_rate)} of announced streams. `
        : '') +
      'Streamers ranked by how reliably they go live when their announced Twitch schedule says they will. Updated daily.',
    buildIntro: (n, top) =>
      `The ${n} streamers who most reliably start their announced Twitch streams on time.` +
      (top?.values.time_hit_rate
        ? ` ${top.streamer.name} tops the list, starting on time for ${formatHitRate(top.values.time_hit_rate)} of announced streams.`
        : ''),
    methodologyNote:
      'Share of announced Twitch streams that actually started within ±30 minutes, over the last 20 announced streams within 90 days (minimum 10 evaluated). Updated daily.',
    primaryValue: (e) => e.values.time_hit_rate,
    columns: [
      {
        key: 'hit_rate',
        header: 'On-time rate',
        primary: true,
        format: (e) => formatHitRate(e.values.time_hit_rate),
      },
      {
        key: 'deviation',
        header: 'Typical deviation',
        format: (e) => formatDeviation(e.values.median_start_deviation_minutes),
      },
      {
        key: 'sample',
        header: 'Streams evaluated',
        format: (e) => (e.values.time_sample != null ? String(e.values.time_sample) : '—'),
      },
    ],
  },
];

export function getRankingPageSpec(slug: string): RankingPageSpec | null {
  return RANKING_PAGES.find((p) => p.slug === slug) ?? null;
}

// ============================================
// Sanitization + JSON-LD
// ============================================

/**
 * Defensive filter over API entries: drops rows without a streamer or without
 * a positive primary metric value (the server already excludes them, but the
 * pages must never render a "0"/empty leaderboard row), then re-ranks 1..n so
 * positions stay dense after any drop.
 */
export function sanitizeRankingEntries(
  spec: RankingPageSpec,
  entries: PublicRankingEntry[],
): PublicRankingEntry[] {
  return entries
    .filter((e) => {
      if (!e || !e.streamer || typeof e.streamer.id !== 'string' || e.streamer.id.length === 0) {
        return false;
      }
      const v = spec.primaryValue(e);
      return v != null && Number.isFinite(v) && v > 0;
    })
    .map((e, i) => (e.rank === i + 1 ? e : { ...e, rank: i + 1 }));
}

/**
 * Person-typed ItemList for a leaderboard page — richer than the game hub's
 * name/url-only ItemList, which also keeps the two page types' structured
 * data distinct.
 */
export function buildRankingItemListJsonLd(
  name: string,
  entries: PublicRankingEntry[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: entries.length,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    itemListElement: entries.map((e) => ({
      '@type': 'ListItem',
      position: e.rank,
      item: {
        '@type': 'Person',
        name: e.streamer.name,
        url: `${SITE_URL}/streamer/${encodeURIComponent(e.streamer.id)}`,
      },
    })),
  };
}
