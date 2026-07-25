'use client';

// Debounced external streamer search over the search-streamers Edge Function
// (local DB + Twitch/YouTube API). Returns only isNew results — callers
// render DB matches from their own (Partner API) source, so surfacing
// existing streamers here would duplicate them. Idle and empty while auth is
// dormant or the visitor is signed out (the function 401s without a JWT).

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { AUTH_ENABLED } from '@/lib/auth-flag';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  searchExternalStreamers,
  ADD_STREAMER_COPY,
  EXTERNAL_QUERY_MAX,
  EXTERNAL_QUERY_MIN,
  type ExternalSearchResult,
  type SearchPlatform,
} from '@/lib/web/streamerSearch';

interface Options {
  query: string;
  platform: SearchPlatform;
  /** Set false to pause searching without unmounting. Default true. */
  enabled?: boolean;
  /** 0 on /search where the query is static per page load. Default 400. */
  debounceMs?: number;
}

export interface ExternalStreamerSearchState {
  /** New-to-DB results only. */
  results: ExternalSearchResult[];
  isSearching: boolean;
  error: string | null;
}

const IDLE_STATE: ExternalStreamerSearchState = {
  results: [],
  isSearching: false,
  error: null,
};

export function useExternalStreamerSearch({
  query,
  platform,
  enabled = true,
  debounceMs = 400,
}: Options): ExternalStreamerSearchState {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [state, setState] = useState<ExternalStreamerSearchState>(IDLE_STATE);

  const trimmed = query.trim();
  const active =
    AUTH_ENABLED &&
    enabled &&
    userId !== null &&
    trimmed.length >= EXTERNAL_QUERY_MIN &&
    trimmed.length <= EXTERNAL_QUERY_MAX;

  useEffect(() => {
    if (!active) return;
    // The cleanup's stale flag doubles as the out-of-order guard: any dep
    // change (query, platform, user) invalidates the in-flight request. All
    // setState calls live inside the debounce timer callback — none run
    // synchronously in the effect body (react-hooks/set-state-in-effect).
    let stale = false;
    const timer = setTimeout(() => {
      void (async () => {
        if (stale) return;
        setState({ results: [], isSearching: true, error: null });
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session) {
            if (!stale) setState({ results: [], isSearching: false, error: null });
            return;
          }
          const results = await searchExternalStreamers(
            session.access_token,
            trimmed,
            platform,
          );
          if (!stale) {
            setState({
              results: results.filter((r) => r.isNew),
              isSearching: false,
              error: null,
            });
          }
        } catch (err) {
          console.error('[external-search] failed:', err);
          if (!stale) {
            setState({
              results: [],
              isSearching: false,
              error: ADD_STREAMER_COPY.externalSearchFailed,
            });
          }
        }
      })();
    }, debounceMs);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [active, trimmed, platform, debounceMs, supabase, userId]);

  // Inactive (signed out, short/long query, disabled) derives to idle instead
  // of resetting state in the effect.
  return active ? state : IDLE_STATE;
}
