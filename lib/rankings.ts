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

/**
 * "2026-07-18T04:15:00Z" → "Jul 18, 2026" for the visible freshness line.
 * Fixed en-US locale + UTC (site copy is English; avoids server-locale
 * drift across regenerations). null/invalid → null (line is omitted).
 */
export function formatRefreshedAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
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
  /**
   * Visible Q&A block rendered under the leaderboard — targets informational
   * long-tail queries ("how is X measured"). Plain content only, deliberately
   * no FAQPage JSON-LD (Google restricted FAQ rich results to gov/health
   * sites in 2023; the copy itself is the SEO value).
   */
  faq: Array<{ q: string; a: string }>;
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
    faq: [
      {
        q: 'How is "most followed" measured?',
        a: 'We rank by the follower count of a streamer’s primary channel — channel followers on Twitch or subscribers on YouTube. Counts are refreshed regularly from the platforms and can lag the number you see on Twitch or YouTube itself.',
      },
      {
        q: 'Why is a well-known streamer missing?',
        a: 'The ranking covers streamers tracked on Streamer Times. A streamer also drops out while we have no follower count for them — for example right after they were added, or when the platform hides the count.',
      },
      {
        q: 'What does the average viewers column show?',
        a: 'The median number of concurrent live viewers over the last 28 days, sampled hourly while the channel is live. A dash means we have not collected enough viewer samples for that channel yet.',
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
    faq: [
      {
        q: 'How are average viewers calculated?',
        a: 'We sample each channel’s concurrent live viewers once per hour while it is live, on both Twitch and YouTube, and take the median over the last 28 days.',
      },
      {
        q: 'Why the median instead of peak viewers?',
        a: 'The median reflects a channel’s typical live audience. Peaks are dominated by one-off events — a single tournament or collab would outrank channels that draw a large audience every day.',
      },
      {
        q: 'Why is a big streamer missing?',
        a: 'A channel needs enough live time in the last 28 days for the sampling to be meaningful. Streamers who were on a break or streamed very little recently drop out until they are live again.',
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
    faq: [
      {
        q: 'How are streamed hours counted?',
        a: 'Total hours live over the last 28 days across Twitch and YouTube. Simultaneous broadcasts of the same stream on both platforms are counted once.',
      },
      {
        q: 'Why are 24/7 channels excluded?',
        a: 'Always-on rebroadcast channels are live around the clock and would fill the entire leaderboard. This ranking is about streamers who actually go live and end their streams.',
      },
      {
        q: 'What does "Streams / week" mean?',
        a: 'The average number of separate streams per week over the same 28-day window, alongside the typical length of one stream in the last column.',
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
    faq: [
      {
        q: 'What counts as starting on time?',
        a: 'A stream that goes live within ±30 minutes of the time announced in the streamer’s Twitch schedule. Streams that were already live at the announced start also count as on time.',
      },
      {
        q: 'Which streams are evaluated?',
        a: 'The last 20 announced Twitch schedule slots within the past 90 days. A streamer needs at least 10 evaluated slots to appear, so one lucky week can’t top the board.',
      },
      {
        q: 'Why is this Twitch-only?',
        a: 'Punctuality is measured against a published schedule, and Twitch is the only platform we track with formally announced schedule slots. YouTube-only streamers have no equivalent announcement to compare against.',
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
 *
 * Each Person carries the same `{url}#person` @id the streamer pages emit
 * (lib/seo.ts personJsonLdId), so Google can resolve a ranking entry and the
 * streamer's ProfilePage Person as one entity, plus the follower count as an
 * InteractionCounter (same FollowAction shape as buildPersonJsonLd).
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
    itemListElement: entries.map((e) => {
      const url = `${SITE_URL}/streamer/${encodeURIComponent(e.streamer.id)}`;
      const item: Record<string, unknown> = {
        '@type': 'Person',
        '@id': `${url}#person`,
        name: e.streamer.name,
        url,
      };
      const followers = e.values.follower_count ?? e.streamer.follower_count;
      if (followers != null) {
        item.interactionStatistic = {
          '@type': 'InteractionCounter',
          interactionType: { '@type': 'FollowAction' },
          userInteractionCount: followers,
        };
      }
      return { '@type': 'ListItem', position: e.rank, item };
    }),
  };
}

/**
 * True when any rendered cell of the leaderboard would show the "—"
 * placeholder — drives the explanatory footnote under the table.
 */
export function hasMissingValues(spec: RankingPageSpec, entries: PublicRankingEntry[]): boolean {
  return entries.some((e) => spec.columns.some((c) => c.format(e) === '—'));
}
