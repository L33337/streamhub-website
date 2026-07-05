'use client';

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  addFavorite,
  listFavoriteIds,
  removeFavorite,
} from '@/lib/supabase/favorites';
import { useAuth } from './AuthProvider';

export interface FavoritesContextValue {
  /** Set of streamer ids the current user has favorited. */
  favorites: Set<string>;
  /** True iff the streamer is currently favorited. */
  isFavorited: (streamerId: string) => boolean;
  /**
   * Toggles a favorite with optimistic update. Reverts on server error.
   * Caller must ensure user is signed in — anonymous toggles are a no-op.
   * The FavoriteButton component renders a sign-in link for anon users
   * instead of calling this.
   */
  toggle: (streamerId: string) => Promise<void>;
  /**
   * Adds streamer ids to the local Set without hitting the server. Used after
   * a bulk server-side import (Twitch follows) so heart icons across the app
   * reflect the new favorites immediately, without a full re-fetch.
   */
  addFavoriteIds: (streamerIds: string[]) => void;
}

export const FavoritesContext = createContext<FavoritesContextValue | undefined>(
  undefined,
);

interface Props {
  children: React.ReactNode;
}

/**
 * Favorites held in state are tagged with the user id they belong to. The
 * value exposed to consumers is derived: ids only count while their owner is
 * the currently signed-in user. Sign-out (or a user switch) therefore hides
 * stale favorites immediately without an imperative clear — no setState in
 * the effect body, no flash of another user's hearts.
 */
interface FavoritesState {
  owner: string;
  ids: Set<string>;
}

const EMPTY_FAVORITES: Set<string> = new Set();

export function FavoritesProvider({ children }: Props) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [state, setState] = useState<FavoritesState | null>(null);
  const { user } = useAuth();
  // Key everything on the user id, not the user object — auth events (token
  // refresh) produce new object identities for the same signed-in user and
  // must not re-trigger the favorites query.
  const userId = user?.id ?? null;

  const favorites = useMemo(
    () =>
      userId && state?.owner === userId ? state.ids : EMPTY_FAVORITES,
    [userId, state],
  );

  // Loads favorites client-side once the user hydrates. Runs after
  // AuthProvider's INITIAL_SESSION resolves, so the root layout stays static
  // (ISR) instead of fetching favorites per request. The stale flag prevents
  // a late response from overwriting a newer auth state. Known tiny race: a
  // toggle clicked before the initial list resolves can be overwritten by
  // it — self-corrects on the next load and the window is a few hundred ms.
  useEffect(() => {
    if (!userId) return;
    let stale = false;
    void listFavoriteIds(supabase).then((ids) => {
      if (!stale) setState({ owner: userId, ids: new Set(ids) });
    });
    return () => {
      stale = true;
    };
  }, [supabase, userId]);

  const isFavorited = useCallback(
    (streamerId: string) => favorites.has(streamerId),
    [favorites],
  );

  /** Applies a local add/remove for the current user, preserving owner tagging. */
  const applyLocal = useCallback(
    (streamerId: string, add: boolean) => {
      if (!userId) return;
      setState((prev) => {
        const ids = new Set(prev?.owner === userId ? prev.ids : []);
        if (add) ids.add(streamerId);
        else ids.delete(streamerId);
        return { owner: userId, ids };
      });
    },
    [userId],
  );

  const toggle = useCallback(
    async (streamerId: string) => {
      const wasFavorited = favorites.has(streamerId);
      // Optimistic update.
      applyLocal(streamerId, !wasFavorited);
      try {
        if (wasFavorited) {
          await removeFavorite(supabase, streamerId);
        } else {
          await addFavorite(supabase, streamerId);
        }
      } catch (err) {
        // Revert optimistic update on failure.
        applyLocal(streamerId, wasFavorited);
        console.error('[favorites] toggle failed:', err);
      }
    },
    [favorites, applyLocal, supabase],
  );

  const addFavoriteIds = useCallback(
    (streamerIds: string[]) => {
      if (streamerIds.length === 0 || !userId) return;
      setState((prev) => {
        const ids = new Set(prev?.owner === userId ? prev.ids : []);
        for (const id of streamerIds) ids.add(id);
        return { owner: userId, ids };
      });
    },
    [userId],
  );

  const value: FavoritesContextValue = useMemo(
    () => ({ favorites, isFavorited, toggle, addFavoriteIds }),
    [favorites, isFavorited, toggle, addFavoriteIds],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}
