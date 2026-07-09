// Personalized feed types (M16) — port of the mobile app's M13 Home Feed
// types (StreamHub: src/types/index.ts + src/services/types.ts). App models
// are camelCase; Row interfaces mirror the Supabase rows / RPC outputs
// (snake_case) and are mapped in transforms.ts.

import type { Platform } from '@/lib/server/partner-api';

export type StreamStatus = 'live' | 'upcoming' | 'offline';
export type FeedConfidenceLevel = 'high' | 'medium' | 'low';
export type SlotKind = 'regular' | 'new' | 'cancelled';

export interface StreamSlot {
  id: string;
  streamerId: string;
  streamerName: string;
  platforms: Platform[];
  streamTitle: string;
  category?: string;
  thumbnailUrl?: string;
  avatarUrl?: string;
  startTime: string; // ISO 8601
  duration: number; // minutes
  status: StreamStatus;
  confidence: FeedConfidenceLevel;
  reasoning?: string;
  isAiPrediction: boolean;
  visible: boolean;
  aiPredictionId?: string;
  slotKind: SlotKind;
  isAlwaysOn: boolean;
}

export interface FeedRecentStream {
  id: string;
  streamerId: string;
  streamerName: string;
  avatarUrl?: string;
  platform: Platform;
  title: string | null;
  category?: string;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  peakViewerCount?: number;
  vodUrl?: string;
  thumbnailUrl?: string;
}

export interface FeedClip {
  id: string;
  streamerId: string;
  /** Twitch clip slug — drives the embed player (M18 Phase 1) */
  externalClipId: string;
  title: string | null;
  url: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  viewCount: number;
  category?: string;
  clipCreatedAt: string;
  creatorName?: string;
}

export type DiscoverReason = 'category' | 'language' | 'schedule' | 'active' | 'popular';

export interface DiscoverRecommendation {
  streamerId: string;
  name: string;
  platforms: Platform[];
  avatarUrl?: string;
  language?: string;
  description?: string;
  avgViewCount?: number;
  isAlwaysOn: boolean;
  twitchLogin?: string;
  youtubeChannelId?: string;
  pool: 'featured' | 'popular';
  score: number;
  reason: DiscoverReason;
  reasonCategory?: string;
  reasonCategoryFavorites: number;
  topCategory?: string;
}

export interface TrendingCategory {
  category: string;
  streamersCurrent: number;
  streamersPrevious: number;
  deltaPercent: number;
}

export interface UserInterestProfile {
  categoryAffinity: Record<string, number>;
  languages: string[];
  activeHours: number[];
  sizePrior: number | null;
  favoritesCount: number;
  hasExplicitInterests: boolean;
  isDerivedFromSeedOnly: boolean;
  computedAt: string;
}

export interface PredictionFunFact {
  streamerId: string;
  diffMinutes: number;
  evaluatedAt: string;
}

// M18 Phase 2: per-streamer announced-schedule adherence (M14 tiers, public read)
export type ReliabilityTier = 'reliable' | 'medium' | 'unreliable' | 'unknown';
export interface StreamerReliability {
  streamerId: string;
  timeTier: ReliabilityTier;
  /** Signed minutes over matched segments: + = typically late */
  medianStartDeviationMinutes: number | null;
  timeHitRate: number | null;
  timeSample: number;
}

// M18 Phase 2: withdrawn announced segment (stream_schedules.withdrawn_at, M17)
export interface ScheduleChange {
  scheduleId: string;
  streamerId: string;
  title: string | null;
  category: string | null;
  scheduledStartTime: string; // ISO 8601
  withdrawnAt: string; // ISO 8601
}

// M18 Phase 2B: sanitized transcript fun fact (feed_fun_facts projection)
export interface FeedFunFact {
  id: string;
  streamerId: string;
  factText: string;
  createdAt: string; // ISO 8601
}

// M18 Phase 2B: favorite on announced Twitch vacation (streamers.vacation_until)
export interface StreamerBreak {
  streamerId: string;
  vacationUntil: string; // ISO 8601
}

// M18 Phase 2B: at-a-glance stats for Discover cards
export interface DiscoverStats {
  streamerId: string;
  followerCount: number | null;
  streams28d: number | null;
}

// 'scroll_depth' + item_type 'section' added in M18 Phase 0
// (app migration 20260709120000_feed_events_phase0.sql — keep in sync).
// 'clip_play_start'/'clip_play_end' + duration_seconds added in M18 Phase 1
// (app migration 20260709130000_feed_events_clip_play.sql).
export type FeedEventType =
  | 'impression'
  | 'tap'
  | 'watch_tap'
  | 'favorite_from_feed'
  | 'clip_open'
  | 'dismiss'
  | 'scroll_depth'
  | 'clip_play_start'
  | 'clip_play_end';

