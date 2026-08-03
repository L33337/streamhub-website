// Pure feed logic (M16) — ports of the mobile app's M13 Home Feed glue:
//   - slot status / dedupe:   StreamHub src/utils/streamUtils.ts
//   - rankClips/diversity:    StreamHub src/hooks/useHomeFeed.ts
//   - reason label:           StreamHub src/components/DiscoverStreamerCard.tsx
//   - formatters:             StreamHub src/components/ClipCard.tsx, FeedVodCard.tsx,
//                             src/utils/dateUtils.ts
// No I/O in this module — everything is unit-tested in __tests__/.

import {
  RECENT_FALLBACK_HOURS,
  UP_NEXT_WINDOW_HOURS,
  UP_NEXT_LIMIT,
  CLIPS_LIMIT,
  CLIPS_PER_STREAMER,
} from './constants';
import type {
  StreamSlot,
  StreamStatus,
  FeedClip,
  FeedRecentStream,
  UserInterestProfile,
  HomeLiveEntry,
  PredictionFunFact,
  PredictionFunFactRow,
  FeedEngagementStats,
  TrendingGame,
  FavoriteWeekHistoryRow,
  WeekLeaderboardEntry,
} from './types';
// The homepage's interval union, reused verbatim so the feed's favorites
// leaderboard counts sessions exactly like "Most streamed this week" does.
// lib/home/logic.ts is pure and client-safe (its only import is type-only);
// lib/server/most-streamed.ts is the `server-only` wrapper — never import that.
import { rankWeekStreamed } from '@/lib/home/logic';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

/**
 * Current status of a slot. The database 'live' status is trusted (the
 * backend keeps it in sync via EventSub/WebSub); AI predictions never show
 * as live based on time alone.
 */
export function calculateStreamStatus(slot: StreamSlot, now: Date = new Date()): StreamStatus {
  if (slot.status === 'live') return 'live';

  const start = new Date(slot.startTime);
  const end = new Date(start.getTime() + slot.duration * MINUTE_MS);

  if (now >= start && now <= end) {
    return slot.isAiPrediction ? 'upcoming' : 'live';
  }
  if (now < start) return 'upcoming';
  return 'offline';
}

/**
 * Remove overlapping slots per streamer. Priority: real slots > AI
 * predictions, live > upcoming > offline, then earlier start. Non-overlapping
 * slots from the same streamer are preserved.
 */
export function deduplicateStreamerSlots(slots: StreamSlot[]): StreamSlot[] {
  const byStreamer = new Map<string, StreamSlot[]>();
  slots.forEach((slot) => {
    const list = byStreamer.get(slot.streamerId) ?? [];
    list.push(slot);
    byStreamer.set(slot.streamerId, list);
  });

  const result: StreamSlot[] = [];
  const statusOrder: Record<string, number> = { live: 0, upcoming: 1, offline: 2 };

  byStreamer.forEach((streamerSlots) => {
    streamerSlots.sort((a, b) => {
      if (a.isAiPrediction !== b.isAiPrediction) return a.isAiPrediction ? 1 : -1;
      const sa = statusOrder[a.status] ?? 2;
      const sb = statusOrder[b.status] ?? 2;
      if (sa !== sb) return sa - sb;
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });

    const kept: StreamSlot[] = [];
    for (const slot of streamerSlots) {
      const slotStart = new Date(slot.startTime).getTime();
      const slotEnd = slotStart + slot.duration * MINUTE_MS;
      const overlaps = kept.some((k) => {
        const kStart = new Date(k.startTime).getTime();
        const kEnd = kStart + k.duration * MINUTE_MS;
        return slotStart < kEnd && slotEnd > kStart;
      });
      if (!overlaps) kept.push(slot);
    }
    result.push(...kept);
  });

  return result;
}

export function sortSlotsByStartTime(slots: StreamSlot[]): StreamSlot[] {
  return [...slots].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );
}

/**
 * Live Now + Up Next from the favorites' slots and the featured-live slots.
 * Live Now: favorites' live slots (sorted by start), then live featured
 * streamers not already in the rail, flagged as suggestions.
 * Up Next: upcoming favorite slots starting between now−15min and now+12h,
 * max 5. Deviation from the app (documented in Epic 16): slots with
 * slotKind 'cancelled' are excluded — the website has no badge rendering
 * for them yet.
 */
