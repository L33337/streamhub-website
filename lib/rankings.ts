// Pure view-model layer for the /rankings leaderboard pages.
//
// One registry entry per metric drives the four Top-100 pages (route slug,
// copy builders, table columns) so the page components stay thin and all
// display logic is unit-testable (lib/__tests__/rankings.test.ts) — same
// convention as lib/game-ranking.ts.

import type { PublicRankingEntry, RankingMetric } from '@/lib/server/partner-api';
import { formatCompactNumber } from '@/lib/format/number';
import { pickMetaDescription } from '@/lib/seo';

const SITE_URL = 'https://streamertimes.tv';

// Thin-content gate: below this many entries a leaderboard page renders but
// emits robots noindex,follow and stays out of the sitemap (same philosophy
// as the streamer-page index gating in lib/seo.ts). Flips automatically as
// data accrues — most-reliable starts thin until M14 outcomes accumulate.
export const MIN_INDEXABLE_RANKING_ENTRIES = 10;

export function isRankingIndexable(entryCount: number): boolean {
  return entryCount >= MIN_INDEXABLE_RANKING_ENTRIES;
}

// Thin-content gate for /game/[slug] hub pages. The catalog itself already
// requires >= 3 streamers, so this only gates the 3-4-streamer tail — unless
// the category has actual live/upcoming activity, which makes even a small
// hub a useful result. Caveat: when the slots fetches degrade (API blip),
// live/upcoming read as 0 and an active sub-threshold page can flip to
// noindex for one ISR cycle (300s) — accepted, same failure mode as the
// ranking pages; do not "fix" by removing the activity terms.
export const MIN_INDEXABLE_GAME_STREAMERS = 5;

export function isGameHubIndexable(params: {
  streamerCount: number;
  liveCount: number;
  upcomingCount: number;
}): boolean {
  return (
    params.streamerCount >= MIN_INDEXABLE_GAME_STREAMERS ||
    params.liveCount > 0 ||
    params.upcomingCount > 0
  );
}

export function rankingCanonicalUrl(slug: string): string {
  return `${SITE_URL}/rankings/${slug}`;
}

// ============================================
// Value formatters (exported for tests)
// ============================================

/**
 * 182.5 → "182.5 h", 100 → "100 h" (trailing .0 dropped). `lang` localizes
 * the decimal separator (M22 P4: de → "182,5 h"); the default 'en' path is
 * byte-identical to the pre-P4 output.
 */
export function formatHours(hours: number | null | undefined, lang = 'en'): string {
  if (hours == null || !Number.isFinite(hours)) return '—';
  const rounded = Math.round(hours * 10) / 10;
  const digits = Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1);
  if (lang === 'en') return `${digits} h`;
  try {
    return `${rounded.toLocaleString(lang, { maximumFractionDigits: 1 })} h`;
  } catch {
    return `${digits} h`;
  }
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
 * Leaderboard meta description: the current leader's headline number in front
 * of the metric's evergreen explanation, clamped to the 155-char budget.
 *
 * The leader clause is what makes each ranking's snippet unique, but the name
 * is unbounded user data — so when the pair overflows (Bing flagged these at
 * 168+ chars on 2026-08-01) the LEAD is dropped and the evergreen sentence
 * shown whole, rather than either being cut mid-word.
 */
function buildRankingDescription(lead: string, evergreen: string): string {
  return pickMetaDescription(`${lead}${evergreen}`, evergreen);
}

/** 12400 → "+12.4K" (gain column; negatives render "−" defensively). */
export function formatSignedCompact(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value === 0) return '—';
  const body = compact(Math.abs(value));
  if (body === '—') return '—';
  return value > 0 ? `+${body}` : `−${body}`;
}

/** 3.25 → "+3.3%", 2900 → "+2900%" (whole percent from 100 up), null → "—". */
export function formatGrowthPercent(percent: number | null | undefined): string {
  if (percent == null || !Number.isFinite(percent)) return '—';
  const abs = Math.abs(percent);
  const rounded = abs >= 100 ? Math.round(abs) : Math.round(abs * 10) / 10;
  const text = Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1);
  return `${percent < 0 ? '−' : '+'}${text}%`;
}

