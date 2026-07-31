// Public DTO mirror of supabase/functions/_shared/partner-dto.ts in the
// StreamHub repo. Kept hand-written until the OpenAPI codegen lands in
// Milestone 12 Story 7.

export type Platform = 'twitch' | 'youtube';
export type SlotStatus = 'live' | 'upcoming' | 'offline';
export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface PublicStreamer {
  id: string;
  name: string;
  platforms: Platform[];
  avatar_url: string | null;
  is_featured: boolean;
  timezone: string | null;
  language: string | null;
  is_always_on: boolean;
  avg_view_count: number | null;
  // Total followers (Twitch) / subscribers (YouTube) of the primary channel,
  // refreshed daily by the backend. null while never fetched or when the
  // platform hides the count.
  follower_count: number | null;
  follower_count_updated_at: string | null;
  updated_at: string;
  // Last live↔offline transition (null if never changed). The sitemap uses
  // MAX(updated_at, last_status_change_at) as <lastmod>, since updated_at alone
  // misses live-status flips — the most frequent streamer-page content change.
  last_status_change_at: string | null;
  // External channel identifiers — populated only when the corresponding
  // platform is in `platforms`. Use to build canonical watch URLs.
  twitch_login: string | null;
  youtube_channel_id: string | null;
  // AI-generated 350-450 char description in the streamer's broadcaster_language
  // (English when language is null). Used in Person JSON-LD on the streamer page.
  // null while pending generation for streamers added before this field existed.
  description: string | null;
  // M22: English translation of `description` (null when the source is already
  // English, or while pending). English-locale rendering: description_en ?? description.
  // Optional in this mirror for deploy skew (old API, new site).
  description_en?: string | null;
  // Per-category watch stats — present ONLY on ?category= filtered list
  // responses, and only when the backend's nightly aggregate has data for the
  // (streamer, category) pair. Optional in this mirror for deploy skew.
  category_stats?: PublicStreamerCategoryStats;
}

// Mirror of supabase/functions/_shared/partner-streamers.ts `PublicCategoryStats`
// (rankings-page expansion). Attached to /v1/streamers rows under a category
// filter; feeds the Hours/Share columns + trend arrows on /rankings/game/*.
export interface PublicStreamerCategoryStats {
  streams_28d: number;
  hours_28d: number;
  peak_viewer_28d: number | null;
  /** 0-100: this category's share of the streamer's categorized streams. */
  share_percent: number;
  /** Follower rank in this category ~7 days ago; null during snapshot cold start or when newly ranked. */
  rank_7d_ago: number | null;
}

export interface PublicStreamSlot {
  id: string;
  streamer_id: string;
  streamer_name: string;
  platforms: Platform[];
  title: string;
  category: string | null;
  thumbnail_url: string | null;
  avatar_url: string | null;
  start_time: string;
  duration_minutes: number;
  status: SlotStatus;
  is_predicted: boolean;
  confidence: ConfidenceLevel;
  // M15 slot kind: 'regular' (usual day / every real slot), 'new' (prediction
  // on an unusual day), 'cancelled' (streamer announced NO stream at this
  // usually-regular time — render as a cancellation, no watch links).
  // Optional in this mirror for deploy skew (old API, new site) — treat
  // undefined like 'regular'.
  slot_kind?: 'regular' | 'new' | 'cancelled';
  is_always_on: boolean;
  // External channel identifiers — populated only when the corresponding
  // platform is in `platforms`. Build watch URLs:
  //   https://twitch.tv/{twitch_login}
  //   https://youtube.com/channel/{youtube_channel_id}
  twitch_login: string | null;
  youtube_channel_id: string | null;
  // Streamer's home timezone (IANA, e.g. "Europe/Berlin"); same value as
  // PublicStreamer.timezone. null while AI discovery hasn't determined it.
  streamer_timezone: string | null;
  // Broadcast language of the CHANNEL (Twitch broadcaster_language: ISO 639-1
  // plus Twitch's "other"/"asl"); same value as PublicStreamer.language. null
  // for channels that never reported one — notably YouTube-only streamers, so
  // language filters must treat null as "unknown", NOT as English. Distinct
  // from copy_language (the language of THIS ROW's AI copy).
  // Optional in this mirror for deploy skew (old API, new site).
  streamer_language?: string | null;
  // Live concurrent viewers. Non-null only on status='live' slots with a
  // fresh sample (<25 min); null = unknown/stale, never "zero viewers".
  // Optional in this mirror for deploy skew (old API, new site) — treat
  // undefined like null.
  viewer_count?: number | null;
  reasoning?: string;
  // M22: ISO 639-1 language of title/reasoning on predicted rows ('en' for
  // template-fallback copy). null on real slots and pre-M22 predictions.
  // Optional in this mirror for deploy skew (old API, new site).
  copy_language?: string | null;
  // M22: always-English template reasoning (Silver+ only, predicted rows) —
  // honest English fallback when copy_language ≠ 'en'.
  generic_reasoning?: string;
}

