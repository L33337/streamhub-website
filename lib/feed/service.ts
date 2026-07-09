// Feed data access (M16) — port of the app's feedService.ts +
// streamSlotService.ts (M13). All functions take a SupabaseClient (server or
// browser, favorites.ts pattern) so the same code serves the initial server
// render and client-side refreshes. All personalization heavy-lifting runs
// server-side (RPCs backed by the nightly streamer_feed_stats cache) — this
// module only maps rows; composition and ranking glue live in loadFeed.ts.

import type { SupabaseClient } from '@supabase/supabase-js';
import { MAX_STREAMER_IDS } from './constants';
import type {
  StreamSlot,
  StreamSlotRow,
  FeedRecentStream,
  FeedRecentStreamRow,
  FeedClip,
  StreamClipRow,
  DiscoverRecommendation,
  DiscoverRecommendationRow,
  TrendingCategory,
  TrendingCategoryRow,
  UserInterestProfile,
  UserInterestProfileRow,
  PredictionFunFact,
  PredictionFunFactRow,
  StreamerReliability,
  StreamerReliabilityRow,
  ScheduleChange,
  ScheduleChangeRow,
  FeedFunFact,
  StreamerBreak,
  DiscoverStats,
  NewStreamerCandidate,
} from './types';
import {
  transformStreamSlot,
  transformFeedRecentStream,
  transformFeedClip,
  transformDiscoverRecommendation,
  transformTrendingCategory,
  transformUserInterestProfile,
  transformStreamerReliability,
  transformScheduleChange,
} from './transforms';
import { pickBestFunFact } from './logic';

/**
 * Stream slots of the given streamers, with a 2-day date floor to avoid
 * loading stale offline slots. Intentionally NOT capped at 100 ids (app
 * parity — favorites can exceed the RPC cap without losing schedule data).
 */
export async function fetchStreamSlots(
  supabase: SupabaseClient,
  streamerIds: string[],
): Promise<StreamSlot[]> {
  if (streamerIds.length === 0) return [];

  const floor = new Date();
  floor.setDate(floor.getDate() - 2);
  floor.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('stream_slots')
    .select('*')
    .eq('visible', true)
    .gte('start_time', floor.toISOString())
    .in('streamer_id', streamerIds)
    .order('start_time')
    .limit(2000);

  if (error) {
    throw new Error(`Failed to fetch stream slots: ${error.message}`);
  }

  return ((data ?? []) as StreamSlotRow[]).map(transformStreamSlot);
}

/**
 * Live slots of featured streamers the user has NOT favorited — appended to
 * the Live Now rail with a FEATURED badge. Deviation from the app: hidden
 * streamers (streamers.is_hidden) are excluded — they are test/removed
 * accounts kept off the public website.
 */
export async function fetchLiveFeaturedSlots(
  supabase: SupabaseClient,
  excludeStreamerIds: Set<string>,
): Promise<StreamSlot[]> {
  const { data: featured, error: streamersError } = await supabase
    .from('streamers')
    .select('id')
    .eq('is_featured', true)
    .eq('approved', true)
    .eq('is_hidden', false);

  if (streamersError) {
    throw new Error(`Failed to fetch featured streamers: ${streamersError.message}`);
  }

  const candidateIds = ((featured ?? []) as { id: string }[])
    .map((row) => row.id)
    .filter((id) => !excludeStreamerIds.has(id));

  if (candidateIds.length === 0) return [];

  const { data, error } = await supabase
    .from('stream_slots')
    .select('*')
    .in('streamer_id', candidateIds.slice(0, MAX_STREAMER_IDS))
    .eq('visible', true)
    .eq('status', 'live')
    .order('start_time')
    .limit(20);

  if (error) {
    throw new Error(`Failed to fetch live featured slots: ${error.message}`);
  }

  return ((data ?? []) as StreamSlotRow[]).map(transformStreamSlot);
}

/**
 * Recently ended streams for "New for you". vod/stream_slot dedupe happens
 * server-side (fetch_feed_recent_streams RPC; clamps: 100 ids, 7-day window,
 * limit 1-25).
 */
export async function fetchRecentStreams(
  supabase: SupabaseClient,
  streamerIds: string[],
  since: Date,
  limit = 10,
): Promise<FeedRecentStream[]> {
  if (streamerIds.length === 0) return [];

  const { data, error } = await supabase.rpc('fetch_feed_recent_streams', {
    p_streamer_ids: streamerIds.slice(0, MAX_STREAMER_IDS),
    p_since: since.toISOString(),
    p_limit: limit,
  });

  if (error) {
    throw new Error(`Failed to fetch recent streams: ${error.message}`);
  }

  return ((data ?? []) as FeedRecentStreamRow[]).map(transformFeedRecentStream);
}