/**
 * Current month + year for SERP titles, e.g. "August 2026" / de "August 2026" /
 * ja "2026年8月". Localized via Intl (never a hand-kept month table), UTC so
 * every regeneration of every locale variant agrees on the month regardless of
 * server timezone. The label changes 12× a year, so it is ISR-write-cheap —
 * deliberately month-granular: a full day date in a <title> would re-write
 * every locale variant daily for no extra SERP signal.
 */
export function monthYearLabel(lang = 'en', date: Date = new Date()): string {
  const locale = lang === 'en' ? 'en-US' : lang;
  const opts: Intl.DateTimeFormatOptions = {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  };
  try {
    return new Intl.DateTimeFormat(locale, opts).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-US', opts).format(date);
  }
}

/**
 * "2026-07-18T04:15:00Z" → "Jul 18, 2026" for the visible freshness line.
 * Fixed en-US locale + UTC (site copy is English; avoids server-locale
 * drift across regenerations). null/invalid → null (line is omitted).
 */
export function formatRefreshedAt(
  iso: string | null | undefined,
  lang = 'en',
): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  // 'en' keeps the pre-M22-P4 en-US byte shape; other locales use their own
  // medium date form.
  const locale = lang === 'en' ? 'en-US' : lang;
  try {
    return new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(d);
  } catch {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(d);
  }
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
      buildRankingDescription(
        top?.values.follower_count
          ? `${top.streamer.name} leads with ${compact(top.values.follower_count)} ${followerNoun(top)}. `
          : '',
        'The most followed livestreamers on Twitch and YouTube, ranked by followers and subscribers. Updated daily.',
      ),
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
    metric: 'fastest-growing',
    slug: 'fastest-growing',
    navLabel: 'Fastest growing',
    h1: 'Fastest growing streamers',
    buildTitle: (n) =>
      degradedTitle(
        'Fastest Growing Streamers — Follower Gains This Week',
        'Top {n} Fastest Growing Streamers — Follower Gains This Week',
        n,
      ),
    buildDescription: (top) =>
      buildRankingDescription(
        top?.values.follower_gain_7d
          ? `${top.streamer.name} gained ${compact(top.values.follower_gain_7d)} ${followerNoun(top)} in the last 7 days. `
          : '',
        'The fastest growing livestreamers, ranked by follower gain over the last 7 days. Updated daily.',
      ),
    buildIntro: (n, top) =>
      `The ${n} fastest growing streamers on Streamer Times, ranked by follower and subscriber gain over the last 7 days.` +
      (top?.values.follower_gain_7d
        ? ` ${top.streamer.name} tops the list, up ${compact(top.values.follower_gain_7d)} ${followerNoun(top)} this week.`
        : ''),
    methodologyNote:
      'Gain in channel followers (Twitch) or subscribers (YouTube) over the last 7 days, from daily snapshots of every tracked channel. Only channels with positive growth rank. Updated daily.',
    primaryValue: (e) => e.values.follower_gain_7d,
    columns: [
      {
        key: 'gained',
        header: 'Gained (7d)',
        primary: true,
        format: (e) => formatSignedCompact(e.values.follower_gain_7d),
      },
      {
        key: 'growth',
        header: 'Growth',
        format: (e) => formatGrowthPercent(e.values.follower_growth_percent_7d),
      },
      {
        key: 'followers',
        header: 'Followers now',
        format: (e) => compact(e.values.follower_count),
      },
    ],
    faq: [
      {
        q: 'How is follower growth measured?',
        a: 'We snapshot the follower and subscriber counts of every tracked channel once a day and compare the current count against the snapshot from at least 7 days ago. The leaderboard ranks the absolute gain over that window.',
      },
      {
        q: 'Why rank by absolute gain instead of percent?',
        a: 'Percent growth is dominated by tiny channels — going from 10 to 20 followers doubles a channel but means little. Absolute gain reflects real momentum; the Growth column still shows the relative change for context.',
      },
      {
        q: 'Why is this leaderboard empty or short?',
        a: 'A channel needs at least 7 days of snapshot history to qualify, so the board is empty right after the feature launched and recently added streamers take a week to appear. Channels with no growth or a declining count are not listed.',
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
      buildRankingDescription(
        top?.values.avg_view_count
          ? `${top.streamer.name} leads with ${compact(top.values.avg_view_count)} average live viewers. `
          : '',
        'Livestreamers ranked by median concurrent viewers over the last 28 days. Updated daily.',
      ),
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
      buildRankingDescription(
        top?.values.hours_streamed_28d
          ? `${top.streamer.name} leads with ${formatHours(top.values.hours_streamed_28d)} streamed in the last 28 days. `
          : '',
        'Livestreamers ranked by total hours streamed in the last 28 days. Updated daily.',
      ),
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
      buildRankingDescription(
        top?.values.time_hit_rate
          ? `${top.streamer.name} starts on time for ${formatHitRate(top.values.time_hit_rate)} of announced streams. `
          : '',
        'Streamers ranked by how reliably they start their announced Twitch streams on time.',
      ),
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
// Platform variants (/rankings/<metric>/<platform>, SEO round 2026-08-11)
// ============================================

export type RankingPlatform = 'twitch' | 'youtube';
export const RANKING_PLATFORMS: readonly RankingPlatform[] = ['twitch', 'youtube'];

/**
 * Metrics that ship /twitch + /youtube variants. most-reliable is excluded on
 * purpose: it is already Twitch-only (punctuality is measured against Twitch
 * schedules), so a /twitch twin would duplicate the canonical page and a
 * /youtube page would be permanently empty.
 */
export const PLATFORM_VARIANT_SLUGS: readonly string[] = [
  'most-followed',
  'fastest-growing',
  'most-watched',
  'most-active',
];

export interface PlatformRankingVariant {
  spec: RankingPageSpec;
  platform: RankingPlatform;
  /** "Twitch" / "YouTube" for breadcrumbs and chips. */
  platformLabel: string;
  h1: string;
  buildTitle(entryCount: number): string;
  buildDescription(top?: PublicRankingEntry): string;
  buildIntro(entryCount: number, top?: PublicRankingEntry): string;
  methodologyNote: string;
  columns: RankingColumn[];
  /** Pool filter — see the primary-platform note below. */
  matches(entry: PublicRankingEntry): boolean;
  faq: Array<{ q: string; a: string }>;
}

/**
 * Platform membership follows the PRIMARY-channel convention the follower data
 * already encodes: `follower_count` (and its 7d gain) is the Twitch channel's
 * count whenever the streamer has one (see `followerNoun`). So:
 *   - twitch  = has a Twitch channel (simulcasters included — every metric
 *               value is Twitch-anchored or platform-spanning for them)
 *   - youtube = streams primarily on YouTube (no Twitch channel), where the
 *               counts genuinely are YouTube subscribers
 * A dual-platform streamer on the YouTube list would show Twitch followers
 * under a "Subscribers" header — that mislabel is exactly what this split
 * avoids.
 */
function platformMatcher(platform: RankingPlatform): (e: PublicRankingEntry) => boolean {
  return platform === 'twitch'
    ? (e) => e.streamer.platforms.includes('twitch')
    : (e) => e.streamer.platforms.includes('youtube') && !e.streamer.platforms.includes('twitch');
}

/** Column list with headers renamed per the map; untouched columns pass through. */
function relabelColumns(columns: RankingColumn[], map: Record<string, string>): RankingColumn[] {
  return columns.map((c) => (map[c.header] ? { ...c, header: map[c.header] } : c));
}

interface VariantCopy {
  h1: string;
  /** [count-free base, "Top {n} …" template] — same degradation as the metric pages. */
  titles: [string, string];
  /** Evergreen meta-description sentence (the leader clause is prepended). */
  evergreen: string;
  intro(n: number, top?: PublicRankingEntry): string;
  methodologyNote: string;
  /** Platform-specific inclusion-rule Q&A, prepended to the metric's own FAQ head. */
  inclusionFaq: { q: string; a: string };
}

const TWITCH_INCLUSION_FAQ = {
  q: 'Which streamers count as Twitch streamers?',
  a: 'Everyone we track with a Twitch channel — including streamers who simulcast on YouTube. The follower stats are always the Twitch channel’s numbers.',
};
const YOUTUBE_INCLUSION_FAQ = {
  q: 'Why is a big YouTube channel missing?',
  a: 'This ranking covers live streamers whose primary channel is on YouTube. Video-only creators are not tracked, and streamers whose main channel is on Twitch are listed in the Twitch ranking instead.',
};

const topsClause = (
  top: PublicRankingEntry | undefined,
  value: (t: PublicRankingEntry) => string | null,
): string => {
  const v = top ? value(top) : null;
  return top && v ? ` ${top.streamer.name} tops the list with ${v}.` : '';
};

/** Copy per (metric, platform). Kept next to RANKING_PAGES so wording stays in one file. */
const VARIANT_COPY: Record<string, Record<RankingPlatform, VariantCopy>> = {
  'most-followed': {
    twitch: {
      h1: 'Most followed Twitch streamers',
      titles: [
        'Most Followed Twitch Streamers — Follower Stats',
        'Top {n} Most Followed Twitch Streamers',
      ],
      evergreen:
        'The most followed streamers on Twitch, ranked by channel followers. Follower stats updated daily.',
      intro: (n, top) =>
        `The ${n} most followed Twitch streamers on Streamer Times, ranked by Twitch channel followers.` +
        topsClause(top, (t) =>
          t.values.follower_count ? `${compact(t.values.follower_count)} followers` : null,
        ),
      methodologyNote:
        'Updated daily. Covers every tracked streamer with a Twitch channel; the count is their Twitch channel followers.',
      inclusionFaq: TWITCH_INCLUSION_FAQ,
    },
    youtube: {
      h1: 'Most subscribed YouTube streamers',
      titles: [
        'Most Subscribed YouTube Streamers — Subscriber Stats',
        'Top {n} Most Subscribed YouTube Streamers',
      ],
      evergreen:
        'The most subscribed live streamers on YouTube, ranked by channel subscribers. Subscriber stats updated daily.',
      intro: (n, top) =>
        `The ${n} most subscribed YouTube streamers on Streamer Times, ranked by channel subscribers. Only channels that live stream primarily on YouTube are listed.` +
        topsClause(top, (t) =>
          t.values.follower_count ? `${compact(t.values.follower_count)} subscribers` : null,
        ),
      methodologyNote:
        'Updated daily. YouTube-first live channels only; the count is their YouTube subscribers.',
      inclusionFaq: YOUTUBE_INCLUSION_FAQ,
    },
  },
  'fastest-growing': {
    twitch: {
      h1: 'Fastest growing Twitch streamers',
      titles: [
        'Fastest Growing Twitch Streamers — Follower Gains',
        'Top {n} Fastest Growing Twitch Streamers',
      ],
      evergreen:
        'The fastest growing Twitch streamers, ranked by follower gain over the last 7 days. Updated daily.',
      intro: (n, top) =>
        `The ${n} fastest growing Twitch streamers on Streamer Times, ranked by Twitch follower gain over the last 7 days.` +
        topsClause(top, (t) =>
          t.values.follower_gain_7d
            ? `${formatSignedCompact(t.values.follower_gain_7d)} followers this week`
            : null,
        ),
      methodologyNote:
        'Gain in Twitch channel followers over the last 7 days, from daily snapshots. Only channels with positive growth rank. Updated daily.',
      inclusionFaq: TWITCH_INCLUSION_FAQ,
    },
    youtube: {
      h1: 'Fastest growing YouTube streamers',
      titles: [
        'Fastest Growing YouTube Streamers — Subscriber Gains',
        'Top {n} Fastest Growing YouTube Streamers',
      ],
      evergreen:
        'The fastest growing live streamers on YouTube, ranked by subscriber gain over the last 7 days. Updated daily.',
      intro: (n, top) =>
        `The ${n} fastest growing YouTube streamers on Streamer Times, ranked by subscriber gain over the last 7 days. Only channels that live stream primarily on YouTube are listed.` +
        topsClause(top, (t) =>
          t.values.follower_gain_7d
            ? `${formatSignedCompact(t.values.follower_gain_7d)} subscribers this week`
            : null,
        ),
      methodologyNote:
        'Gain in YouTube subscribers over the last 7 days, from daily snapshots of YouTube-first live channels. Only channels with positive growth rank. Updated daily.',
      inclusionFaq: YOUTUBE_INCLUSION_FAQ,
    },
  },
  'most-watched': {
    twitch: {
      h1: 'Most watched Twitch streamers',
      titles: [
        'Most Watched Twitch Streamers — Viewer Stats',
        'Top {n} Most Watched Twitch Streamers',
      ],
      evergreen:
        'Twitch streamers ranked by average concurrent viewers over the last 28 days. Viewer stats updated daily.',
      intro: (n, top) =>
        `The ${n} most watched Twitch streamers we track, ranked by their typical concurrent live audience over the last 28 days.` +
        topsClause(top, (t) =>
          t.values.avg_view_count
            ? `${compact(t.values.avg_view_count)} average live viewers`
            : null,
        ),
      methodologyNote:
        'Median concurrent live viewers over the last 28 days (hourly sampling). Covers every tracked streamer with a Twitch channel. Updated daily.',
      inclusionFaq: TWITCH_INCLUSION_FAQ,
    },
    youtube: {
      h1: 'Most watched YouTube streamers',
      titles: [
        'Most Watched YouTube Streamers — Viewer Stats',
        'Top {n} Most Watched YouTube Streamers',
      ],
      evergreen:
        'Live streamers on YouTube ranked by average concurrent viewers over the last 28 days. Viewer stats updated daily.',
      intro: (n, top) =>
        `The ${n} most watched YouTube streamers we track, ranked by their typical concurrent live audience over the last 28 days. Only channels that live stream primarily on YouTube are listed.` +
        topsClause(top, (t) =>
          t.values.avg_view_count
            ? `${compact(t.values.avg_view_count)} average live viewers`
            : null,
        ),
      methodologyNote:
        'Median concurrent live viewers over the last 28 days (hourly sampling), for YouTube-first live channels. Updated daily.',
      inclusionFaq: YOUTUBE_INCLUSION_FAQ,
    },
  },
  'most-active': {
    twitch: {
      h1: 'Most active Twitch streamers',
      titles: [
        'Most Active Twitch Streamers — Hours Streamed',
        'Top {n} Most Active Twitch Streamers',
      ],
      evergreen:
        'Twitch streamers ranked by total hours streamed in the last 28 days. Activity stats updated daily.',
      intro: (n, top) =>
        `The ${n} most active Twitch streamers of the last 28 days, ranked by total hours live.` +
        topsClause(top, (t) =>
          t.values.hours_streamed_28d
            ? `${formatHours(t.values.hours_streamed_28d)} streamed`
            : null,
        ),
      methodologyNote:
        'Total hours live in the last 28 days. Each stream is counted once; 24/7 always-on channels are excluded. Covers every tracked streamer with a Twitch channel. Updated daily.',
      inclusionFaq: TWITCH_INCLUSION_FAQ,
    },
    youtube: {
      h1: 'Most active YouTube streamers',
      titles: [
        'Most Active YouTube Streamers — Hours Streamed',
        'Top {n} Most Active YouTube Streamers',
      ],
      evergreen:
        'Live streamers on YouTube ranked by total hours streamed in the last 28 days. Activity stats updated daily.',
      intro: (n, top) =>
        `The ${n} most active YouTube streamers of the last 28 days, ranked by total hours live. Only channels that live stream primarily on YouTube are listed.` +
        topsClause(top, (t) =>
          t.values.hours_streamed_28d
            ? `${formatHours(t.values.hours_streamed_28d)} streamed`
            : null,
        ),
      methodologyNote:
        'Total hours live in the last 28 days for YouTube-first live channels. Each stream is counted once; 24/7 always-on channels are excluded. Updated daily.',
      inclusionFaq: YOUTUBE_INCLUSION_FAQ,
    },
  },
};

/**
 * Resolved platform variant of a leaderboard, or null for unknown metrics,
 * unknown platforms, and the deliberately-excluded most-reliable.
 */
export function getPlatformVariant(
  metricSlug: string,
  platform: string,
): PlatformRankingVariant | null {
  if (platform !== 'twitch' && platform !== 'youtube') return null;
  if (!PLATFORM_VARIANT_SLUGS.includes(metricSlug)) return null;
  const spec = getRankingPageSpec(metricSlug);
  const copy = VARIANT_COPY[metricSlug]?.[platform];
  if (!spec || !copy) return null;
  // Follower-count headers mean subscribers on YouTube-first channels.
  const columns =
    platform === 'youtube'
      ? relabelColumns(spec.columns, {
          Followers: 'Subscribers',
          'Followers now': 'Subscribers now',
        })
      : spec.columns;
  return {
    spec,
    platform,
    platformLabel: platform === 'twitch' ? 'Twitch' : 'YouTube',
    h1: copy.h1,
    buildTitle: (n) => degradedTitle(copy.titles[0], copy.titles[1], n),
    buildDescription: (top) => {
      const noun = platform === 'twitch' ? 'followers' : 'subscribers';
      const lead =
        spec.metric === 'most-followed' && top?.values.follower_count
          ? `${top.streamer.name} leads with ${compact(top.values.follower_count)} ${noun}. `
          : spec.metric === 'fastest-growing' && top?.values.follower_gain_7d
            ? `${top.streamer.name} gained ${compact(top.values.follower_gain_7d)} ${noun} in the last 7 days. `
            : spec.metric === 'most-watched' && top?.values.avg_view_count
              ? `${top.streamer.name} leads with ${compact(top.values.avg_view_count)} average live viewers. `
              : spec.metric === 'most-active' && top?.values.hours_streamed_28d
                ? `${top.streamer.name} leads with ${formatHours(top.values.hours_streamed_28d)} streamed in the last 28 days. `
                : '';
      return buildRankingDescription(lead, copy.evergreen);
    },
    buildIntro: copy.intro,
    methodologyNote: copy.methodologyNote,
    columns,
    matches: platformMatcher(platform),
    faq: [copy.inclusionFaq, ...spec.faq.slice(0, 1)],
  };
}

/**
 * Filters a whole ranking pool down to one platform and re-ranks densely
 * from 1 — a platform page is its own leaderboard ("the #1 Twitch streamer"),
 * not a filtered view keeping mixed-ranking positions. Capped to `limit`.
 */
export function filterPlatformEntries(
  variant: PlatformRankingVariant,
  entries: PublicRankingEntry[],
  limit = 100,
): PublicRankingEntry[] {
  const out: PublicRankingEntry[] = [];
  for (const e of entries) {
    if (!variant.matches(e)) continue;
    out.push(e.rank === out.length + 1 ? e : { ...e, rank: out.length + 1 });
    if (out.length >= limit) break;
  }
  return out;
}

// ============================================
// Sanitization + JSON-LD
// ============================================

/**
 * Defensive filter over API entries: drops rows without a streamer or without
 * a positive primary metric value (the server already excludes them, but the
 * pages must never render a "0"/empty leaderboard row), then re-ranks densely
 * so positions stay gap-free after any drop.
 *
 * `startRank` is the absolute rank of the first entry of this page — pass
 * `offset + 1` when paginating. It must NOT default to a page-local 1..n on
 * page 2+: RankingTable ids each row `#rank-<entry.rank>`, and the streamer
 * detail page deep-links into exactly those anchors using the absolute rank
 * the API reports. Re-numbering page 2 to 1..100 silently pointed every
 * "#rank-142" link at a row that did not exist (caught in end-to-end
 * verification, 2026-07-20).
 */
export function sanitizeRankingEntries(
  spec: RankingPageSpec,
  entries: PublicRankingEntry[],
  startRank = 1,
): PublicRankingEntry[] {
  return entries
    .filter((e) => {
      if (!e || !e.streamer || typeof e.streamer.id !== 'string' || e.streamer.id.length === 0) {
        return false;
      }
      const v = spec.primaryValue(e);
      return v != null && Number.isFinite(v) && v > 0;
    })
    .map((e, i) => (e.rank === startRank + i ? e : { ...e, rank: startRank + i }));
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

// ============================================
// 7d rank trend (rankings-page expansion)
// ============================================

export type RankTrend =
  | { kind: 'up' | 'down'; delta: number }
  | { kind: 'new' }
  | { kind: 'none' };

/**
 * Week-over-week movement of a leaderboard row. The API omits
 * `values.previous_rank` entirely while its snapshot history warms up
 * (→ 'none' for every row); once present, null means "not in the top list
 * a week ago" (→ 'new').
 */
export function rankTrend(entry: PublicRankingEntry): RankTrend {
  const prev = entry.values.previous_rank;
  if (prev === undefined) return { kind: 'none' };
  if (prev === null) return { kind: 'new' };
  const delta = prev - entry.rank;
  if (delta > 0) return { kind: 'up', delta };
  if (delta < 0) return { kind: 'down', delta: -delta };
  return { kind: 'none' };
}