// A game/category that qualifies for a hub page (>= 3 active streamers).
// Returned by GET /v1/games; `category` is the canonical category name.
// All fields beyond category/streamer_count are additive enrichments
// (games-page expansion): optional in this mirror for deploy skew (old API,
// new site) — treat undefined like null.
export interface PublicGame {
  category: string;
  streamer_count: number;
  // Twitch box art (285x380); null while unresolved / non-Twitch categories.
  box_art_url?: string | null;
  twitch_game_id?: string | null;
  // Request-time live numbers.
  live_streamer_count?: number;
  live_viewer_total?: number | null;
  // Nightly 28d aggregates (always-on excluded).
  streams_28d?: number | null;
  hours_28d?: number | null;
  peak_viewer_28d?: number | null;
  // Week-over-week trend (percent); null below the trend-cache threshold.
  trend_delta_percent?: number | null;
  // Up to 6 categories sharing >= 2 streamers with this one, strongest overlap
  // first (nightly aggregate). Powers the "Related rankings" links.
  related_categories?: { category: string; shared_streamers: number }[] | null;
  // Up to 3 most-followed streamers of the category (nightly aggregate, hidden
  // excluded), most followers first. Powers the hub-card name line and the
  // game OG-image subtitle; never an empty array (null instead).
  top_streamers?: { id: string; name: string; followers: number | null }[] | null;
  // Present ONLY when requested via include=hour_histogram: minutes streamed
  // per UTC weekday-hour cell over 28d (168 ints, index = weekday*24+hour,
  // weekday 0 = Monday). Null while the nightly aggregate warms up.
  hour_histogram?: number[] | null;
  // Present ONLY when requested via include=timing (M24): viewer-demand vs
  // streamer-competition stats. Null while the nightly aggregate warms up.
  timing?: GameTiming | null;
}

// ============================================
// M24 timing insights (mirrors _shared/partner-games.ts + partner-insights.ts)
// ============================================
// Every field optional for deploy skew (old API, new site) — treat undefined
// like null. Series cells are null for "not observed" — NEVER coerce to 0.

/** One recommended weekday-hour cell. dow/hour are UTC, dow 0 = Monday (ISO). */
export interface TimingBestSlot {
  dow: number;
  hour: number;
  /** Opportunity score = viewers / streamers in this cell. */
  score: number;
  viewers: number;
  streamers: number;
}

export interface GameTiming {
  // 168 cells, index = dow*24+hour (UTC, Monday=0); null cell = observed on
  // < 2 distinct days (sampling gap, not "0 viewers").
  viewers_histogram?: (number | null)[] | null;
  streamers_histogram?: (number | null)[] | null;
  days_histogram?: (number | null)[] | null;
  best_slots?: TimingBestSlot[] | null;
  // 12 cells: median CCV per hour-into-stream (cell 11 = >=12h); null below 5 samples.
  ramp_curve?: (number | null)[] | null;
  avg_viewers?: number | null;
  avg_streamers?: number | null;
  /** avg_viewers / avg_streamers — the /best-games-to-stream sort key. */
  overall_score?: number | null;
  tracked_streamers?: number;
  sample_count?: number;
  is_trending?: boolean;
}

/** One row of GET /v1/games/best-to-stream (already sorted by overall_score desc). */
export interface BestGameEntry {
  category: string;
  overall_score?: number;
  avg_viewers?: number | null;
  avg_streamers?: number | null;
  best_slot?: TimingBestSlot | null;
  tracked_streamers?: number;
  sample_count?: number;
  is_trending?: boolean;
  box_art_url?: string | null;
  twitch_game_id?: string | null;
}