/**
 * Twitch clips of the given streamers for the Highlights rail. Fetches a
 * generous window; ranking + per-streamer capping happen in loadFeed
 * (rankClips). RLS restricts to is_visible = true rows.
 */
export async function fetchClipsForStreamers(
  supabase: SupabaseClient,
  streamerIds: string[],
  sinceDays = 7,
  limit = 40,
): Promise<FeedClip[]> {
  if (streamerIds.length === 0) return [];

  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('stream_clips')
    .select('*')
    .in('streamer_id', streamerIds.slice(0, MAX_STREAMER_IDS))
    .gte('clip_created_at', since.toISOString())
    .order('view_count', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch clips: ${error.message}`);
  }

  return ((data ?? []) as StreamClipRow[]).map(transformFeedClip);
}

/**
 * Interest profile of the current user. SECURITY INVOKER RPC over auth.uid()
 * — must be called with the user's session (server client with cookies, or
 * browser client). Returns the empty-profile default when signed out.
 */
export async function fetchInterestProfile(
  supabase: SupabaseClient,
): Promise<UserInterestProfile> {
  const { data, error } = await supabase.rpc('compute_user_interest_profile');

  if (error) {
    throw new Error(`Failed to compute interest profile: ${error.message}`);
  }

  return transformUserInterestProfile((data ?? {}) as UserInterestProfileRow);
}

/**
 * Scored Discover candidates. The profile goes back to the RPC as raw jsonb
 * — snake_case fields, exactly as compute_user_interest_profile returned
 * them, which is why the raw payload is re-assembled here.
 */
export async function fetchDiscoverRecommendations(
  supabase: SupabaseClient,
  profile: UserInterestProfile,
  limit = 12,
): Promise<DiscoverRecommendation[]> {
  const rawProfile = {
    category_affinity: profile.categoryAffinity,
    languages: profile.languages,
    active_hours: profile.activeHours,
    size_prior: profile.sizePrior,
    favorites_count: profile.favoritesCount,
    has_explicit_interests: profile.hasExplicitInterests,
    is_derived_from_seed_only: profile.isDerivedFromSeedOnly,
    computed_at: profile.computedAt,
  };

  const { data, error } = await supabase.rpc('recommend_featured_streamers', {
    p_profile: rawProfile,
    p_limit: limit,
  });

  if (error) {
    throw new Error(`Failed to fetch recommendations: ${error.message}`);
  }

  return ((data ?? []) as DiscoverRecommendationRow[]).map(transformDiscoverRecommendation);
}

/** Week-over-week trending categories (info card + chips supplement). */
export async function fetchTrendingCategories(
  supabase: SupabaseClient,
  limit = 5,
): Promise<TrendingCategory[]> {
  const { data, error } = await supabase.rpc('fetch_trending_categories', {
    p_limit: limit,
  });

  if (error) {
    throw new Error(`Failed to fetch trending categories: ${error.message}`);
  }

  return ((data ?? []) as TrendingCategoryRow[]).map(transformTrendingCategory);
}

/**
 * Best recent prediction hit among the user's favorites ("Our AI predicted
 * X's stream within N minutes"). Returns null when no evaluated prediction
 * from the last 7 days qualifies.
 */
export async function fetchPredictionFunFact(
  supabase: SupabaseClient,
  streamerIds: string[],
): Promise<PredictionFunFact | null> {
  if (streamerIds.length === 0) return null;

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('ai_predictions')
    .select('streamer_id, predicted_start_time, actual_start_time, evaluated_at')
    .in('streamer_id', streamerIds.slice(0, MAX_STREAMER_IDS))
    .eq('was_accurate', true)
    .not('actual_start_time', 'is', null)
    .gte('evaluated_at', since.toISOString())
    .order('evaluated_at', { ascending: false })
    .limit(25);

  if (error) {
    throw new Error(`Failed to fetch prediction fun fact: ${error.message}`);
  }

  return pickBestFunFact((data ?? []) as PredictionFunFactRow[]);
}

/**
 * The hidden subset of the given streamer ids (streamers.is_hidden = true).
 * Used by loadFeed to keep test/removed streamers out of every section.
 */
export async function fetchHiddenStreamerIds(
  supabase: SupabaseClient,
  streamerIds: string[],
): Promise<Set<string>> {
  if (streamerIds.length === 0) return new Set();

  const { data, error } = await supabase
    .from('streamers')
    .select('id')
    .in('id', streamerIds)
    .eq('is_hidden', true);

  if (error) {
    throw new Error(`Failed to fetch hidden streamers: ${error.message}`);
  }

  return new Set(((data ?? []) as { id: string }[]).map((row) => row.id));
}

/**
 * Category options for the interest picker: the actively-streamed categories
 * (partner_games view — 28d window), largest first.
 */
export async function fetchCategoryOptions(
  supabase: SupabaseClient,
  limit = 30,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('partner_games')
    .select('category, streamer_count')
    .order('streamer_count', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch category options: ${error.message}`);
  }

  return ((data ?? []) as { category: string }[]).map((row) => row.category);
}

