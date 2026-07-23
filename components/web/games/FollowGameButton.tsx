'use client';

// "Follow this game" chip on the game hub (game-hub UX round 2026-07-23).
// Stealth-conform: renders NOTHING while auth is dormant (build-time flag) and
// nothing for signed-out visitors — the game pages are public/ISR-cached, so
// the auth check must run client-side (a server cookie read would break the
// static render, K1 rule). Signed-in users get an optimistic follow toggle
// persisted to user_game_follows (RLS-scoped); the follows list is visible in
// /settings.

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { AUTH_ENABLED } from '@/lib/auth-flag';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { followGame, isGameFollowed, unfollowGame } from '@/lib/supabase/gameFollows';

type State = 'hidden' | 'not-following' | 'following';

export function FollowGameButton({ category }: { category: string }) {
  const [state, setState] = useState<State>('hidden');

  useEffect(() => {
    if (!AUTH_ENABLED) return;
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled || !session) return;
      const followed = await isGameFollowed(supabase, category);
      if (!cancelled) setState(followed ? 'following' : 'not-following');
    })();
    return () => {
      cancelled = true;
    };
  }, [category]);

  if (!AUTH_ENABLED || state === 'hidden') return null;

  const following = state === 'following';

  const toggle = async () => {
    const supabase = createSupabaseBrowserClient();
    const next: State = following ? 'not-following' : 'following';
    setState(next); // optimistic
    try {
      if (next === 'following') await followGame(supabase, category);
      else await unfollowGame(supabase, category);
    } catch (err) {
      console.warn('[FollowGameButton] toggle failed:', err);
      setState(following ? 'following' : 'not-following'); // revert
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={following}
      className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
        following
          ? 'border-accent-cyan/70 bg-background-highlight text-accent-cyan'
          : 'border-border-default bg-background-elevated text-text-secondary hover:border-accent-cyan/60 hover:text-text-primary'
      }`}
    >
      <Heart
        size={13}
        aria-hidden="true"
        className={following ? 'fill-current' : ''}
      />
      {following ? 'Following' : `Follow ${category}`}
    </button>
  );
}