/** One aggregation cell of the streamer insights: median CCV + sample count. */
export interface InsightsMedianCell {
  median: number | null;
  samples: number;
}

export interface InsightsCategoryEntry {
  category: string;
  median: number | null;
  samples: number;
  /** Observed streamed hours in this category (1 sample = 1 hour). */
  hours: number;
}

export interface InsightsGameToTry {
  category: string;
  overall_score: number;
  avg_viewers?: number | null;
  avg_streamers?: number | null;
  is_trending?: boolean;
}

export interface InsightsScheduleReliability {
  time_tier?: 'reliable' | 'medium' | 'unreliable' | 'unknown';
  time_hit_rate?: number | null;
  /** Signed minutes; positive = starts late. */
  median_start_deviation_minutes?: number | null;
  no_show_count?: number;
  sample?: number;
}

// Mirror of GET /v1/streamers/{id}/insights (M24). sample_count 0 = viewer
// data still collecting (all series null).
export interface StreamerInsights {
  streamer_id: string;
  window_days?: number;
  sample_count: number;
  timezone?: string | null;
  vacation_until?: string | null;
  overall_median?: number | null;
  main_category?: string | null;
  weekday_viewers?: InsightsMedianCell[] | null;
  hour_viewers?: InsightsMedianCell[] | null;
  category_viewers?: InsightsCategoryEntry[] | null;
  ramp_curve?: InsightsMedianCell[] | null;
  consistency_percentile?: number | null;
  follower_band?: string | null;
  ccv_percentile_in_size_band?: number | null;
  schedule_reliability?: InsightsScheduleReliability | null;
  games_to_try?: InsightsGameToTry[];
  refreshed_at?: string | null;
}

// One platform's recording of a session, as carried in `PublicStreamHistory.vods`.
export interface PublicStreamHistoryVod {
  platform: Platform;
  vod_url: string | null;
}

// Mirror of supabase/functions/_shared/partner-dto.ts `PublicStreamHistory`.
// ONE finished broadcast session — feed item for `/v1/streamers/{id}/history`,
// newest-first. A Twitch+YouTube simulcast is a single item listing both
// platforms, not two items. Fields may be null when the source platform did not
// provide them (Twitch VODs carry no `category`; `thumbnail_url` is briefly
// null while a VOD is still processing).
//
// `platforms` / `vods` are additive: optional in this mirror for deploy skew
// (old API, new site) — read them through `lib/history.ts`, which applies the
// legacy `platform` / `vod_url` fallback.
export interface PublicStreamHistory {
  // Primary platform's row id (Twitch when the session went out on Twitch).
  id: string;
  streamer_id: string;
  // Primary platform. The scalar fields below are its metadata, per-field
  // filled from the other platform when it has none. Prefer `platforms`.
  platform: Platform;
  platforms?: Platform[];
  title: string | null;
  category: string | null;
  thumbnail_url: string | null;
  // Span of the session across its platforms (earliest start, latest end).
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  vod_url: string | null;
  vods?: PublicStreamHistoryVod[];
}

export type StatsWeekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface PublicStreamerStatsWeekday {
  weekday: StatsWeekday;
  iso_dow: number; // 1=Mon .. 7=Sun
  occurrences: number;
  start: string; // "HH:MM", streamer-local
  end: string; // "HH:MM" = start + duration, may wrap past midnight
  duration_minutes: number; // median
}

export interface PublicStreamerStatsCategory {
  category: string;
  streams: number;
  share_percent: number; // integer 0-100, share of categorized streams
}

// Mirror of supabase/functions/_shared/partner-dto.ts `PublicStreamerStats`.
// Typical-streaming-times stats from `/v1/streamers/{id}/stats`: medians over
// the last `window_days` of broadcast history, with all "HH:MM" values already
// converted to the streamer's timezone (`timezone`, 'UTC' fallback applied
// server-side) — no client timezone math needed. `has_stats: false` (empty
// arrays, null scalars) when the streamer is always-on, has fewer than 5
// usable streams in the window, or has no history.
export interface PublicStreamerStats {
  streamer_id: string;
  has_stats: boolean;
  window_days: number;
  sample_size: number;
  source: 'vod' | 'stream_slot' | null;
  timezone: string;
  typical_start: string | null;
  typical_end: string | null;
  typical_duration_minutes: number | null;
  streams_per_week: number | null;
  active_days_per_week: number | null;
  // Total streamed hours in the window (1 decimal), on the same deduplicated
  // record source as sample_size.
  hours_streamed: number | null;
  // Highest sampled concurrent viewer count in the window (hourly sampling,
  // both platforms). null when never sampled.
  peak_viewer_count: number | null;
  weekdays: PublicStreamerStatsWeekday[];
  top_categories: PublicStreamerStatsCategory[];
}

