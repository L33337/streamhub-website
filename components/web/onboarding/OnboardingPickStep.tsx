'use client';

// Manual favorites picker of the onboarding wizard: a default grid of the
// most-followed streamers (server-fetched; Discover fallback — see
// app/[locale]/onboarding/page.tsx) + a debounced streamer search over
// /api/search. Cards toggle favorites immediately via the FavoritesProvider
// (optimistic, idempotent), so Continue only navigates.

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useFavorites } from '@/hooks/useFavorites';
import { useExternalStreamerSearch } from '@/hooks/useExternalStreamerSearch';
import { useStreamerAdd } from '@/hooks/useStreamerAdd';
import { signInGateRedirect } from '@/lib/auth-flag';
import type { Platform } from '@/lib/server/partner-api';
import {
  ADD_STREAMER_COPY,
  getResultKey,
  type ExternalSearchResult,
  type SearchPlatform,
} from '@/lib/web/streamerSearch';
import { LiveBadge, PlatformBadge } from '../Badges';
import { InitialsAvatar } from '../InitialsAvatar';
import type { OnboardingSuggestion } from './types';

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_LIMIT = 12;

interface ApiSearchResult {
  id: string;
  name: string;
  avatar_url: string | null;
  platforms: Platform[];
  is_live?: boolean;
}

interface Props {
  suggestions: OnboardingSuggestion[];
  /** Heading over the default (non-search) grid. */
  suggestionsLabel: string;
  onContinue: () => void;
  onBack: () => void;
}

