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
} from './types';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

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
 * Client-side ranking of the Highlights rail (per Epic Milestone 13):
 *   0.45 × normalized log views + 0.30 × category affinity + 0.25 × recency
 * with at most CLIPS_PER_STREAMER clips per streamer, CLIPS_LIMIT total.
 */
export function rankClips(
  clips: FeedClip[],
  profile: UserInterestProfile | null,
  now: Date = new Date(),
): FeedClip[] {
  if (clips.length === 0) return [];

  const maxLogViews = Math.max(...clips.map((clip) => Math.log1p(clip.viewCount)), 1);
  const affinity = profile?.categoryAffinity ?? {};

  const scored = clips
    .map((clip) => {
      const days = Math.max((now.getTime() - new Date(clip.clipCreatedAt).getTime()) / DAY_MS, 0);
      const score =
        0.45 * (Math.log1p(clip.viewCount) / maxLogViews) +
        0.3 * (clip.category ? (affinity[clip.category] ?? 0) : 0) +
        0.25 * Math.exp(-days / 3);
      return { clip, score };
    })
    .sort((a, b) => b.score - a.score);

  const perStreamer = new Map<string, number>();
  const result: FeedClip[] = [];
  for (const { clip } of scored) {
    const count = perStreamer.get(clip.streamerId) ?? 0;
    if (count >= CLIPS_PER_STREAMER) continue;
    perStreamer.set(clip.streamerId, count + 1);
    result.push(clip);
    if (result.length >= CLIPS_LIMIT) break;
  }
  return result;
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
