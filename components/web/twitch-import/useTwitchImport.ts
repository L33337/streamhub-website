'use client';

// State machine of the Twitch-follows import, shared by the Settings modal
// (TwitchImportButton) and the onboarding wizard's import step. Talks to the
// import-twitch-follows edge function (StreamHub Supabase project) with the
// user's JWT + the captured provider token (lib/web/twitchToken.ts).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFavorites } from '@/hooks/useFavorites';
import { createSupabaseBrowserClient } from '@/lib/supabase/client-eager';
import { functionsUrl } from '@/lib/web/streamerSearch';
import { clearTwitchToken, readTwitchToken } from '@/lib/web/twitchToken';

export interface TwitchFollow {
  twitchId: string;
  twitchLogin: string;
  displayName: string;
  avatarUrl: string | null;
  existsInDb: boolean;
  streamerId: string | null;
  followerCount: number | null;
  belowThreshold: boolean;
}

interface FetchResponse {
  success: boolean;
  follows: TwitchFollow[];
  totalFollows: number;
  minThreshold?: number;
  belowThresholdCount?: number;
  error?: string;
}

export interface ImportResponse {
  success: boolean;
  existingFavorited: number;
  newStreamersCreated: number;
  newStreamersQueued: number;
  errors: string[];
  error?: string;
  errorCode?: string;
  newCount?: number;
  limit?: number;
}

export type TwitchImportPhase =
  | 'idle'
  | 'fetching'
  | 'selecting'
  | 'importing'
  | 'done'
  | 'error';

export const DAILY_NEW_LIMIT_HINT = 20;

export interface TwitchImportState {
  /** null until mounted (SSR-safe), then whether a provider token exists. */
  hasToken: boolean | null;
  phase: TwitchImportPhase;
  follows: TwitchFollow[];
  selected: Set<string>;
  newSelectedCount: number;
  errorMessage: string | null;
  summary: ImportResponse | null;
  /** Loads follows from Twitch and enters 'selecting'. */
  start: () => Promise<void>;
  /** Imports the current selection and enters 'done' (or 'error'). */
  doImport: () => Promise<void>;
  toggleFollow: (twitchId: string, checked: boolean) => void;
  selectAll: () => void;
  selectNone: () => void;
  /** Back to 'idle', clearing all transient state. */
  reset: () => void;
}

export function useTwitchImport(): TwitchImportState {
  const { addFavoriteIds } = useFavorites();
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<TwitchImportPhase>('idle');
  const [follows, setFollows] = useState<TwitchFollow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportResponse | null>(null);

  useEffect(() => {
    setHasToken(readTwitchToken() !== null);
  }, []);

  const reset = useCallback(() => {
    setPhase('idle');
    setFollows([]);
    setSelected(new Set());
    setErrorMessage(null);
    setSummary(null);
  }, []);

  const start = useCallback(async () => {
    const token = readTwitchToken();
    if (!token) {
      setHasToken(false);
      return;
    }
    setErrorMessage(null);
    setSummary(null);
    setFollows([]);
    setSelected(new Set());
    setPhase('fetching');

    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not signed in. Please reload and try again.');

      const res = await fetch(functionsUrl('import-twitch-follows'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'fetch', providerToken: token }),
      });
      const data = (await res.json()) as FetchResponse;
      if (!data.success || data.error === 'token_expired') {
        clearTwitchToken();
        setHasToken(false);
        throw new Error(
          data.error === 'token_expired'
            ? 'Your Twitch session expired. Sign in with Twitch again.'
            : data.error || `Fetch failed (HTTP ${res.status})`,
        );
      }
      const eligible = data.follows.filter((f) => !f.belowThreshold);
      setFollows(eligible);
      setSelected(new Set(eligible.map((f) => f.twitchId)));
      setPhase('selecting');
    } catch (err) {
      console.error('[twitch-import] fetch failed:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Unknown error');
      setPhase('error');
    }
  }, []);

  const newSelectedCount = useMemo(
    () =>
      follows.filter((f) => selected.has(f.twitchId) && !f.existsInDb).length,
    [follows, selected],
  );

  const doImport = useCallback(async () => {
    setPhase('importing');
    setErrorMessage(null);
    try {
      const token = readTwitchToken();
      if (!token) {
        setHasToken(false);
        throw new Error('Your Twitch session expired. Sign in with Twitch again.');
      }
      const supabase = createSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not signed in. Please reload and try again.');

      const selectedFollows = follows
        .filter((f) => selected.has(f.twitchId))
        .map((f) => ({
          twitchId: f.twitchId,
          twitchLogin: f.twitchLogin,
          displayName: f.displayName,
          avatarUrl: f.avatarUrl,
          existsInDb: f.existsInDb,
          streamerId: f.streamerId,
        }));

      const res = await fetch(functionsUrl('import-twitch-follows'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'import',
          providerToken: token,
          selectedFollows,
        }),
      });
      const data = (await res.json()) as ImportResponse;
      if (!data.success) {
        if (data.errorCode === 'daily_limit_exceeded') {
          throw new Error(
            `Daily limit exceeded: you tried to add ${data.newCount} new streamers, but the limit is ${data.limit}. Uncheck some new streamers and try again.`,
          );
        }
        throw new Error(data.error || `Import failed (HTTP ${res.status})`);
      }

      // Update favorites context so heart-icons across the app refresh immediately
      // for existing-DB streamers. Newly-created streamers will reflect after the
      // next page render (their streamer_id is server-assigned + comes via createdStreamers).
      const existingIdsFromFollows = selectedFollows
        .filter((f) => f.existsInDb && f.streamerId)
        .map((f) => f.streamerId!);
      addFavoriteIds(existingIdsFromFollows);

      setSummary(data);
      setPhase('done');
    } catch (err) {
      console.error('[twitch-import] import failed:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Unknown error');
      setPhase('error');
    }
  }, [addFavoriteIds, follows, selected]);

  const toggleFollow = useCallback((twitchId: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(twitchId);
      else next.delete(twitchId);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(follows.map((f) => f.twitchId)));
  }, [follows]);

  const selectNone = useCallback(() => {
    setSelected(new Set());
  }, []);

  return {
    hasToken,
    phase,
    follows,
    selected,
    newSelectedCount,
    errorMessage,
    summary,
    start,
    doImport,
    toggleFollow,
    selectAll,
    selectNone,
    reset,
  };
}
