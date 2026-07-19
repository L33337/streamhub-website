import type { Platform, PublicStreamer } from '@/lib/server/partner-api';
import { formatCompactNumber } from '@/lib/format/number';

export interface RankedGameStreamer {
  rank: number; // 1-based
  streamer: PublicStreamer;
}

/**
 * Ranks a game/category's streamers by follower count for the "Most followed
 * {game} streamers" table. Pure + deterministic so it can be unit-tested and
 * reused across renders.
 *
 * - Excludes streamers with no usable follower count (`null` or `<= 0`) — the
 *   table never shows "0" followers, and a missing count can't be ranked
 *   honestly. Those streamers still appear elsewhere on the page (the "More …"
 *   grid), just not in the ranking.
 * - Sorts by follower_count desc, tie-broken by avg_view_count desc (nulls
 *   last), then name asc. The Partner API already returns follower-desc order,
 *   but re-sorting keeps the helper correct independent of input order.
 * - Returns at most `limit` rows with a 1-based rank.
 */
export function rankGameStreamers(
  streamers: PublicStreamer[],
  limit: number,
): RankedGameStreamer[] {
  return streamers
    .filter((s) => s.follower_count != null && s.follower_count > 0)
    .sort((a, b) => {
      const byFollowers = (b.follower_count ?? 0) - (a.follower_count ?? 0);
      if (byFollowers !== 0) return byFollowers;
      const byViewers = (b.avg_view_count ?? 0) - (a.avg_view_count ?? 0);
      if (byViewers !== 0) return byViewers;
      return a.name.localeCompare(b.name);
    })
    .slice(0, Math.max(0, limit))
    .map((streamer, i) => ({ rank: i + 1, streamer }));
}

// ============================================
// View model for /rankings/game/[slug] (rankings-page expansion)
// ============================================
//
// The page's table is interactive (sort toggle, language chips) and therefore
// a client component — everything it receives must be serializable. This
// section builds those plain rows and hosts the pure sort/filter/FAQ logic so
// it stays unit-testable (lib/__tests__/game-ranking.test.ts).

export type GameRankingSortMode = 'followers' | 'hours' | 'viewers';

export interface GameRankingRow {
  /** Canonical follower rank (1-based) — stable across sort modes. */
  rank: number;
  id: string;
  name: string;
  avatarUrl: string | null;
  platforms: Platform[];
  language: string | null;
  followerCount: number;
  avgViewCount: number | null;
  hours28d: number | null;
  streams28d: number | null;
  sharePercent: number | null;
  /**
   * rank_7d_ago - rank: positive = climbed, negative = dropped, 0 = unchanged.
   * null = no baseline for this streamer (see isNew for the reason split).
   */
  rankDelta: number | null;
  /** True when a 7d baseline exists for the list but not for this streamer. */
  isNew: boolean;
  isLive: boolean;
  /** Fresh live concurrent viewers; null = unknown, never zero. */
  liveViewerCount: number | null;
  /** ISO start of the streamer's next upcoming stream in this category. */
  nextStreamAt: string | null;
  nextIsPredicted: boolean;
}

interface LiveSlotLike {
  streamer_id: string;
  viewer_count?: number | null;
}

interface UpcomingSlotLike {
  streamer_id: string;
  start_time: string;
  is_predicted: boolean;
}

/**
 * Merges the follower ranking with live slots (LIVE badge + viewers) and
 * upcoming slots (earliest next stream per streamer) into serializable rows.
 */
export function buildGameRankingRows(
  ranked: RankedGameStreamer[],
  liveSlots: LiveSlotLike[],
  upcomingSlots: UpcomingSlotLike[],
): GameRankingRow[] {
  const liveViewers = new Map<string, number | null>();
  for (const slot of liveSlots) {
    const prev = liveViewers.get(slot.streamer_id);
    const v = slot.viewer_count ?? null;
    if (prev === undefined || (v != null && (prev == null || v > prev))) {
      liveViewers.set(slot.streamer_id, v);
    }
  }

  const nextSlot = new Map<string, UpcomingSlotLike>();
  for (const slot of upcomingSlots) {
    const t = Date.parse(slot.start_time);
    if (Number.isNaN(t)) continue;
    const prev = nextSlot.get(slot.streamer_id);
    if (!prev || t < Date.parse(prev.start_time)) nextSlot.set(slot.streamer_id, slot);
  }

  // A baseline exists when ANY row carries a 7d-ago rank; only then does a
  // null rank_7d_ago mean "newly ranked" rather than "snapshots warming up".
  const hasBaseline = ranked.some(
    (r) => r.streamer.category_stats?.rank_7d_ago != null,
  );

  return ranked.map(({ rank, streamer }) => {
    const stats = streamer.category_stats;
    const prevRank = stats?.rank_7d_ago ?? null;
    const next = nextSlot.get(streamer.id);
    return {
      rank,
      id: streamer.id,
      name: streamer.name,
      avatarUrl: streamer.avatar_url,
      platforms: streamer.platforms,
      language: streamer.language,
      followerCount: streamer.follower_count ?? 0,
      avgViewCount: streamer.avg_view_count,
      hours28d: stats ? stats.hours_28d : null,
      streams28d: stats ? stats.streams_28d : null,
      sharePercent: stats ? stats.share_percent : null,
      rankDelta: prevRank != null ? prevRank - rank : null,
      isNew: hasBaseline && prevRank == null,
      isLive: liveViewers.has(streamer.id),
      liveViewerCount: liveViewers.get(streamer.id) ?? null,
      nextStreamAt: next?.start_time ?? null,
      nextIsPredicted: next?.is_predicted ?? false,
    };
  });
}