export function deriveLiveAndUpNext(
  slots: StreamSlot[],
  featuredLiveSlots: StreamSlot[],
  now: Date = new Date(),
): { liveNow: HomeLiveEntry[]; upNext: StreamSlot[] } {
  const withStatus = slots.map((slot) => ({
    ...slot,
    status: calculateStreamStatus(slot, now),
  }));
  const deduped = deduplicateStreamerSlots(withStatus);

  const favoriteLive = sortSlotsByStartTime(deduped.filter((slot) => slot.status === 'live'));
  const liveIds = new Set(favoriteLive.map((slot) => slot.streamerId));

  const liveNow: HomeLiveEntry[] = [
    ...favoriteLive.map((slot) => ({ slot, isFeaturedSuggestion: false })),
    ...featuredLiveSlots
      .filter(
        (slot) => !liveIds.has(slot.streamerId) && calculateStreamStatus(slot, now) === 'live',
      )
      .map((slot) => ({
        slot: { ...slot, status: 'live' as StreamStatus },
        isFeaturedSuggestion: true,
      })),
  ];

  const nowMs = now.getTime();
  const windowEnd = nowMs + UP_NEXT_WINDOW_HOURS * HOUR_MS;
  const upNext = sortSlotsByStartTime(
    deduped.filter((slot) => {
      if (slot.status !== 'upcoming') return false;
      if (slot.slotKind === 'cancelled') return false;
      const start = new Date(slot.startTime).getTime();
      return start >= nowMs - 15 * MINUTE_MS && start <= windowEnd;
    }),
  ).slice(0, UP_NEXT_LIMIT);

  return { liveNow, upNext };
}

/**
 * Ordering of the Highlights rail (reworked 2026-07-22 — replaced the
 * M13/M18-P4 interest-score formula with a deterministic view-count
 * round-robin): each streamer's clips sort by viewCount desc, streamers
 * order by their most-viewed clip, and the rail interleaves them —
 * top clip of streamer X, top clip of Y, ..., then X's second, Y's second.
 * Dismissed streamers/categories (M18 P0 dismiss) sink to the end of the
 * order (suppressed, never hidden). CLIPS_PER_STREAMER still caps the top
 * rail; the remainder continues the same order in the load-more region.
 * Mirrored in the app's useHomeFeed — keep in sync.
 */
export function rankClips(
  clips: FeedClip[],
  engagement: FeedEngagementStats | null = null,
): FeedClip[] {
  return rankClipsSplit(clips, engagement).top;
}

function compareClipsByViews(a: FeedClip, b: FeedClip): number {
  return (
    b.viewCount - a.viewCount ||
    new Date(b.clipCreatedAt).getTime() - new Date(a.clipCreatedAt).getTime() ||
    a.id.localeCompare(b.id)
  );
}

function interleaveClipsByStreamer(pool: FeedClip[]): FeedClip[] {
  const groups = new Map<string, FeedClip[]>();
  for (const clip of pool) {
    const group = groups.get(clip.streamerId);
    if (group) group.push(clip);
    else groups.set(clip.streamerId, [clip]);
  }
  const ordered = [...groups.values()]
    .map((group) => group.sort(compareClipsByViews))
    .sort((a, b) => compareClipsByViews(a[0], b[0]));

  const result: FeedClip[] = [];
  for (let pass = 0; ; pass++) {
    let pushedAny = false;
    for (const group of ordered) {
      if (pass < group.length) {
        result.push(group[pass]);
        pushedAny = true;
      }
    }
    if (!pushedAny) break;
  }
  return result;
}

/**
 * The full round-robin order without rail caps: streamers by their
 * most-viewed clip, clips per streamer by views, dismissed content sinking
 * to the end. Used by rankClipsSplit and for the non-favorite discovery
 * clips appended to "More highlights" (2026-07-22).
 */
export function orderClipsByPopularity(
  clips: FeedClip[],
  engagement: FeedEngagementStats | null = null,
): FeedClip[] {
  const dismissedStreamers = new Set(engagement?.dismissedStreamers ?? []);
  const dismissedCategories = new Set(engagement?.dismissedCategories ?? []);
  const isSuppressed = (clip: FeedClip) =>
    dismissedStreamers.has(clip.streamerId) ||
    (!!clip.category && dismissedCategories.has(clip.category));

  return [
    ...interleaveClipsByStreamer(clips.filter((clip) => !isSuppressed(clip))),
    ...interleaveClipsByStreamer(clips.filter(isSuppressed)),
  ];
}