/**
 * Announced-schedule adherence tiers for the given streamers (M18 Phase 2).
 * Rows with tier 'unknown' are dropped — nothing to show during cold start.
 */
export async function fetchScheduleReliability(
  supabase: SupabaseClient,
  streamerIds: string[],
): Promise<StreamerReliability[]> {
  if (streamerIds.length === 0) return [];

  const { data, error } = await supabase
    .from('streamer_schedule_reliability')
    .select('streamer_id, time_tier, median_start_deviation_minutes, time_hit_rate, time_sample')
    .in('streamer_id', streamerIds.slice(0, MAX_STREAMER_IDS))
    .neq('time_tier', 'unknown');

  if (error) {
    throw new Error(`Failed to fetch schedule reliability: ${error.message}`);
  }

  return ((data ?? []) as StreamerReliabilityRow[]).map(transformStreamerReliability);
}

/**
 * Recently withdrawn future announced segments of the given streamers
 * (M17 soft-withdraw → M18 Phase 2 "schedule change" cards).
 */
export async function fetchRecentScheduleChanges(
  supabase: SupabaseClient,
  streamerIds: string[],
  sinceHours = 48,
  limit = 6,
): Promise<ScheduleChange[]> {
  if (streamerIds.length === 0) return [];

  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('stream_schedules')
    .select('id, streamer_id, title, category, scheduled_start_time, withdrawn_at')
    .in('streamer_id', streamerIds.slice(0, MAX_STREAMER_IDS))
    .not('withdrawn_at', 'is', null)
    .gte('withdrawn_at', since.toISOString())
    .gt('scheduled_start_time', new Date().toISOString())
    .order('withdrawn_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch schedule changes: ${error.message}`);
  }

  return ((data ?? []) as ScheduleChangeRow[]).map(transformScheduleChange);
}

/**
 * Recent sanitized transcript fun facts of the given streamers
 * (feed_fun_facts projection, M18 Phase 2B).
 */
export async function fetchFanMoments(
  supabase: SupabaseClient,
  streamerIds: string[],
  sinceDays = 7,
  limit = 6,
): Promise<FeedFunFact[]> {
  if (streamerIds.length === 0) return [];

  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('feed_fun_facts')
    .select('id, streamer_id, fact_text, created_at')
    .in('streamer_id', streamerIds.slice(0, MAX_STREAMER_IDS))
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch fan moments: ${error.message}`);
  }

  return (
    (data ?? []) as { id: string; streamer_id: string; fact_text: string; created_at: string }[]
  ).map((row) => ({
    id: row.id,
    streamerId: row.streamer_id,
    factText: row.fact_text,
    createdAt: row.created_at,
  }));
}

/** Favorites currently on an announced Twitch vacation (M18 Phase 2B). */
export async function fetchStreamerBreaks(
  supabase: SupabaseClient,
  streamerIds: string[],
): Promise<StreamerBreak[]> {
  if (streamerIds.length === 0) return [];

  const { data, error } = await supabase
    .from('streamers')
    .select('id, vacation_until')
    .in('id', streamerIds.slice(0, MAX_STREAMER_IDS))
    .gt('vacation_until', new Date().toISOString());

  if (error) {
    throw new Error(`Failed to fetch streamer breaks: ${error.message}`);
  }

  return ((data ?? []) as { id: string; vacation_until: string }[]).map((row) => ({
    streamerId: row.id,
    vacationUntil: row.vacation_until,
  }));
}

/**
 * At-a-glance stats for Discover cards (M18 Phase 2B): follower count from
 * streamers + 28d stream count from the nightly feed-stats cache.
 */
export async function fetchDiscoverStats(
  supabase: SupabaseClient,
  streamerIds: string[],
): Promise<DiscoverStats[]> {
  if (streamerIds.length === 0) return [];

  const ids = streamerIds.slice(0, MAX_STREAMER_IDS);
  const [streamersResult, statsResult] = await Promise.all([
    supabase.from('streamers').select('id, follower_count').in('id', ids),
    supabase.from('streamer_feed_stats').select('streamer_id, streams_28d').in('streamer_id', ids),
  ]);

  if (streamersResult.error) {
    throw new Error(`Failed to fetch discover stats: ${streamersResult.error.message}`);
  }

  const streamsMap = new Map<string, number>();
  if (!statsResult.error) {
    ((statsResult.data ?? []) as { streamer_id: string; streams_28d: number | null }[]).forEach(
      (row) => {
        if (row.streams_28d !== null) streamsMap.set(row.streamer_id, row.streams_28d);
      },
    );
  }

  return ((streamersResult.data ?? []) as { id: string; follower_count: number | null }[]).map(
    (row) => ({
      streamerId: row.id,
      followerCount: row.follower_count,
      streams28d: streamsMap.get(row.id) ?? null,
    }),
  );
}

// ============================================
// M18 Phase 2C — M13-backlog card data
// ============================================

/**
 * Recently added, approved streamers (announcement card, M18 P2C).
 * Top category resolved from the nightly feed-stats cache when present.
 */
export async function fetchNewStreamers(
  supabase: SupabaseClient,
  sinceDays = 14,
  limit = 10,
): Promise<NewStreamerCandidate[]> {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('streamers')
    .select('id, name, platforms, created_at')
    .eq('approved', true)
    .eq('is_hidden', false)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch new streamers: ${error.message}`);
  }

  const rows = (data ?? []) as {
    id: string;
    name: string;
    platforms: string[];
    created_at: string;
  }[];
  if (rows.length === 0) return [];

  const categoryMap = new Map<string, string>();
  const { data: statsData } = await supabase
    .from('streamer_feed_stats')
    .select('streamer_id, category_shares')
    .in(
      'streamer_id',
      rows.map((row) => row.id),
    );
  (
    (statsData ?? []) as { streamer_id: string; category_shares: Record<string, number> | null }[]
  ).forEach((stat) => {
    if (!stat.category_shares) return;
    const top = Object.entries(stat.category_shares).sort(([, a], [, b]) => b - a)[0];
    if (top) categoryMap.set(stat.streamer_id, top[0]);
  });

  return rows.map((row) => ({
    streamerId: row.id,
    name: row.name,
    platforms: row.platforms ?? [],
    createdAt: row.created_at,
    topCategory: categoryMap.get(row.id) ?? null,
  }));
}