/**
 * Returns a sorted copy. 'followers' is the canonical rank order; the other
 * modes sort by their metric (nulls last) with the canonical rank as
 * tiebreaker, so re-sorting is deterministic.
 */
export function sortGameRankingRows(
  rows: GameRankingRow[],
  mode: GameRankingSortMode,
): GameRankingRow[] {
  const copy = [...rows];
  if (mode === 'followers') return copy.sort((a, b) => a.rank - b.rank);
  const value =
    mode === 'hours'
      ? (r: GameRankingRow) => r.hours28d
      : (r: GameRankingRow) => r.avgViewCount;
  return copy.sort((a, b) => {
    const av = value(a);
    const bv = value(b);
    if (av == null && bv == null) return a.rank - b.rank;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (bv !== av) return bv - av;
    return a.rank - b.rank;
  });
}

/** Primary BCP-47 subtag, lowercased: 'de-DE' → 'de'. null for unset. */
export function languageKey(language: string | null): string | null {
  if (!language) return null;
  const primary = language.trim().split('-')[0].toLowerCase();
  return primary.length > 0 ? primary : null;
}

/**
 * Distinct language chips (primary subtag + row count), most common first.
 * Empty when fewer than 2 distinct languages — a single-language chip row is
 * noise, the page hides the filter entirely.
 */
export function gameRankingLanguages(
  rows: GameRankingRow[],
): { code: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = languageKey(row.language);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if (counts.size < 2) return [];
  return [...counts.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
}

/** null language filter = all rows. */
export function filterGameRankingRows(
  rows: GameRankingRow[],
  language: string | null,
): GameRankingRow[] {
  if (!language) return rows;
  return rows.filter((r) => languageKey(r.language) === language);
}

/**
 * Latest follower_count_updated_at across the ranked streamers — feeds the
 * visible "Follower counts refreshed …" freshness line. null when unknown.
 */
export function latestFollowerRefresh(
  streamers: { follower_count_updated_at: string | null }[],
): string | null {
  let max: string | null = null;
  for (const s of streamers) {
    const v = s.follower_count_updated_at;
    if (v && (max === null || v > max)) max = v;
  }
  return max;
}

/**
 * Data-driven Q&A block for a game ranking page (same plain-content
 * philosophy as the RANKING_PAGES faq registry — deliberately no FAQPage
 * JSON-LD). Only questions whose data exists are emitted.
 */
export function buildGameRankingFaq(params: {
  category: string;
  rows: GameRankingRow[];
  streamerCount: number | null;
  hours28d: number | null;
  streams28d: number | null;
}): { q: string; a: string }[] {
  const { category, rows } = params;
  const faq: { q: string; a: string }[] = [];
  const top = rows[0];

  if (top) {
    const noun = top.platforms.includes('twitch') ? 'followers' : 'subscribers';
    const second = rows[1];
    const runnerUp =
      second != null
        ? `, ahead of ${second.name} with ${formatCompactNumber(second.followerCount, 'en')}`
        : '';
    faq.push({
      q: `Who is the most followed ${category} streamer?`,
      a: `${top.name} is currently the most followed ${category} streamer we track, with ${formatCompactNumber(top.followerCount, 'en')} ${noun}${runnerUp}. Counts are refreshed daily.`,
    });
  }

  if (params.streamerCount != null && params.streamerCount > 0) {
    const activity =
      params.hours28d != null && params.hours28d >= 10 && params.streams28d
        ? ` Together they streamed about ${formatCompactNumber(Math.round(params.hours28d), 'en')} hours of ${category} across ${formatCompactNumber(params.streams28d, 'en')} streams in the last 28 days.`
        : '';
    faq.push({
      q: `How many streamers stream ${category}?`,
      a: `We currently track ${params.streamerCount} streamer${params.streamerCount === 1 ? '' : 's'} who streamed ${category} recently or have it on their schedule.${activity}`,
    });
  }

  faq.push({
    q: 'How is this ranking measured?',
    a: `Streamers active in ${category} over the last 28 days, ranked by the follower count of their primary channel — channel followers on Twitch or subscribers on YouTube. The hours and share columns come from a nightly aggregate of finished ${category} broadcasts.`,
  });

  if (rows.some((r) => r.sharePercent != null)) {
    faq.push({
      q: 'What does "Game share" mean?',
      a: `The share of a streamer's recent broadcasts that were ${category}. 100% means it is currently their only game; a low share marks an occasional visitor to the category.`,
    });
  }

  return faq;
}
