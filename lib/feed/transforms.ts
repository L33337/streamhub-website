// Row → model transforms (M16) — port of StreamHub src/services/transforms.ts
// (feed slice), plus the toPublicStreamSlot adapter that lets the existing
// SlotCard render feed slots unchanged.

import type { Platform, PublicStreamSlot } from '@/lib/server/partner-api';
import type {
  StreamSlot,
  StreamSlotRow,
  StreamStatus,
  FeedConfidenceLevel,
  SlotKind,
  FeedRecentStream,
  FeedRecentStreamRow,
  FeedClip,
  StreamClipRow,
  DiscoverRecommendation,
  DiscoverRecommendationRow,
  DiscoverReason,
  TrendingCategory,
  TrendingCategoryRow,
  UserInterestProfile,
  UserInterestProfileRow,
  StreamerReliability,
  StreamerReliabilityRow,
  ReliabilityTier,
  ScheduleChange,
  ScheduleChangeRow,
} from './types';

/**
 * Twitch delivers some thumbnail URLs as size templates ("...{width}x{height}.jpg").
 * Prod data currently contains none, but guard defensively — a template URL
 * would render as a broken image.
 */
export function sanitizeThumbnailUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.includes('{width}') || url.includes('%{width}')) return undefined;
  return url;
}

export function transformStreamSlot(row: StreamSlotRow): StreamSlot {
  return {
    id: row.id,
    streamerId: row.streamer_id,
    streamerName: row.streamer_name,
    platforms: row.platforms as Platform[],
    streamTitle: row.stream_title,
    category: row.category ?? undefined,
    thumbnailUrl: sanitizeThumbnailUrl(row.thumbnail_url),
    avatarUrl: row.avatar_url ?? undefined,
    startTime: row.start_time,
    duration: row.duration,
    status: row.status as StreamStatus,
    confidence: row.confidence as FeedConfidenceLevel,
    reasoning: row.reasoning ?? undefined,
    // M22 P3: language of the reasoning copy + always-English template
    // fallback — the teaser swaps to the generic when the copy language is
    // neither the viewer's nor English (see lib/slot-copy.ts).
    copyLanguage: row.copy_language ?? undefined,
    genericReasoning: row.generic_reasoning ?? undefined,
    isAiPrediction: row.is_ai_prediction,
    visible: row.visible,
    aiPredictionId: row.ai_prediction_id ?? undefined,
    // Rows written before the M15 slot_kind migration carry null.
    slotKind: (row.slot_kind as SlotKind) ?? 'regular',
    isUncertain: row.is_uncertain === true,
    isAlwaysOn: row.is_always_on,
    viewerCount: row.viewer_count ?? undefined,
    viewerCountUpdatedAt: row.viewer_count_updated_at ?? undefined,
  };
}

export function transformFeedRecentStream(row: FeedRecentStreamRow): FeedRecentStream {
  return {
    id: row.id,
    streamerId: row.streamer_id,
    streamerName: row.streamer_name,
    avatarUrl: row.avatar_url ?? undefined,
    platform: row.platform as Platform,
    title: row.title,
    category: row.category ?? undefined,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationMinutes: row.duration_minutes,
    peakViewerCount: row.peak_viewer_count ?? undefined,
    vodUrl: row.vod_url ?? undefined,
    thumbnailUrl: sanitizeThumbnailUrl(row.thumbnail_url),
  };
}

export function transformFeedClip(row: StreamClipRow): FeedClip {
  return {
    id: row.id,
    streamerId: row.streamer_id,
    externalClipId: row.external_clip_id,
    title: row.title,
    url: row.url,
    thumbnailUrl: sanitizeThumbnailUrl(row.thumbnail_url),
    durationSeconds: row.duration_seconds ?? undefined,
    viewCount: row.view_count,
    category: row.category ?? undefined,
    clipCreatedAt: row.clip_created_at,
    creatorName: row.creator_name ?? undefined,
  };
}

