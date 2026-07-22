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
  DISCOVER_SHOWN,
  DISCOVER_MAX_PER_CATEGORY,
} from './constants';
import type {
  StreamSlot,
  StreamStatus,
  FeedClip,
  FeedRecentStream,
  DiscoverRecommendation,
  UserInterestProfile,
  HomeLiveEntry,
  PredictionFunFact,
  PredictionFunFactRow,
  FeedEngagementStats,
} from './types';

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
 * M18 P4: dismissed Discover candidates sink (score × 0.5) before the
 * diversity pass — suppressed, never removed (decays with the 60d window).
 * Mirrored in the app's useHomeFeed — keep in sync.
 */
export function applyDismissSuppression(
  candidates: DiscoverRecommendation[],
  engagement: FeedEngagementStats | null,
): DiscoverRecommendation[] {
  if (!engagement) return candidates;
  const dismissedStreamers = new Set(engagement.dismissedStreamers);
  const dismissedCategories = new Set(engagement.dismissedCategories);
  return candidates
    .map((candidate) => {
      const suppressed =
        dismissedStreamers.has(candidate.streamerId) ||
        (!!candidate.topCategory && dismissedCategories.has(candidate.topCategory));
      return { candidate, adjusted: suppressed ? candidate.score * 0.5 : candidate.score };
    })
    .sort((a, b) => b.adjusted - a.adjusted)
    .map((entry) => entry.candidate);
}

/**
 * MMR-lite diversity pass over the score-ordered Discover candidates: pick
 * DISCOVER_SHOWN entries with at most DISCOVER_MAX_PER_CATEGORY per dominant
 * category, backfilling by plain score when diversity leaves gaps.
 */
export function diversityPass(candidates: DiscoverRecommendation[]): DiscoverRecommendation[] {
  const picked: DiscoverRecommendation[] = [];
  const perCategory = new Map<string, number>();

  for (const candidate of candidates) {
    if (picked.length >= DISCOVER_SHOWN) break;
    const key = candidate.topCategory ?? `__none_${candidate.streamerId}`;
    const count = perCategory.get(key) ?? 0;
    if (count >= DISCOVER_MAX_PER_CATEGORY) continue;
    perCategory.set(key, count + 1);
    picked.push(candidate);
  }

  if (picked.length < DISCOVER_SHOWN) {
    for (const candidate of candidates) {
      if (picked.length >= DISCOVER_SHOWN) break;
      if (!picked.some((p) => p.streamerId === candidate.streamerId)) {
        picked.push(candidate);
      }
    }
  }
  return picked;
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

/**
 * "Why recommended" chip copy from the RPC's reason code. Kept short — it
 * renders inside a one-line chip.
 */
export function buildDiscoverReasonLabel(rec: DiscoverRecommendation): string {
  switch (rec.reason) {
    case 'category':
      if (rec.reasonCategory && rec.reasonCategoryFavorites > 1) {
        return `Streams ${rec.reasonCategory}, like ${rec.reasonCategoryFavorites} of your favorites`;
      }
      if (rec.reasonCategory) {
        return `Streams ${rec.reasonCategory}`;
      }
      return 'Matches your interests';
    case 'language':
      return 'Streams in your language';
    case 'schedule':
      return 'Live when you usually watch';
    case 'active':
      return 'Very active recently';
    case 'popular':
    default:
      return 'Popular on Streamer Times';
  }
}

/**
 * An active category chip REORDERS Discover (matches float to the top) but
 * never filters it. Stable for equal keys.
 */
export function reorderDiscover(
  discover: DiscoverRecommendation[],
  selectedCategory: string | null,
): DiscoverRecommendation[] {
  if (selectedCategory === null) return discover;
  return [...discover].sort((a, b) => {
    const aMatch =
      a.topCategory === selectedCategory || a.reasonCategory === selectedCategory ? 1 : 0;
    const bMatch =
      b.topCategory === selectedCategory || b.reasonCategory === selectedCategory ? 1 : 0;
    return bMatch - aMatch;
  });
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

/**
 * "≈120K followers · 12 streams in 28d" for Discover cards (M18 Phase 2B).
 * Renders only the parts we have; null when neither is available.
 * Keep the wording in sync with the app's DiscoverStreamerCard.
 */
export function buildDiscoverStatsLine(stats: {
  followerCount: number | null;
  streams28d: number | null;
}): string | null {
  const parts: string[] = [];
  if (typeof stats.followerCount === 'number' && stats.followerCount > 0) {
    parts.push(`≈${formatViews(stats.followerCount)} followers`);
  }
  if (typeof stats.streams28d === 'number' && stats.streams28d > 0) {
    parts.push(`${stats.streams28d} stream${stats.streams28d === 1 ? '' : 's'} in 28d`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
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

/**
 * Aggregates a week of favorites' stream history into the Monday recap card.
 * Null when there is too little to celebrate (<2 streams or <1h total).
 */
export function computeWeeklyRecap(
  rows: Array<{ durationMinutes: number | null; category: string | null }>,
): WeeklyRecapData | null {
  if (rows.length < 2) return null;

  let totalMinutes = 0;
  const byCategory = new Map<string, number>();
  for (const row of rows) {
    const minutes = row.durationMinutes ?? 0;
    totalMinutes += minutes;
    if (row.category) {
      byCategory.set(row.category, (byCategory.get(row.category) ?? 0) + minutes);
    }
  }
  if (totalMinutes < 60) return null;

  let topCategory: string | null = null;
  let topMinutes = 0;
  for (const [category, minutes] of byCategory) {
    if (minutes > topMinutes) {
      topMinutes = minutes;
      topCategory = category;
    }
  }

  return {
    totalHours: Math.round(totalMinutes / 60),
    streams: rows.length,
    topCategory,
  };
}

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
