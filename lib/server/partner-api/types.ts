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
  reasoning?: string;
}

// A game/category that qualifies for a hub page (>= 3 active streamers).
// Returned by GET /v1/games; `category` is the canonical category name.
export interface PublicGame {
  category: string;
  streamer_count: number;
}

// Mirror of supabase/functions/_shared/partner-dto.ts `PublicStreamHistory`.
// A finished stream (VOD) from a streamer's broadcast history — feed item for
// `/v1/streamers/{id}/history`, newest-first. Fields may be null when the
// source platform did not provide them (Twitch VODs carry no `category`;
// `thumbnail_url` is briefly null while a VOD is still processing).
export interface PublicStreamHistory {
  id: string;
  streamer_id: string;
  platform: Platform;
  title: string | null;
  category: string | null;
  thumbnail_url: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  vod_url: string | null;
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