/** M18 Phase 2 — streamer_schedule_reliability row. */
export function transformStreamerReliability(row: StreamerReliabilityRow): StreamerReliability {
  const tier = ['reliable', 'medium', 'unreliable', 'unknown'].includes(row.time_tier)
    ? (row.time_tier as ReliabilityTier)
    : 'unknown';
  return {
    streamerId: row.streamer_id,
    timeTier: tier,
    medianStartDeviationMinutes: row.median_start_deviation_minutes,
    timeHitRate: row.time_hit_rate,
    timeSample: row.time_sample,
  };
}

/** M18 Phase 2 — withdrawn stream_schedules row. */
export function transformScheduleChange(row: ScheduleChangeRow): ScheduleChange {
  return {
    scheduleId: row.id,
    streamerId: row.streamer_id,
    title: row.title,
    category: row.category,
    scheduledStartTime: row.scheduled_start_time,
    withdrawnAt: row.withdrawn_at,
  };
}

export function transformDiscoverRecommendation(
  row: DiscoverRecommendationRow,
): DiscoverRecommendation {
  return {
    streamerId: row.streamer_id,
    name: row.name,
    platforms: row.platforms as Platform[],
    avatarUrl: row.avatar_url ?? undefined,
    language: row.language ?? undefined,
    description: row.description ?? undefined,
    avgViewCount: row.avg_view_count ?? undefined,
    isAlwaysOn: row.is_always_on,
    twitchLogin: row.twitch_login ?? undefined,
    youtubeChannelId: row.youtube_channel_id ?? undefined,
    pool: row.pool === 'featured' ? 'featured' : 'popular',
    score: row.score,
    reason: row.reason as DiscoverReason,
    reasonCategory: row.reason_category ?? undefined,
    reasonCategoryFavorites: row.reason_category_favorites ?? 0,
    topCategory: row.top_category ?? undefined,
  };
}

export function transformTrendingCategory(row: TrendingCategoryRow): TrendingCategory {
  return {
    category: row.category,
    streamersCurrent: row.streamers_current,
    streamersPrevious: row.streamers_previous,
    deltaPercent: row.delta_percent,
  };
}

export function transformUserInterestProfile(row: UserInterestProfileRow): UserInterestProfile {
  return {
    categoryAffinity: row.category_affinity ?? {},
    languages: row.languages ?? [],
    activeHours: row.active_hours ?? [],
    sizePrior: row.size_prior,
    favoritesCount: row.favorites_count ?? 0,
    hasExplicitInterests: row.has_explicit_interests ?? false,
    isDerivedFromSeedOnly: row.is_derived_from_seed_only ?? false,
    computedAt: row.computed_at ?? new Date().toISOString(),
  };
}

/**
 * Adapts a feed StreamSlot (Supabase row, camelCase) to the Partner-API
 * PublicStreamSlot DTO so the existing SlotCard / SlotStatusText render it
 * unchanged. Fields the Supabase row doesn't carry map to null —
 * streamer_timezone: null makes SlotStatusText fall back to its UTC label.
 * Pass the slot AFTER status recalculation (calculateStreamStatus).
 */
export function toPublicStreamSlot(slot: StreamSlot): PublicStreamSlot {
  return {
    id: slot.id,
    streamer_id: slot.streamerId,
    streamer_name: slot.streamerName,
    platforms: slot.platforms,
    title: slot.streamTitle,
    category: slot.category ?? null,
    thumbnail_url: slot.thumbnailUrl ?? null,
    avatar_url: slot.avatarUrl ?? null,
    start_time: slot.startTime,
    duration_minutes: slot.duration,
    status: slot.status,
    is_predicted: slot.isAiPrediction,
    confidence: slot.confidence,
    slot_kind: slot.slotKind,
    is_always_on: slot.isAlwaysOn,
    twitch_login: null,
    youtube_channel_id: null,
    streamer_timezone: null,
    reasoning: slot.reasoning,
    copy_language: slot.copyLanguage ?? null,
    generic_reasoning: slot.genericReasoning,
  };
}