/**
 * M18 P3: same ordering, but also returns the remainder for the load-more
 * region — everything that did not make the top rail (either beyond the
 * total cap or blocked by the per-streamer limit), same interleaved order.
 */
export function rankClipsSplit(
  clips: FeedClip[],
  engagement: FeedEngagementStats | null = null,
): { top: FeedClip[]; more: FeedClip[] } {
  if (clips.length === 0) return { top: [], more: [] };

  const ordered = orderClipsByPopularity(clips, engagement);

  const perStreamer = new Map<string, number>();
  const top: FeedClip[] = [];
  const pickedIds = new Set<string>();
  for (const clip of ordered) {
    const count = perStreamer.get(clip.streamerId) ?? 0;
    if (count >= CLIPS_PER_STREAMER) continue;
    perStreamer.set(clip.streamerId, count + 1);
    top.push(clip);
    pickedIds.add(clip.id);
    if (top.length >= CLIPS_LIMIT) break;
  }
  const more = ordered.filter((clip) => !pickedIds.has(clip.id));
  return { top, more };
}

/**
 * Chip candidates: top-6 profile affinity categories (by weight), then
 * categories present in the feed sections, deduped, max 8.
 */
export function deriveChipCategories(
  profile: UserInterestProfile | null,
  liveNow: HomeLiveEntry[],
  upNext: StreamSlot[],
  recent: FeedRecentStream[],
  clips: FeedClip[],
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  const push = (category?: string) => {
    if (!category) return;
    const trimmed = category.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    result.push(trimmed);
  };

  if (profile) {
    Object.entries(profile.categoryAffinity)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .forEach(([category]) => push(category));
  }
  liveNow.forEach((entry) => push(entry.slot.category));
  upNext.forEach((slot) => push(slot.category));
  recent.forEach((stream) => push(stream.category));
  clips.forEach((clip) => push(clip.category));

  return result.slice(0, 8);
}

// ============================================
// "Who streamed most this week" (favorites leaderboard)
// ============================================

/**
 * The viewer's most-streamed favorites of the last 7 days.
 *
 * Hours and session counts come from `rankWeekStreamed`, the same interval
 * union the homepage's "Most streamed this week" uses — a simulcast writes one
 * stream_history row per platform and Twitch splits one night into several
 * VODs, so counting rows would double or triple the real number (CLAUDE.md
 * "Session counting").
 *
 * Returns [] below MIN_WEEK_LEADERBOARD_ENTRIES: a leaderboard of one is not a
 * leaderboard, it is a fact about a single streamer — and the section already
 * has better cards for that. The hide rule lives here rather than in the
 * component so it is covered by tests.
 */
export const MIN_WEEK_LEADERBOARD_ENTRIES = 2;

export function buildWeekLeaderboard(
  rows: FavoriteWeekHistoryRow[],
  since: Date,
  now: Date,
  nameMap: Record<string, string>,
  top = 3,
): WeekLeaderboardEntry[] {
  // Oversample before the name join: a favorite whose display name we do not
  // know would otherwise consume one of the three visible slots and then be
  // dropped, silently shortening the list.
  const ranked = rankWeekStreamed(rows, since, now, top * 3);

  // Minutes per category per streamer — `duration_minutes` rather than the
  // interval, because a session can span several categories and only the row
  // knows which minutes belonged to which game.
  const minutesByStreamer = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const category = row.category?.trim();
    if (!category) continue;
    const minutes = row.duration_minutes;
    if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) continue;
    const byCategory = minutesByStreamer.get(row.streamer_id) ?? new Map<string, number>();
    byCategory.set(category, (byCategory.get(category) ?? 0) + minutes);
    minutesByStreamer.set(row.streamer_id, byCategory);
  }

  const entries: WeekLeaderboardEntry[] = [];
  for (const item of ranked) {
    const name = nameMap[item.streamerId];
    if (!name || item.hours <= 0) continue;
    const byCategory = minutesByStreamer.get(item.streamerId);
    let topCategory: string | null = null;
    if (byCategory) {
      // Ties resolve alphabetically so the card does not reshuffle between two
      // equally-streamed games on every render.
      topCategory =
        [...byCategory.entries()].sort(
          (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
        )[0]?.[0] ?? null;
    }
    entries.push({
      streamerId: item.streamerId,
      name,
      hours: item.hours,
      sessions: item.sessions,
      topCategory,
    });
    if (entries.length === top) break;
  }

  return entries.length >= MIN_WEEK_LEADERBOARD_ENTRIES ? entries : [];
}

