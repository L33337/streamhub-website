'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFavorites } from '@/hooks/useFavorites';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { clearTwitchToken, readTwitchToken } from '@/lib/web/twitchToken';
import { initialsFromName } from './InitialsAvatar';
import { SettingsSection } from './SettingsSection';

interface TwitchFollow {
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

interface ImportResponse {
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

type Phase =
  | 'idle'
  | 'fetching'
  | 'selecting'
  | 'importing'
  | 'done'
  | 'error';

const DAILY_NEW_LIMIT_HINT = 20;

export function TwitchImportButton() {
  const { addFavoriteIds } = useFavorites();
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [follows, setFollows] = useState<TwitchFollow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportResponse | null>(null);

  useEffect(() => {
    setHasToken(readTwitchToken() !== null);
  }, []);

  const closeModal = useCallback(() => {
    setPhase('idle');
    setFollows([]);
    setSelected(new Set());
    setErrorMessage(null);
    setSummary(null);
  }, []);

  useEffect(() => {
    if (phase === 'idle') return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && phase !== 'importing' && phase !== 'fetching') {
        closeModal();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [phase, closeModal]);

  async function openAndFetch() {
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

      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/import-twitch-follows`;
      const res = await fetch(url, {
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
  }

  const newSelectedCount = useMemo(
    () =>
      follows.filter((f) => selected.has(f.twitchId) && !f.existsInDb).length,
    [follows, selected],
  );

  async function handleImport() {
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

      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/import-twitch-follows`;
      const res = await fetch(url, {
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
  }

  if (hasToken === null) {
    return (
      <SettingsSection title="Import Twitch follows">
        <p className="text-sm text-text-muted">Loading…</p>
      </SettingsSection>
    );
  }

  if (!hasToken) {
    return (
      <SettingsSection
        title="Import Twitch follows"
        description="Bring your Twitch follows over and favorite them in Streamer Times."
      >
        <p className="text-sm text-text-secondary">
          Your Twitch session has expired. Sign in with Twitch again to import
          your follows.
        </p>
        <Link
          href="/auth/login"
          className="mt-3 inline-flex h-10 items-center rounded-lg bg-twitch px-4 text-sm font-bold tracking-wide text-white shadow-[0_0_12px_rgba(0,240,255,0.25)] hover:bg-[#A266FF] transition-colors"
        >
          Re-authenticate with Twitch
        </Link>
      </SettingsSection>
    );
  }

  return (
    <SettingsSection
      title="Import Twitch follows"
      description={`Bring your Twitch follows over and favorite them. Up to ${DAILY_NEW_LIMIT_HINT} new streamers per day.`}
    >
      <button
        type="button"
        onClick={openAndFetch}
        className="inline-flex h-10 items-center rounded-lg bg-twitch px-4 text-sm font-bold tracking-wide text-white shadow-[0_0_12px_rgba(0,240,255,0.25)] hover:bg-[#A266FF] transition-colors"
        aria-haspopup="dialog"
        aria-expanded={phase !== 'idle'}
      >
        Import follows
      </button>

      {phase !== 'idle' ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="twitch-import-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4 py-6"
          onClick={() => {
            if (phase !== 'importing' && phase !== 'fetching') closeModal();
          }}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] flex flex-col gradient-border p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="twitch-import-title"
              className="text-xl font-bold text-white"
            >
              Import Twitch follows
            </h3>

            {phase === 'fetching' && (
              <p className="mt-4 text-sm text-text-secondary">
                Loading your follows from Twitch…
              </p>
            )}

            {phase === 'selecting' && (
              <>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <p className="text-text-secondary">
                    {follows.length} follow{follows.length === 1 ? '' : 's'} loaded.{' '}
                    <span className="text-text-muted">
                      {selected.size} selected ({newSelectedCount} new)
                    </span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSelected(new Set(follows.map((f) => f.twitchId)))
                      }
                      className="text-xs underline underline-offset-4 text-accent-cyan hover:text-text-primary"
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelected(new Set())}
                      className="text-xs underline underline-offset-4 text-text-muted hover:text-text-primary"
                    >
                      Select none
                    </button>
                  </div>
                </div>
                <ul className="mt-3 flex-1 min-h-0 overflow-y-auto rounded-lg border border-border-default divide-y divide-divider">
                  {follows.length === 0 ? (
                    <li className="px-3 py-4 text-sm text-text-muted">
                      No eligible follows found.
                    </li>
                  ) : (
                    follows.map((f) => {
                      const isChecked = selected.has(f.twitchId);
                      return (
                        <li key={f.twitchId}>
                          <label className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-background-highlight">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                setSelected((prev) => {
                                  const next = new Set(prev);
                                  if (e.target.checked) next.add(f.twitchId);
                                  else next.delete(f.twitchId);
                                  return next;
                                });
                              }}
                              className="h-4 w-4 accent-accent-cyan"
                            />
                            {f.avatarUrl ? (
                              <Image
                                src={f.avatarUrl}
                                alt=""
                                width={32}
                                height={32}
                                unoptimized
                                className="rounded-full border border-border-default"
                              />
                            ) : (
                              <span
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-accent-cyan/40 bg-background-highlight text-xs font-bold text-text-primary"
                                aria-hidden="true"
                              >
                                {initialsFromName(f.displayName)}
                              </span>
                            )}
                            <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
                              {f.displayName}
                            </span>
                            {!f.existsInDb && (
                              <span className="rounded-full border border-accent-pink/40 bg-accent-pink/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-pink">
                                New
                              </span>
                            )}
                          </label>
                        </li>
                      );
                    })
                  )}
                </ul>
              </>
            )}

