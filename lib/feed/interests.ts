// Explicit user interests CRUD (M16) — port of the app's
// userInterestsService.ts (M13, user_interests table). The picker replaces
// the full set on save; the interest profile blends these 60/40 with the
// favorites-derived affinity server-side.

import type { SupabaseClient } from '@supabase/supabase-js';

/** The user's explicitly picked interest categories, alphabetical. */
export async function fetchUserInterests(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_interests')
    .select('category')
    .eq('user_id', userId)
    .order('category');

  if (error) {
    throw new Error(`Failed to fetch interests: ${error.message}`);
  }

  return ((data ?? []) as { category: string }[]).map((row) => row.category);
}

/**
 * Replace the user's interest set with the given categories. Diff-based:
 * deletes removed rows, inserts added ones — keeps created_at of unchanged
 * picks intact (the table has no UPDATE policy).
 */
export async function saveUserInterests(
  supabase: SupabaseClient,
  userId: string,
  categories: string[],
): Promise<void> {
  const next = new Set(categories.map((c) => c.trim()).filter((c) => c.length > 0));
  const current = new Set(await fetchUserInterests(supabase, userId));

  const toDelete = Array.from(current).filter((c) => !next.has(c));
  const toInsert = Array.from(next).filter((c) => !current.has(c));

  if (toDelete.length > 0) {
    const { error } = await supabase
      .from('user_interests')
      .delete()
      .eq('user_id', userId)
      .in('category', toDelete);
    if (error) {
      throw new Error(`Failed to remove interests: ${error.message}`);
    }
  }

  if (toInsert.length > 0) {
    const { error } = await supabase
      .from('user_interests')
      .insert(toInsert.map((category) => ({ user_id: userId, category })));
    if (error) {
      throw new Error(`Failed to save interests: ${error.message}`);
    }
  }
}