/**
 * The Monday recap's totals, computed from the SAME rows as the leaderboard.
 *
 * These two cards sit next to each other on Mondays, so they must not be able
 * to disagree. Before 2026-08-03 the recap summed `source='stream_slot'` rows
 * while the leaderboard unions `source='vod'` intervals — a viewer comparing
 * "32 h this week" against three per-streamer rows adding up to 66 h reads
 * that as a bug, and rightly so.
 *
 * `streams` therefore counts SESSIONS, not rows: a simulcast writes one row
 * per platform and Twitch splits a long night into several VODs (CLAUDE.md
 * "Session counting"). The old row count over-reported both.
 */
export function computeFavoritesWeekTotals(
  rows: FavoriteWeekHistoryRow[],
  since: Date,
  now: Date,
): WeeklyRecapData | null {
  const ranked = rankWeekStreamed(rows, since, now, Number.MAX_SAFE_INTEGER);
  const totalHours = ranked.reduce((sum, entry) => sum + entry.hours, 0);
  const streams = ranked.reduce((sum, entry) => sum + entry.sessions, 0);
  // Same floors as the card it replaces: under two streams or an hour of live
  // time there is no week to recap.
  if (streams < 2 || totalHours < 1) return null;

  const minutesByCategory = new Map<string, number>();
  for (const row of rows) {
    const category = row.category?.trim();
    const minutes = row.duration_minutes;
    if (!category || typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) {
      continue;
    }
    minutesByCategory.set(category, (minutesByCategory.get(category) ?? 0) + minutes);
  }
  const topCategory =
    [...minutesByCategory.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ??
    null;

  return { totalHours: Math.round(totalHours), streams, topCategory };
}

// ============================================
// Trending games — "your streamers play this"
// ============================================

export interface PersonalizedTrendingGame extends TrendingGame {
  /** Distinct favorites seen in this category across the loaded sections. */
  favoriteCount: number;
}

/**
 * Floats the trending games the viewer's own favorites are actually playing to
 * the front of the rail and annotates them with a count.
 *
 * Deliberately a re-ORDER, not a filter: the rail's job is "what is big on
 * Twitch right now", and filtering it to the viewer's categories would usually
 * leave one tile or none. Matching is exact name equality — `trending_games`
 * and `stream_slots.category` both carry Twitch's own category names, and a
 * fuzzy match here would claim a streamer plays a game they do not.
 *
 * liveNow's featured SUGGESTIONS are excluded: those are channels the viewer
 * does not follow, so counting them would make "your streamers" untrue.
 */
export function personalizeTrendingGames(
  games: TrendingGame[],
  sections: {
    liveNow?: HomeLiveEntry[];
    upNext?: StreamSlot[];
    recent?: FeedRecentStream[];
    clips?: FeedClip[];
  },
): PersonalizedTrendingGame[] {
  const streamersByCategory = new Map<string, Set<string>>();
  const add = (category: string | null | undefined, streamerId: string | undefined) => {
    const trimmed = category?.trim();
    if (!trimmed || !streamerId) return;
    const set = streamersByCategory.get(trimmed) ?? new Set<string>();
    set.add(streamerId);
    streamersByCategory.set(trimmed, set);
  };

  sections.liveNow?.forEach((entry) => {
    if (entry.isFeaturedSuggestion) return;
    add(entry.slot.category, entry.slot.streamerId);
  });
  sections.upNext?.forEach((slot) => add(slot.category, slot.streamerId));
  sections.recent?.forEach((stream) => add(stream.category, stream.streamerId));
  sections.clips?.forEach((clip) => add(clip.category, clip.streamerId));

  const annotated = games.map((game) => ({
    ...game,
    favoriteCount: streamersByCategory.get(game.gameName.trim())?.size ?? 0,
  }));

  // Stable partition: matches keep their Twitch rank order among themselves,
  // and so does the remainder.
  return [
    ...annotated.filter((game) => game.favoriteCount > 0),
    ...annotated.filter((game) => game.favoriteCount === 0),
  ];
}

/** Best prediction hit: the row with the smallest |actual − predicted|. */
export function pickBestFunFact(rows: PredictionFunFactRow[]): PredictionFunFact | null {
  let best: PredictionFunFact | null = null;
  for (const row of rows) {
    const diffMinutes = Math.round(
      Math.abs(
        new Date(row.actual_start_time).getTime() - new Date(row.predicted_start_time).getTime(),
      ) / MINUTE_MS,
    );
    if (best === null || diffMinutes < best.diffMinutes) {
      best = {
        streamerId: row.streamer_id,
        diffMinutes,
        evaluatedAt: row.evaluated_at ?? row.actual_start_time,
      };
    }
  }
  return best;
}

/**
 * "New for you" window start: max(now − 24h, watermark cookie). Invalid
 * cookies fall back to the 24h window; a future-dated cookie (clock skew)
 * clamps to now instead of blanking the section semantics.
 */
export function resolveSince(cookieValue: string | undefined, now: Date = new Date()): Date {
  const fallback = new Date(now.getTime() - RECENT_FALLBACK_HOURS * HOUR_MS);
  if (!cookieValue) return fallback;
  const parsed = new Date(cookieValue);
  if (Number.isNaN(parsed.getTime())) return fallback;
  if (parsed.getTime() <= fallback.getTime()) return fallback;
  if (parsed.getTime() > now.getTime()) return now;
  return parsed;
}

// ---------------------------------------------------------------------------
// Formatters (parity with the app's cards)
// ---------------------------------------------------------------------------

export function formatViews(views: number): string {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(views >= 10_000 ? 0 : 1)}K`;
  return String(views);
}

export function formatClipDuration(seconds?: number): string | null {
  if (!seconds || seconds <= 0) return null;
  const total = Math.round(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function endedAgoLabel(endedAt: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(endedAt).getTime();
  const diffMins = Math.max(Math.floor(diffMs / MINUTE_MS), 0);
  if (diffMins < 60) return `Ended ${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Ended ${diffHours}h ago`;
  return `Ended ${Math.floor(diffHours / 24)}d ago`;
}

/**
 * Badge copy for the M14 announced-schedule adherence tier (M18 Phase 2).
 * Returns null for 'unknown' (cold start) — the caller renders nothing.
 * Keep the wording in sync with the app's ReliabilityBadge.
 */
export function buildReliabilityLabel(reliability: {
  timeTier: string;
  medianStartDeviationMinutes: number | null;
}): string | null {
  const deviation = reliability.medianStartDeviationMinutes;
  switch (reliability.timeTier) {
    case 'reliable':
      if (deviation !== null && Math.abs(deviation) >= 10) {
        const minutes = Math.abs(Math.round(deviation));
        return deviation > 0 ? `Usually ~${minutes} min late` : `Usually ~${minutes} min early`;
      }
      return 'Usually on time';
    case 'medium':
      return 'Mostly on schedule';
    case 'unreliable':
      return 'Schedule often shifts';
    default:
      return null;
  }
}

// ============================================
// M18 Phase 2C — M13-backlog card helpers
// (mirrored in the app's src/utils/feedCards.ts — keep in sync)
// ============================================

/** Minimum peak viewers before a record is worth a card (noise floor). */
export const MILESTONE_MIN_PEAK = 100;
/** A record only counts while it is fresh (the stream just happened). */
export const MILESTONE_FRESH_HOURS = 72;
/** "Off the usual time" threshold for the you-might-have-missed card. */
export const MISSED_HOUR_DIFF = 3;

/** Index of the strongest hour bin (UTC) — null when the histogram is flat/empty. */
export function typicalStartHourUtc(hourHistogram: number[] | null | undefined): number | null {
  if (!hourHistogram || hourHistogram.length !== 24) return null;
  let best = -1;
  let bestValue = 0;
  for (let hour = 0; hour < 24; hour++) {
    const value = hourHistogram[hour] ?? 0;
    if (value > bestValue) {
      bestValue = value;
      best = hour;
    }
  }
  return bestValue > 0 ? best : null;
}

/** Circular distance between two hours-of-day (0–12). */
export function circularHourDiff(a: number, b: number): number {
  const diff = Math.abs(a - b) % 24;
  return Math.min(diff, 24 - diff);
}

export interface WeeklyRecapData {
  totalHours: number;
  streams: number;
  topCategory: string | null;
}

// The row-summing computeWeeklyRecap() that used to live here was replaced by
// computeFavoritesWeekTotals() on 2026-08-03: it counted stream_history ROWS
// as streams, which double-counts simulcasts and split VODs, and it read a
// different source than the week leaderboard rendered right above it.

export interface PeakRecord {
  streamerId: string;
  peak: number;
}

/**
 * Detects a fresh 90-day peak-viewer record: the newest stream (within
 * MILESTONE_FRESH_HOURS) strictly beats every earlier peak in the window and
 * clears the noise floor. Rows may span multiple streamers.
 */
export function findPeakRecord(
  rows: Array<{ streamerId: string; peakViewerCount: number | null; endedAt: string }>,
  now: Date = new Date(),
): PeakRecord | null {
  const byStreamer = new Map<string, typeof rows>();
  for (const row of rows) {
    if (row.peakViewerCount === null) continue;
    const list = byStreamer.get(row.streamerId) ?? [];
    list.push(row);
    byStreamer.set(row.streamerId, list);
  }

  const freshCutoff = now.getTime() - MILESTONE_FRESH_HOURS * 60 * 60 * 1000;

  for (const [streamerId, list] of byStreamer) {
    if (list.length < 3) continue; // a "record" needs history to beat
    const sorted = [...list].sort(
      (a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime(),
    );
    const latest = sorted[0];
    if (new Date(latest.endedAt).getTime() < freshCutoff) continue;
    const latestPeak = latest.peakViewerCount ?? 0;
    if (latestPeak < MILESTONE_MIN_PEAK) continue;
    const previousMax = Math.max(...sorted.slice(1).map((row) => row.peakViewerCount ?? 0));
    if (latestPeak > previousMax) {
      return { streamerId, peak: latestPeak };
    }
  }
  return null;
}

/** "8.4K" / "950" formatting for viewer counts. */
export function formatPeak(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

// ============================================
// Feed UX round 2026-07-22 — Up Next grouping + relative time
// (client-side only: labels depend on the viewer's local timezone, so the
// caller must gate rendering behind a post-hydration `mounted` flag)
// ============================================

const DAY_MS = 24 * HOUR_MS;

/**
 * "In 45 min" / "In 2h 05m" for an upcoming slot. Slots already inside the
 * −15min Up Next window (or with an unparsable start) return "Starting now" /
 * null respectively.
 */
export function relativeStartLabel(startTime: string, now: Date): string | null {
  const diffMs = new Date(startTime).getTime() - now.getTime();
  if (Number.isNaN(diffMs)) return null;
  if (diffMs <= MINUTE_MS) return 'Starting now';
  const totalMinutes = Math.round(diffMs / MINUTE_MS);
  if (totalMinutes < 60) return `In ${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `In ${hours}h` : `In ${hours}h ${String(minutes).padStart(2, '0')}m`;
}

/**
 * Day bucket for an Up Next slot in the VIEWER's local timezone. Slots whose
 * start already passed (−15min window) count as Today. The weekday branch is
 * defensive — the 12h Up Next window can only ever span Today/Tomorrow.
 */
export function upNextDayLabel(startTime: string, now: Date): string {
  const start = new Date(startTime);
  const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((midnight(start) - midnight(now)) / DAY_MS);
  if (dayDiff <= 0) return 'Today';
  if (dayDiff === 1) return 'Tomorrow';
  return start.toLocaleDateString('en-US', { weekday: 'long' });
}

export interface UpNextGroup {
  label: string;
  slots: StreamSlot[];
}

/**
 * Groups the (already start-sorted) Up Next slots into consecutive day
 * buckets. Consecutive-run grouping keeps the original order stable even if
 * an input ever arrived unsorted.
 */
export function groupUpNextSlots(slots: StreamSlot[], now: Date): UpNextGroup[] {
  const groups: UpNextGroup[] = [];
  for (const slot of slots) {
    const label = upNextDayLabel(slot.startTime, now);
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.slots.push(slot);
    } else {
      groups.push({ label, slots: [slot] });
    }
  }
  return groups;
}

/** "Updated just now" / "Updated 4 min ago" for the feed header. */
export function updatedAgoLabel(lastUpdatedMs: number, nowMs: number): string {
  const minutes = Math.floor(Math.max(0, nowMs - lastUpdatedMs) / MINUTE_MS);
  if (minutes < 1) return 'Updated just now';
  return `Updated ${minutes} min ago`;
}