export type FeedItemType =
  | 'live'
  | 'upcoming'
  | 'vod'
  | 'clip'
  | 'discover'
  | 'info'
  | 'chip'
  | 'section';

export interface HomeLiveEntry {
  slot: StreamSlot;
  /** Live featured streamer the user has NOT favorited (appended to the rail) */
  isFeaturedSuggestion: boolean;
}

export type FeedSectionKey = 'slots' | 'recent' | 'clips' | 'discover' | 'trending';

/**
 * Serializable feed payload built by loadFeed() — passed from the server
 * component to FeedClient as plain JSON (Records instead of Maps).
 */
export interface FeedData {
  hasFavorites: boolean;
  liveNow: HomeLiveEntry[];
  upNext: StreamSlot[];
  recent: FeedRecentStream[];
  clips: FeedClip[];
  discover: DiscoverRecommendation[];
  trending: TrendingCategory[];
  funFact: PredictionFunFact | null;
  profile: UserInterestProfile | null;
  /** M18 P2: streamerId → adherence info (favorites, tier != unknown) */
  reliabilityMap: Record<string, StreamerReliability>;
  /** M18 P2: recently withdrawn future announced segments of favorites */
  scheduleChanges: ScheduleChange[];
  /** M18 P2B: recent sanitized transcript fun facts of favorites */
  fanMoments: FeedFunFact[];
  /** M18 P2B: favorites on announced Twitch vacation */
  streamerBreaks: StreamerBreak[];
  /** M18 P2B: streamerId → at-a-glance stats for Discover cards */
  discoverStatsMap: Record<string, DiscoverStats>;
  chipCategories: string[];
  sectionErrors: Partial<Record<FeedSectionKey, string>>;
  avatarMap: Record<string, string>;
  nameMap: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Database row / RPC output shapes (snake_case)
// ---------------------------------------------------------------------------

export interface StreamSlotRow {
  id: string;
  streamer_id: string;
  streamer_name: string;
  platforms: string[];
  stream_title: string;
  category: string | null;
  thumbnail_url: string | null;
  avatar_url: string | null;
  start_time: string;
  duration: number;
  status: string;
  confidence: string;
  reasoning: string | null;
  is_ai_prediction: boolean;
  visible: boolean;
  ai_prediction_id: string | null;
  slot_kind: string | null;
  is_always_on: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeedRecentStreamRow {
  id: string;
  streamer_id: string;
  streamer_name: string;
  avatar_url: string | null;
  platform: string;
  title: string | null;
  category: string | null;
  started_at: string;
  ended_at: string;
  duration_minutes: number;
  peak_viewer_count: number | null;
  vod_url: string | null;
  thumbnail_url: string | null;
}

/** streamer_schedule_reliability row (M14, public read) — feed subset (M18 P2) */
export interface StreamerReliabilityRow {
  streamer_id: string;
  time_tier: string;
  median_start_deviation_minutes: number | null;
  time_hit_rate: number | null;
  time_sample: number;
}

/** stream_schedules row subset for withdrawn-segment cards (M17/M18 P2) */
export interface ScheduleChangeRow {
  id: string;
  streamer_id: string;
  title: string | null;
  category: string | null;
  scheduled_start_time: string;
  withdrawn_at: string;
}

export interface StreamClipRow {
  id: string;
  streamer_id: string;
  platform: string;
  external_clip_id: string;
  title: string | null;
  url: string;
  embed_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  view_count: number;
  category: string | null;
  clip_created_at: string;
  creator_name: string | null;
  fetched_at: string;
  is_visible: boolean;
}

export interface DiscoverRecommendationRow {
  streamer_id: string;
  name: string;
  platforms: string[];
  avatar_url: string | null;
  language: string | null;
  description: string | null;
  avg_view_count: number | null;
  is_always_on: boolean;
  twitch_login: string | null;
  youtube_channel_id: string | null;
  pool: string;
  score: number;
  reason: string;
  reason_category: string | null;
  reason_category_favorites: number;
  top_category: string | null;
  cat_affinity: number;
  lang_match: number;
  time_overlap: number;
  activity: number;
  pop_prior: number;
  explore: number;
}

export interface TrendingCategoryRow {
  category: string;
  streamers_current: number;
  streamers_previous: number;
  delta_percent: number;
}

export interface UserInterestProfileRow {
  category_affinity: Record<string, number> | null;
  languages: string[] | null;
  active_hours: number[] | null;
  size_prior: number | null;
  favorites_count: number | null;
  has_explicit_interests: boolean | null;
  is_derived_from_seed_only: boolean | null;
  computed_at: string | null;
}

export interface PredictionFunFactRow {
  streamer_id: string;
  predicted_start_time: string;
  actual_start_time: string;
  evaluated_at: string | null;
}
