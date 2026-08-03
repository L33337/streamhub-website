// Personalized feed types (M16) — port of the mobile app's M13 Home Feed
// types (StreamHub: src/types/index.ts + src/services/types.ts). App models
// are camelCase; Row interfaces mirror the Supabase rows / RPC outputs
// (snake_case) and are mapped in transforms.ts.

import type { Platform } from '@/lib/server/partner-api';
// Parsed fact payloads of the feed_quick_facts() RPC. Defined next to their
// parsers rather than here; no cycle — quick-facts.ts does not import types.ts.
import type { FeedQuickFacts } from './quick-facts';

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
  /** M22 P3: ISO-639-1 language of the reasoning copy (undefined pre-M22). */
  copyLanguage?: string;
  /** M22 P3: always-English template reasoning — fallback for foreign copy. */
  genericReasoning?: string;
  isAiPrediction: boolean;
  visible: boolean;
  aiPredictionId?: string;
  slotKind: SlotKind;
  /** Streak demotion: streamer missed 2+ consecutive scored predictions. */
  isUncertain: boolean;
  isAlwaysOn: boolean;
  /** Live concurrent viewers — only meaningful while live and fresh (<25 min). */
  viewerCount?: number;
  viewerCountUpdatedAt?: string;
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

// 2026-08-03: one stream_history row of a favorite, as read for the week
// leaderboard. Extends the homepage's interval shape (streamer_id/started_at/
// ended_at) with the two columns the leaderboard needs on top of the union:
// the per-row category and its billed minutes.
export interface FavoriteWeekHistoryRow {
  streamer_id: string;
  started_at: string;
  ended_at: string | null;
  category: string | null;
  duration_minutes: number | null;
}

// 2026-08-03: one row of "Who streamed most this week".
export interface WeekLeaderboardEntry {
  streamerId: string;
  name: string;
  hours: number;
  sessions: number;
  topCategory: string | null;
}

// M18 Phase 5: regular YouTube upload (youtube_uploads, WebSub capture)
export interface YouTubeUpload {
  id: string;
  streamerId: string;
  videoId: string;
  title: string | null;
  url: string;
  thumbnailUrl?: string;
  publishedAt: string; // ISO 8601
}

// M18 Phase 5: Twitch top-games cache row ("Big on Twitch right now")
export interface TrendingGame {
  rank: number;
  gameId: string;
  gameName: string;
  boxArtUrl?: string;
}

// M18 Phase 4: nightly per-user feed_events aggregation (feed_engagement_stats)
export interface FeedEngagementStats {
  /** category → positive-interaction count (28d) */
  categoryEngagement: Record<string, number>;
  /** streamer ids the user dismissed in the last 60d */
  dismissedStreamers: string[];
  /** categories the user dismissed in the last 60d */
  dismissedCategories: string[];
}

// M18 Phase 2C: recently added streamer (announcement card candidate)
export interface NewStreamerCandidate {
  streamerId: string;
  name: string;
  platforms: string[];
  createdAt: string;
  topCategory: string | null;
}

// 'scroll_depth' + item_type 'section' added in M18 Phase 0
// (app migration 20260709120000_feed_events_phase0.sql — keep in sync).
// 'clip_play_start'/'clip_play_end' + duration_seconds added in M18 Phase 1
// (app migration 20260709130000_feed_events_clip_play.sql).
// 'load_more' added in M18 Phase 3 (20260709180000).
// zap_* added in M18 Phase 6 (20260710140000).
export type FeedEventType =
  | 'impression'
  | 'tap'
  | 'watch_tap'
  | 'favorite_from_feed'
  | 'clip_open'
  | 'dismiss'
  | 'scroll_depth'
  | 'clip_play_start'
  | 'clip_play_end'
  | 'load_more'
  | 'zap_enter'
  | 'zap_channel_view'
  | 'zap_exit'
  | 'story_open'
  | 'story_advance'
  | 'story_complete';

/**
 * `'discover'` is KEPT although the website's Discover section was replaced by
 * the Streamer Wiki on 2026-08-03: feed_events carries a CHECK constraint over
 * this vocabulary, the mobile app still emits it, and the historical rows must
 * stay readable. Retiring the member is a cross-repo migration, not a cleanup.
 */
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

export type FeedSectionKey = 'slots' | 'recent' | 'clips' | 'trending';

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
  /** M18 P2C: recently added streamers (announcement card candidates) */
  newStreamers: NewStreamerCandidate[];
  /** M18 P2C: Monday (UTC) recap of the favorites' week */
  weeklyRecap: { totalHours: number; streams: number; topCategory: string | null } | null;
  /** M18 P2C: recent stream that started far off the streamer's usual hour */
  missedStream: FeedRecentStream | null;
  /** M18 P2C: fresh 90-day peak-viewer record among recently active favorites */
  peakRecord: { streamerId: string; peak: number } | null;
  /** M18 P3: lower-ranked clips that did not make the Highlights rail */
  moreClips: FeedClip[];
  /** M18 P5: recent regular YouTube uploads of favorites ("New videos" rail) */
  uploads: YouTubeUpload[];
  /** M18 P5: Twitch top-games cache ("Big on Twitch right now" rail) */
  trendingGames: TrendingGame[];
  /** 2026-08-03: the favorites' most-streamed of the last 7 days (top 3). */
  weekLeaderboard: WeekLeaderboardEntry[];
  /** 2026-08-03: "Your favorites in numbers" — feed_quick_facts() payloads. */
  quickFacts: FeedQuickFacts | null;
  chipCategories: string[];
  sectionErrors: Partial<Record<FeedSectionKey, string>>;
  avatarMap: Record<string, string>;
  nameMap: Record<string, string>;
}

/**
 * The minute-to-minute-volatile subset of FeedData (Live Now / Up Next / New
 * for you) produced by loadVolatileFeed(). The auto-refresh merges this into
 * the existing feed instead of re-running the whole loadFeed — the remaining
 * sections are nightly/6h/weekly caches. avatarMap/nameMap are the entries for
 * these sections only (merged over the previous maps on the client).
 */
export interface VolatileFeed {
  liveNow: HomeLiveEntry[];
  upNext: StreamSlot[];
  recent: FeedRecentStream[];
  avatarMap: Record<string, string>;
  nameMap: Record<string, string>;
  sectionErrors: Partial<Record<FeedSectionKey, string>>;
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
  copy_language: string | null;
  generic_reasoning: string | null;
  is_ai_prediction: boolean;
  visible: boolean;
  ai_prediction_id: string | null;
  slot_kind: string | null;
  is_uncertain: boolean | null;
  is_always_on: boolean;
  viewer_count: number | null;
  viewer_count_updated_at: string | null;
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
