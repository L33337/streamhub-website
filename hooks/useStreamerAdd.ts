'use client';

// Shared add-streamer hook for the /search external section and the
// onboarding pick step (website port of the app's addAndFavorite in
// src/hooks/useStreamerSearch.ts). Adds a new streamer via the add-streamer
// Edge Function (long call: 30-90s — AI discovery, EventSub, history,
// prediction chain), then favorites it. Duplicate adds are safe: the function
// returns 200 alreadyExists and we just favorite the existing id.

import { useCallback, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { useFavorites } from '@/hooks/useFavorites';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { addFavorite } from '@/lib/supabase/favorites';
import {
  addExternalStreamer,
  addStreamerErrorInfo,
  buildAddParams,
  getResultKey,
  StreamerSearchAuthError,
  ADD_STREAMER_COPY,
  type AddStreamerErrorInfo,
  type ExternalSearchResult,
} from '@/lib/web/streamerSearch';

export interface AddedStreamer {
  id: string;
  name: string;
}

export interface UseStreamerAddResult {
  /** Result keys with an add in flight (spinner + double-click guard). */
  pendingKeys: Set<string>;
  /** Result key → added streamer (drives the "Added" card + page link). */
  addedByKey: Map<string, AddedStreamer>;
  /** Result key → inline error for that card. */
  errorByKey: Map<string, AddStreamerErrorInfo>;
  /** Names added without recent-stream history (dismissible info notice). */
  noHistoryNames: string[];
  /** Resolves with the added streamer on success, null on failure/no-op. */
  addAndFavorite: (result: ExternalSearchResult) => Promise<AddedStreamer | null>;
  dismissNoHistory: (name: string) => void;
}

export function useStreamerAdd(): UseStreamerAddResult {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { user } = useAuth();
  const { addFavoriteIds } = useFavorites();
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());
  const [addedByKey, setAddedByKey] = useState<Map<string, AddedStreamer>>(
    new Map(),
  );
  const [errorByKey, setErrorByKey] = useState<
    Map<string, AddStreamerErrorInfo>
  >(new Map());
  const [noHistoryNames, setNoHistoryNames] = useState<string[]>([]);

  // Current user id, readable after the long add round-trip without
  // re-subscribing the callback to auth state.
  const userIdRef = useRef<string | null>(null);
  userIdRef.current = user?.id ?? null;

  const setError = useCallback(
    (key: string, info: AddStreamerErrorInfo | null) => {
      setErrorByKey((prev) => {
        const next = new Map(prev);
        if (info) next.set(key, info);
        else next.delete(key);
        return next;
      });
    },
    [],
  );

  const addAndFavorite = useCallback(
    async (result: ExternalSearchResult): Promise<AddedStreamer | null> => {
      const key = getResultKey(result);
      const initialUserId = userIdRef.current;
      if (!initialUserId) {
        setError(key, {
          message: ADD_STREAMER_COPY.errSessionExpired,
          retryable: false,
          signIn: true,
        });
        return null;
      }
      let alreadyPending = false;
      setPendingKeys((prev) => {
        if (prev.has(key)) {
          alreadyPending = true;
          return prev;
        }
        const next = new Set(prev);
        next.add(key);
        return next;
      });
      if (alreadyPending) return null;
      setError(key, null);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new StreamerSearchAuthError();

        let added: AddedStreamer;
        if (!result.isNew && result.existingStreamerId) {
          // Existing streamer surfaced by the external search — no add call.
          added = { id: result.existingStreamerId, name: result.displayName };
        } else {
          const params = buildAddParams(result);
          if (!params) throw new Error(ADD_STREAMER_COPY.errGeneric);
          const { status, result: addResult } = await addExternalStreamer(
            session.access_token,
            params,
          );
          const streamerId = addResult.streamer?.id;
          if (!addResult.success || !streamerId) {
            setError(key, addStreamerErrorInfo(addResult, status));
            return null;
          }
          added = { id: streamerId, name: addResult.streamer?.name ?? result.displayName };
          if (addResult.noHistory) {
            setNoHistoryNames((prev) =>
              prev.includes(added.name) ? prev : [...prev, added.name],
            );
          }
        }

        // The add call can take a minute — if the user signed out or switched
        // accounts meanwhile, don't write a favorite for the wrong user. The
        // streamers row itself is public data and fine to keep.
        if (userIdRef.current !== initialUserId) return null;

        await addFavorite(supabase, added.id);
        addFavoriteIds([added.id]);
        setAddedByKey((prev) => new Map(prev).set(key, added));
        return added;
      } catch (err) {
        console.error('[streamer-add] add failed:', err);
        if (err instanceof StreamerSearchAuthError) {
          setError(key, { message: err.message, retryable: false, signIn: true });
        } else {
          setError(key, { message: ADD_STREAMER_COPY.errGeneric, retryable: true });
        }
        return null;
      } finally {
        setPendingKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [supabase, addFavoriteIds, setError],
  );

  const dismissNoHistory = useCallback((name: string) => {
    setNoHistoryNames((prev) => prev.filter((n) => n !== name));
  }, []);

  return {
    pendingKeys,
    addedByKey,
    errorByKey,
    noHistoryNames,
    addAndFavorite,
    dismissNoHistory,
  };
}