// ============================================
// Rankings (GET /v1/rankings/{metric})
// ============================================

export type RankingMetric =
  | 'most-followed'
  | 'most-watched'
  | 'most-active'
  | 'most-reliable'
  | 'fastest-growing';

// Per-metric numbers of one leaderboard row. Superset shape — the key set
// depends on the requested metric (see the endpoint description in the
// Partner API OpenAPI spec); every field is optional so one type covers all
// five metrics.
export interface RankingValues {
  follower_count?: number;
  avg_view_count?: number;
  hours_streamed_28d?: number;
  streams_28d?: number;
  streams_per_week?: number;
  avg_stream_duration_minutes?: number | null;
  time_hit_rate?: number; // 0..1
  time_sample?: number;
  median_start_deviation_minutes?: number | null;
  no_show_count?: number;
  time_tier?: string;
  // fastest-growing: follower/subscriber gain vs a daily snapshot >= 7 days
  // old, and that gain as percent of the baseline (1 decimal, null without a
  // positive baseline). Both absent on every other metric.
  follower_gain_7d?: number;
  follower_growth_percent_7d?: number | null;
  // Rank ~7 days ago (daily snapshots >= 6d old). The key is absent entirely
  // while the backend's snapshot history warms up; null = newly ranked.
  previous_rank?: number | null;
}

export interface PublicRankingEntry {
  rank: number; // 1-based ABSOLUTE position; page 2 (offset=100) starts at 101
  values: RankingValues;
  streamer: PublicStreamer;
  // Streamer's main game over the last 28 days (most streamed hours).
  // Absent while unknown — aggregate cold start or uncategorized history.
  top_category?: { category: string; share_percent: number };
}

// Envelope of GET /v1/rankings/{metric}. `window_days` is the aggregation
// window (28/90) or null for most-followed; `refreshed_at` is the last nightly
// refresh of the underlying aggregate (null for the table-backed metrics).
export interface RankingsResponse {
  metric: RankingMetric;
  window_days: number | null;
  refreshed_at: string | null;
  data: PublicRankingEntry[];
  // Offset pagination. Optional so a response from an older API deployment
  // still type-checks; call sites fall back to the page-length behaviour.
  pagination?: RankingsPagination;
}

export interface RankingsPagination {
  offset: number;
  limit: number;
  // Exact pool size — the page count and the "#312 of 740" copy derive from it.
  total: number;
  has_more: boolean;
}

// ============================================
// Streamer rankings (GET /v1/streamers/{id}/rankings)
// ============================================

// One global leaderboard placement of a single streamer. Ranks here are exact
// and unbounded (not capped at the top 100 the leaderboard page shows).
export interface PublicRankingPlacement {
  metric: RankingMetric;
  rank: number;
  total: number; // denominator of "#7 of 236"
  value: number | null;
  window_days: number | null;
  // Rank ~7 days ago, or null when no honest baseline exists (cold start, or
  // the streamer sat outside the snapshot depth). null means "trend unknown" —
  // it must NOT be rendered as a "new entry" badge.
  previous_rank: number | null;
}

// Placement within one game category. The backend only returns categories that
// have a public page (>= 3 tracked streamers), so every entry is safe to link.
export interface PublicGamePlacement {
  category: string;
  rank: number;
  total: number;
  value: number | null;
  share_percent: number | null;
  previous_rank: number | null;
}

export interface PublicStreamerRankings {
  streamer_id: string;
  rankings: PublicRankingPlacement[];
  games: PublicGamePlacement[];
}

export interface PaginationInfo {
  next_cursor: string | null;
  has_more: boolean;
  /**
   * Exact total row count of the full filtered set. Only returned when the
   * request used `offset` (numbered-page pagination); null/absent otherwise.
   */
  total?: number | null;
}

export interface Paginated<T> {
  data: T[];
  pagination: PaginationInfo;
}

export interface PartnerApiErrorBody {
  error: string;
  error_description: string;
  request_id?: string;
}
