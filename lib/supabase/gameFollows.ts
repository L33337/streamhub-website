// "Follow this game" service (game-hub UX round 2026-07-23). Same pattern as
// favorites.ts: takes a SupabaseClient (server or browser), RLS scopes every
// query to the current user (user_game_follows, migration 20260723130500).

import type { SupabaseClient } from '@supabase/supabase-js';

export interface GameFollowRow {
  category: string;
  followed_at: string;
}

/**
 * The current user's followed games, most recently followed first. Empty when
 * signed out or on error.
 */
export async function listGameFollows(
  supabase: SupabaseClient,
): Promise<GameFollowRow[]> {
  const { data, error } = await supabase
    .from('user_game_follows')
    .select('category, created_at')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[gameFollows] listGameFollows failed:', error.message);
    return [];
  }
  return data.map((r) => ({
    category: r.category as string,
    followed_at: r.created_at as string,
  }));
}

/** Whether the current user follows `category`. False when signed out / error. */
export async function isGameFollowed(
  supabase: SupabaseClient,
  category: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_game_follows')
    .select('category')
    .eq('category', category)
    .limit(1);
  if (error) {
    console.error('[gameFollows] isGameFollowed failed:', error.message);
    return false;
  }
  return data.length > 0;
}

/**
 * Follows a game for the current user. Idempotent — the PK violation
 * (PostgreSQL 23505) counts as success. Throws on any other error.
 */
export async function followGame(
  supabase: SupabaseClient,
  category: string,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('user_game_follows')
    .insert({ user_id: user.id, category });
  if (error && error.code !== '23505') {
    throw error;
  }
}

/** Unfollows a game. Idempotent — a missing row is not an error. */
export async function unfollowGame(
  supabase: SupabaseClient,
  category: string,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('user_game_follows')
    .delete()
    .eq('user_id', user.id)
    .eq('category', category);
  if (error) throw error;
}
