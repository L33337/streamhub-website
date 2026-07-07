// Feed analytics opt-out flag (M16) — user_feed_preferences table.
// Default is enabled (true) when no row exists. RLS: select/insert/update
// own row only.

import type { SupabaseClient } from '@supabase/supabase-js';

export async function getFeedAnalyticsEnabled(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_feed_preferences')
    .select('analytics_enabled')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data || typeof data.analytics_enabled !== 'boolean') {
    // Missing row or read failure — analytics defaults to on (app parity).
    return true;
  }
  return data.analytics_enabled;
}

export async function setFeedAnalyticsEnabled(
  supabase: SupabaseClient,
  userId: string,
  enabled: boolean,
): Promise<void> {
  const { error } = await supabase.from('user_feed_preferences').upsert(
    {
      user_id: userId,
      analytics_enabled: enabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (error) {
    throw new Error(`Failed to save feed analytics preference: ${error.message}`);
  }
}