            {phase === 'importing' && (
              <p className="mt-4 text-sm text-text-secondary">
                Importing {selected.size} streamer
                {selected.size === 1 ? '' : 's'}
                {newSelectedCount > 0
                  ? ` (${newSelectedCount} new, this can take a moment)…`
                  : '…'}
              </p>
            )}

            {phase === 'done' && summary && (
              <div className="mt-4 space-y-2 text-sm">
                <p className="text-text-primary font-semibold">Import complete.</p>
                <p className="text-text-secondary">
                  {summary.existingFavorited} added from existing streamers,{' '}
                  {summary.newStreamersCreated} new streamer
                  {summary.newStreamersCreated === 1 ? '' : 's'} created.
                </p>
                {summary.errors.length > 0 && (
                  <details className="text-xs text-text-muted">
                    <summary className="cursor-pointer">
                      {summary.errors.length} issue
                      {summary.errors.length === 1 ? '' : 's'}
                    </summary>
                    <ul className="mt-1 list-disc pl-5">
                      {summary.errors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}

            {phase === 'error' && errorMessage && (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-accent-pink/40 bg-accent-pink/10 px-3 py-2 text-sm text-accent-pink"
              >
                {errorMessage}
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              {phase === 'selecting' && (
                <>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="inline-flex h-10 items-center rounded-lg border border-border-default bg-background-elevated px-4 text-sm font-semibold text-text-primary hover:border-accent-cyan/40 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={selected.size === 0}
                    className="inline-flex h-10 items-center rounded-lg border border-accent-cyan/60 bg-accent-cyan/15 px-4 text-sm font-semibold text-accent-cyan hover:bg-accent-cyan/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Import {selected.size} streamer{selected.size === 1 ? '' : 's'}
                  </button>
                </>
              )}
              {phase === 'done' && (
                <>
                  <Link
                    href="/favorites"
                    className="inline-flex h-10 items-center rounded-lg border border-accent-cyan/60 bg-accent-cyan/15 px-4 text-sm font-semibold text-accent-cyan hover:bg-accent-cyan/25 transition-colors"
                  >
                    View favorites
                  </Link>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="inline-flex h-10 items-center rounded-lg border border-border-default bg-background-elevated px-4 text-sm font-semibold text-text-primary hover:border-accent-cyan/40 transition-colors"
                  >
                    Close
                  </button>
                </>
              )}
              {phase === 'error' && (
                <button
                  type="button"
                  onClick={closeModal}
                  className="inline-flex h-10 items-center rounded-lg border border-border-default bg-background-elevated px-4 text-sm font-semibold text-text-primary hover:border-accent-cyan/40 transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </SettingsSection>
  );
}
