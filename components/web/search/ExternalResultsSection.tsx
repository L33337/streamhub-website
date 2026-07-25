'use client';

// Client island on /search: for signed-in users it searches Twitch/YouTube
// via the search-streamers Edge Function and offers one-click add+favorite of
// channels not yet in the DB (app parity — the app's SearchPanel merges DB
// and platform results the same way). Signed-out or auth-dormant visitors get
// the `fallback` (the pre-existing "Get the app" box) so the public page is
// unchanged.

import { useAuth } from '@/context/AuthProvider';
import { useExternalStreamerSearch } from '@/hooks/useExternalStreamerSearch';
import { useStreamerAdd } from '@/hooks/useStreamerAdd';
import { AUTH_ENABLED, signInGateRedirect } from '@/lib/auth-flag';
import {
  ADD_STREAMER_COPY,
  getResultKey,
  type SearchPlatform,
} from '@/lib/web/streamerSearch';
import { AddStreamerCard } from './AddStreamerCard';

interface Props {
  query: string;
  platform: SearchPlatform;
  /**
   * 'below-results': appended under the DB result list (renders nothing for
   * signed-out visitors). 'no-results': inside NoResultsState, replacing the
   * "Get the app" box (renders `fallback` for signed-out visitors).
   */
  variant: 'below-results' | 'no-results';
  fallback?: React.ReactNode;
}

export function ExternalResultsSection({
  query,
  platform,
  variant,
  fallback = null,
}: Props) {
  const { user } = useAuth();
  const signedIn = AUTH_ENABLED && user !== null;
  const { results, isSearching, error } = useExternalStreamerSearch({
    query,
    platform,
    enabled: signedIn,
    debounceMs: 0,
  });
  const {
    pendingKeys,
    addedByKey,
    errorByKey,
    noHistoryNames,
    addAndFavorite,
    dismissNoHistory,
  } = useStreamerAdd();

  if (!signedIn) {
    return variant === 'no-results' ? <>{fallback}</> : null;
  }

  const C = ADD_STREAMER_COPY;
  const signInHref = signInGateRedirect(
    `/search?q=${encodeURIComponent(query)}${platform === 'youtube' ? '&platform=youtube' : ''}`,
  );
  const empty = !isSearching && !error && results.length === 0;

  // Below the DB results an empty external search needs no UI at all.
  if (variant === 'below-results' && empty && noHistoryNames.length === 0) {
    return null;
  }

  return (
    <section
      className={
        variant === 'no-results'
          ? 'mt-6 border-t border-divider pt-6 text-left'
          : 'mt-10'
      }
      aria-label={C.sectionTitleResults(platform)}
    >
      <h2 className="text-lg font-bold text-text-primary">
        {variant === 'no-results'
          ? C.sectionTitleNoResults
          : C.sectionTitleResults(platform)}
      </h2>
      <p className="mt-1 text-sm text-text-secondary">{C.sectionHint(platform)}</p>

      {noHistoryNames.map((name) => (
        <p
          key={name}
          className="mt-3 flex items-start justify-between gap-3 rounded-lg border border-accent-cyan/40 bg-accent-cyan/10 px-4 py-3 text-sm text-text-secondary"
          role="status"
        >
          <span>{C.noHistoryNotice(name)}</span>
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

      {isSearching && (
        <p className="mt-4 text-sm text-text-muted">
          {C.searchingExternal(platform)}
        </p>
      )}
      {!isSearching && error && (
        <p className="mt-4 text-sm text-accent-pink" role="alert">
          {error}
        </p>
      )}
      {empty && (
        <p className="mt-4 text-sm text-text-muted">
          {C.externalNoMatches(platform)}
        </p>
      )}

      {!isSearching && !error && results.length > 0 && (
        <ul className="mt-4 grid gap-3">
          {results.map((r) => {
            const mapKey = getResultKey(r);
            const key = `${r.platform}:${mapKey}`;
            return (
              <li key={key}>
                <AddStreamerCard
                  result={r}
                  pending={pendingKeys.has(mapKey)}
                  added={addedByKey.get(mapKey) ?? null}
                  error={errorByKey.get(mapKey) ?? null}
                  onAdd={(res) => void addAndFavorite(res)}
                  signInHref={signInHref}
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
