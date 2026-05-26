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
  updated_at: string;
  // External channel identifiers — populated only when the corresponding
  // platform is in `platforms`. Use to build canonical watch URLs.
  twitch_login: string | null;
  youtube_channel_id: string | null;
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
  reasoning?: string;
}

export interface PaginationInfo {
  next_cursor: string | null;
  has_more: boolean;
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
