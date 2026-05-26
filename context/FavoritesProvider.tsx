'use client';

import {
  createContext,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  addFavorite,
  removeFavorite,
} from '@/lib/supabase/favorites';

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
   * reflect the new favorites immediately, without re-fetching the layout.
   */
  addFavoriteIds: (streamerIds: string[]) => void;
}

export const FavoritesContext = createContext<FavoritesContextValue | undefined>(
  undefined,
);

interface Props {
  initialFavoriteIds: string[];
  children: React.ReactNode;
}

export function FavoritesProvider({ initialFavoriteIds, children }: Props) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [favorites, setFavorites] = useState<Set<string>>(
    () => new Set(initialFavoriteIds),
  );

  const isFavorited = useCallback(
    (streamerId: string) => favorites.has(streamerId),
    [favorites],
  );

  const toggle = useCallback(
    async (streamerId: string) => {
      const wasFavorited = favorites.has(streamerId);
      // Optimistic update.
      setFavorites((prev) => {
        const next = new Set(prev);
        if (wasFavorited) next.delete(streamerId);
        else next.add(streamerId);
        return next;
      });
      try {
        if (wasFavorited) {
          await removeFavorite(supabase, streamerId);
        } else {
          await addFavorite(supabase, streamerId);
        }
      } catch (err) {
        // Revert optimistic update on failure.
        setFavorites((prev) => {
          const next = new Set(prev);
          if (wasFavorited) next.add(streamerId);
          else next.delete(streamerId);
          return next;
        });
        console.error('[favorites] toggle failed:', err);
      }
    },
    [favorites, supabase],
  );

  const addFavoriteIds = useCallback((streamerIds: string[]) => {
    if (streamerIds.length === 0) return;
    setFavorites((prev) => {
      const next = new Set(prev);
      for (const id of streamerIds) next.add(id);
      return next;
    });
  }, []);

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