/**
 * Favorites' live time of the last 7 days (weekly recap card, M18 P2C).
 * source='stream_slot' rows only — vod rows can duplicate the same stream.
 */
export async function fetchWeeklyActivity(
  supabase: SupabaseClient,
  streamerIds: string[],
): Promise<Array<{ durationMinutes: number | null; category: string | null }>> {
  if (streamerIds.length === 0) return [];

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('stream_history')
    .select('duration_minutes, category')
    .in('streamer_id', streamerIds.slice(0, MAX_STREAMER_IDS))
    .eq('source', 'stream_slot')
    .gte('ended_at', since.toISOString())
    .limit(500);

  if (error) {
    throw new Error(`Failed to fetch weekly activity: ${error.message}`);
  }

  return ((data ?? []) as { duration_minutes: number | null; category: string | null }[]).map(
    (row) => ({ durationMinutes: row.duration_minutes, category: row.category }),
  );
}

/**
 * Hour histograms (UTC bins) for the given streamers — powers the
 * "you might have missed" unusual-start detection (M18 P2C).
 */
export async function fetchHourHistograms(
  supabase: SupabaseClient,
  streamerIds: string[],
): Promise<Map<string, number[]>> {
  const map = new Map<string, number[]>();
  if (streamerIds.length === 0) return map;

  const { data, error } = await supabase
    .from('streamer_feed_stats')
    .select('streamer_id, hour_histogram')
    .in('streamer_id', streamerIds.slice(0, MAX_STREAMER_IDS));

  if (error) {
    throw new Error(`Failed to fetch hour histograms: ${error.message}`);
  }

  ((data ?? []) as { streamer_id: string; hour_histogram: number[] | null }[]).forEach((row) => {
    if (Array.isArray(row.hour_histogram)) map.set(row.streamer_id, row.hour_histogram);
  });
  return map;
}

/**
 * 90-day peak-viewer history for the given (few) streamers — powers the
 * milestone record card (M18 P2C). Callers pass the recently-active subset,
 * never the whole favorites roster.
 */
export async function fetchPeakHistory(
  supabase: SupabaseClient,
  streamerIds: string[],
  sinceDays = 90,
): Promise<Array<{ streamerId: string; peakViewerCount: number | null; endedAt: string }>> {
  if (streamerIds.length === 0) return [];

  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('stream_history')
    .select('streamer_id, peak_viewer_count, ended_at')
    .in('streamer_id', streamerIds.slice(0, 10))
    .eq('source', 'stream_slot')
    .gte('ended_at', since.toISOString())
    .order('ended_at', { ascending: false })
    .limit(400);

  if (error) {
    throw new Error(`Failed to fetch peak history: ${error.message}`);
  }

  return (
    (data ?? []) as { streamer_id: string; peak_viewer_count: number | null; ended_at: string }[]
  ).map((row) => ({
    streamerId: row.streamer_id,
    peakViewerCount: row.peak_viewer_count,
    endedAt: row.ended_at,
  }));
}