function PickCard({ streamer }: { streamer: OnboardingSuggestion }) {
  const { isFavorited, toggle } = useFavorites();
  const picked = isFavorited(streamer.id);
  return (
    <button
      type="button"
      aria-pressed={picked}
      title={picked ? 'Remove from favorites' : 'Add to favorites'}
      onClick={() => void toggle(streamer.id)}
      className={`relative flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors ${
        picked
          ? 'border-accent-pink/60 bg-accent-pink/10'
          : 'border-border-default bg-background-elevated hover:border-accent-cyan/40'
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full border ${
          picked
            ? 'border-accent-pink/60 bg-accent-pink/20 text-accent-pink'
            : 'border-border-default bg-background text-text-muted'
        }`}
      >
        <svg
          width={12}
          height={12}
          viewBox="0 0 24 24"
          fill={picked ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={picked ? 0 : 2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </span>

      {streamer.avatarUrl ? (
        <Image
          src={streamer.avatarUrl}
          alt=""
          width={56}
          height={56}
          unoptimized
          className="rounded-full border border-border-default"
        />
      ) : (
        <InitialsAvatar name={streamer.name} size={56} />
      )}
      <span className="w-full truncate text-sm font-semibold text-text-primary">
        {streamer.name}
      </span>
      <span className="flex flex-wrap items-center justify-center gap-1">
        {streamer.platforms.map((p) => (
          <PlatformBadge key={p} platform={p} />
        ))}
        {streamer.isLive && <LiveBadge />}
      </span>
    </button>
  );
}

/** Compact grid card for an external (not-in-DB-yet) result with an Add
 * control — the pick-step sibling of components/web/search/AddStreamerCard. */
function AddPickCard({
  result,
  pending,
  error,
  onAdd,
  signInHref,
}: {
  result: ExternalSearchResult;
  pending: boolean;
  error: { message: string; retryable: boolean; signIn?: boolean } | null;
  onAdd: (result: ExternalSearchResult) => void;
  signInHref: string;
}) {
  const C = ADD_STREAMER_COPY;
  return (
    <div
      className={`relative flex flex-col items-center gap-2 rounded-xl border p-4 text-center ${
        error
          ? 'border-accent-pink/60 bg-background-elevated'
          : 'border-border-default bg-background-elevated'
      }`}
    >
      {result.avatarUrl ? (
        <Image
          src={result.avatarUrl}
          alt=""
          width={56}
          height={56}
          unoptimized
          className="rounded-full border border-border-default"
        />
      ) : (
        <InitialsAvatar name={result.displayName} size={56} />
      )}
      <span className="w-full truncate text-sm font-semibold text-text-primary">
        {result.displayName}
      </span>
      <span className="flex flex-wrap items-center justify-center gap-1">
        <PlatformBadge platform={result.platform} />
        {result.isLive && <LiveBadge />}
      </span>
      <button
        type="button"
        onClick={() => onAdd(result)}
        disabled={pending}
        aria-busy={pending}
        className={`inline-flex h-8 items-center justify-center rounded-lg border px-3 text-xs font-semibold transition-colors ${
          pending
            ? 'cursor-wait border-border-default bg-background text-text-muted'
            : 'border-accent-cyan/60 bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/20'
        }`}
      >
        {pending ? (
          <>
            <span
              aria-hidden="true"
              className="mr-1.5 inline-block h-3 w-3 animate-spin rounded-full border-2 border-text-muted border-t-transparent"
            />
            {C.addPending}
          </>
        ) : (
          <>+ {C.addButton}</>
        )}
      </button>
      {error && (
        <p className="text-xs text-accent-pink" role="alert">
          {error.message}{' '}
          {error.signIn && (
            <Link href={signInHref} className="font-semibold underline">
              {C.signInAgain}
            </Link>
          )}
          {error.retryable && !pending && (
            <button
              type="button"
              onClick={() => onAdd(result)}
              className="ml-1 font-semibold text-accent-cyan underline"
            >
              {C.tryAgain}
            </button>
          )}
        </p>
      )}
    </div>
  );
}

const ONBOARDING_SIGNIN_HREF = signInGateRedirect('/onboarding?step=pick');

export function OnboardingPickStep({ suggestions, suggestionsLabel, onContinue, onBack }: Props) {
  const { favorites } = useFavorites();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OnboardingSuggestion[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  // External add-streamer flow (app parity): search Twitch/YouTube for
  // channels not tracked yet and add+favorite them inline.
  const [extPlatform, setExtPlatform] = useState<SearchPlatform>('twitch');
  const [addedSuggestions, setAddedSuggestions] = useState<OnboardingSuggestion[]>([]);
  const external = useExternalStreamerSearch({ query, platform: extPlatform });
  const {
    pendingKeys,
    addedByKey,
    errorByKey,
    noHistoryNames,
    addAndFavorite,
    dismissNoHistory,
  } = useStreamerAdd();

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      setSearching(false);
      setSearchFailed(false);
      return;
    }
    setSearching(true);
    setSearchFailed(false);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(
            `/api/search?q=${encodeURIComponent(q)}&limit=${SEARCH_LIMIT}`,
            { signal: controller.signal },
          );
          if (!res.ok) throw new Error(`search failed (${res.status})`);
          const body = (await res.json()) as { data?: ApiSearchResult[] };
          setResults(
            (body.data ?? []).map((s) => ({
              id: s.id,
              name: s.name,
              avatarUrl: s.avatar_url ?? null,
              platforms: s.platforms ?? [],
              isLive: s.is_live === true,
            })),
          );
          setSearching(false);
        } catch {
          if (controller.signal.aborted) return;
          setSearchFailed(true);
          setSearching(false);
        }
      })();
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  const showingSearch = results !== null || searching || searchFailed;
  // Freshly-added streamers are merged into the grid locally: the Partner API
  // that backs /api/search caches for ~60s, so a refetch would not show them
  // yet — the local merge keeps them visible as normal picked cards.
  const baseGrid = results ?? suggestions;
  const grid = useMemo(() => {
    const ids = new Set(baseGrid.map((s) => s.id));
    return [...baseGrid, ...addedSuggestions.filter((s) => !ids.has(s.id))];
  }, [baseGrid, addedSuggestions]);

  const handleAdd = async (r: ExternalSearchResult) => {
    const added = await addAndFavorite(r);
    if (added) {
      setAddedSuggestions((prev) =>
        prev.some((s) => s.id === added.id)
          ? prev
          : [
              ...prev,
              {
                id: added.id,
                name: added.name,
                avatarUrl: r.avatarUrl,
                platforms: [r.platform],
                isLive: r.isLive,
              },
            ],
      );
    }
  };

  // Added results move from the external sub-grid into the main grid.
  const externalVisible = external.results.filter(
    (r) => !addedByKey.has(getResultKey(r)),
  );
  const showExternal = query.trim().length >= 2;

  return (
    <section>
      <h1 className="mt-2 text-3xl font-bold text-white">
        Pick your favorite streamers
      </h1>
      <p className="mt-3 text-text-secondary">
        Tap streamers to add them to your favorites. Search for anyone we
        track — or add any Twitch or YouTube streamer and we&apos;ll start
        tracking them — or start from the list below.
      </p>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search streamers…"
        aria-label="Search streamers"
        className="mt-6 h-11 w-full rounded-lg border border-border-default bg-background-elevated px-4 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-cyan/60 focus:outline-none"
      />

      <div className="mt-4">
        {searching && (
          <p className="py-4 text-sm text-text-muted">Searching…</p>
        )}
        {!searching && searchFailed && (
          <p className="py-4 text-sm text-accent-pink" role="alert">
            Search failed — please try again.
          </p>
        )}
        {!searching && !searchFailed && grid.length === 0 && (
          <p className="py-4 text-sm text-text-muted">
            {showingSearch
              ? 'No streamers found for that search.'
              : 'No suggestions available right now — use the search above to find streamers.'}
          </p>
        )}
        {!searching && !searchFailed && grid.length > 0 && (
          <>
            {!showingSearch && (
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-text-muted">
                {suggestionsLabel}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {grid.map((s) => (
                <PickCard key={s.id} streamer={s} />
              ))}
            </div>
          </>
        )}
      </div>

      {showExternal && (
        <div className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
              {ADD_STREAMER_COPY.pickSectionTitle}
            </p>
            <div className="flex gap-1" role="group" aria-label="Search platform">
              {(['twitch', 'youtube'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={extPlatform === p}
                  onClick={() => setExtPlatform(p)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    extPlatform === p
                      ? 'border-accent-cyan/60 bg-accent-cyan/15 text-accent-cyan'
                      : 'border-border-default bg-background-elevated text-text-secondary hover:border-accent-cyan/40'
                  }`}
                >
                  {p === 'twitch' ? 'Twitch' : 'YouTube'}
                </button>
              ))}
            </div>
          </div>

          {noHistoryNames.map((name) => (
            <p
              key={name}
              className="mt-3 flex items-start justify-between gap-3 rounded-lg border border-accent-cyan/40 bg-accent-cyan/10 px-4 py-3 text-sm text-text-secondary"
              role="status"
            >
              <span>{ADD_STREAMER_COPY.noHistoryNotice(name)}</span>
              <button
                type="button"
                onClick={() => dismissNoHistory(name)}
                aria-label="Dismiss"
                className="shrink-0 font-bold text-text-muted hover:text-text-primary"
              >
                ✕
              </button>
            </p>
          ))}

          {external.isSearching && (
            <p className="mt-3 py-2 text-sm text-text-muted">
              {ADD_STREAMER_COPY.searchingExternal(extPlatform)}
            </p>
          )}
          {!external.isSearching && external.error && (
            <p className="mt-3 py-2 text-sm text-accent-pink" role="alert">
              {external.error}
            </p>
          )}
          {!external.isSearching &&
            !external.error &&
            externalVisible.length === 0 && (
              <p className="mt-3 py-2 text-sm text-text-muted">
                {ADD_STREAMER_COPY.externalNoMatches(extPlatform)}
              </p>
            )}
          {!external.isSearching &&
            !external.error &&
            externalVisible.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {externalVisible.map((r) => {
                  const key = getResultKey(r);
                  return (
                    <AddPickCard
                      key={`${r.platform}:${key}`}
                      result={r}
                      pending={pendingKeys.has(key)}
                      error={errorByKey.get(key) ?? null}
                      onAdd={(res) => void handleAdd(res)}
                      signInHref={ONBOARDING_SIGNIN_HREF}
                    />
                  );
                })}
              </div>
            )}
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex h-11 items-center justify-center rounded-lg border border-accent-cyan/60 bg-accent-cyan/15 px-5 text-sm font-semibold text-accent-cyan hover:bg-accent-cyan/25 transition-colors"
        >
          Continue
          {favorites.size > 0
            ? ` with ${favorites.size} favorite${favorites.size === 1 ? '' : 's'}`
            : ''}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-11 items-center justify-center rounded-lg border border-border-default bg-background-elevated px-5 text-sm font-semibold text-text-primary hover:border-accent-cyan/40 transition-colors"
        >
          Back
        </button>
      </div>
    </section>
  );
}
