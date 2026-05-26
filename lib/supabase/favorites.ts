import type { SupabaseClient } from '@supabase/supabase-js';
import type { Platform } from '@/lib/server/partner-api';

export interface FavoriteStreamerRow {
  id: string;
  name: string;
  platforms: Platform[];
  avatar_url: string | null;
  is_featured: boolean;
  is_always_on: boolean;
  favorited_at: string;
}

/**
 * Returns the set of streamer_ids the current authenticated user has
 * favorited. RLS filters to the current user automatically — no user_id
 * predicate needed. Returns an empty array if unauthenticated or on error.
 */
export async function listFavoriteIds(
  supabase: SupabaseClient,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_favorites')
    .select('streamer_id');
  if (error) {
    console.error('[favorites] listFavoriteIds failed:', error.message);
    return [];
  }
  return data.map((r) => r.streamer_id as string);
}

/**
 * Inserts a row into user_favorites for the current user. Silently treats the
 * UNIQUE constraint violation (PostgreSQL 23505) as success — making the
 * operation idempotent. Throws on any other error.
 */
export async function addFavorite(
  supabase: SupabaseClient,
  streamerId: string,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('user_favorites')
    .insert({ user_id: user.id, streamer_id: streamerId });
  if (error && error.code !== '23505') {
    throw error;
  }
}

/**
 * Removes a user's favorite row. Idempotent — a missing row is not an error.
 */
export async function removeFavorite(
  supabase: SupabaseClient,
  streamerId: string,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('user_favorites')
    .delete()
    .eq('user_id', user.id)
    .eq('streamer_id', streamerId);
  if (error) throw error;
}

interface JoinedFavoriteRow {
  streamer_id: string;
  created_at: string;
  streamers: {
    id: string;
    name: string;
    platforms: string[] | null;
    avatar_url: string | null;
    is_featured: boolean | null;
    is_always_on: boolean | null;
  };
}

/**
 * Returns the current user's favorited streamers, joined with the streamers
 * table for display. Filters to `approved = true` so removed/pending streamers
 * never surface on the /favorites page. Ordered by most-recently-favorited
 * first.
 */
export async function listFavoriteStreamers(
  supabase: SupabaseClient,
): Promise<FavoriteStreamerRow[]> {
  const { data, error } = await supabase
    .from('user_favorites')
    .select(
      'streamer_id, created_at, streamers!inner(id, name, platforms, avatar_url, is_featured, is_always_on, approved)',
    )
    .eq('streamers.approved', true)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[favorites] listFavoriteStreamers failed:', error.message);
    return [];
  }
  return (data as unknown as JoinedFavoriteRow[]).map((row) => ({
    id: row.streamers.id,
    name: row.streamers.name,
    platforms: (row.streamers.platforms ?? []) as Platform[],
    avatar_url: row.streamers.avatar_url ?? null,
    is_featured: row.streamers.is_featured === true,
    is_always_on: row.streamers.is_always_on === true,
    favorited_at: row.created_at,
  }));
}
