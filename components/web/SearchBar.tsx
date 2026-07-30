'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from 'react';
import type { Platform, PublicStreamer } from '@/lib/server/partner-api';
import { localeHref, type UiLang } from '@/lib/i18n-core';
import { LiveBadge, PlatformBadge } from './Badges';

interface SearchResultStreamer extends PublicStreamer {
  is_live: boolean;
}

interface ApiResponse {
  data: SearchResultStreamer[];
  pagination: { has_more: boolean; next_cursor: string | null };
}

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 100;

interface Props {
  className?: string;
  // M22: viewer locale — search/result links keep the visitor inside their
  // locale tree; placeholder + results label come pre-localized from the
  // server layout (chrome lexicon stays out of the client bundle).
  locale?: UiLang;
  placeholder?: string;
  resultsLabel?: string;
}

export function SearchBar({
  className = '',
  locale = 'en',
  placeholder = 'Search streamers…',
  resultsLabel = 'Search results',
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const inputId = useId();
  const listboxId = useId();
  const [, startTransition] = useTransition();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultStreamer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Close dropdown when navigating away. Syncs UI state with the URL — an
  // external system — which is the documented use case for useEffect.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setIsOpen(false);
    setQuery('');
    setResults([]);
    setFocusedIndex(-1);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [pathname]);

  // Click outside → close.
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  // Debounced fetch. State mutations happen asynchronously (in the timer
  // callback) — never in the synchronous effect body — which keeps the
  // react-hooks/set-state-in-effect rule satisfied. When the query is too
  // short we simply cancel any in-flight request; stale results stay in
  // state but `showDropdown` below hides them from view.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      abortRef.current?.abort();
      return;
    }

    const timer = window.setTimeout(() => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      setError(null);
      fetch(`/api/search?q=${encodeURIComponent(trimmed)}&limit=5`, {
        signal: ctrl.signal,
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return (await res.json()) as ApiResponse;
        })
        .then((data) => {
          setResults(data.data);
          setFocusedIndex(-1);
          setLoading(false);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          setError('Search is unavailable right now.');
          setResults([]);
          setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query]);

  const navigateToSearch = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      if (trimmed.length < MIN_QUERY_LENGTH) return;
      setIsOpen(false);
      startTransition(() => {
        router.push(localeHref(locale, `/search?q=${encodeURIComponent(trimmed)}`));
      });
    },
    [locale, router],
  );

  const onSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      // If the user has navigated through the dropdown with arrow keys,
      // Enter follows that link instead of running a generic search.
      if (focusedIndex >= 0 && results[focusedIndex]) {
        const target = results[focusedIndex];
        setIsOpen(false);
        startTransition(() => {
          router.push(localeHref(locale, `/streamer/${encodeURIComponent(target.id)}`));
        });
        return;
      }
      navigateToSearch(query);
    },
    [focusedIndex, locale, navigateToSearch, query, results, router],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (results.length === 0) return;
        setIsOpen(true);
        setFocusedIndex((i) => (i + 1) % results.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (results.length === 0) return;
        setIsOpen(true);
        setFocusedIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
      } else if (e.key === 'Escape') {
        if (isOpen) {
          e.preventDefault();
          setIsOpen(false);
          setFocusedIndex(-1);
        }
      } else if (e.key === 'Home' && isOpen) {
        e.preventDefault();
        setFocusedIndex(0);
      } else if (e.key === 'End' && isOpen) {
        e.preventDefault();
        setFocusedIndex(results.length - 1);
      }
    },
    [isOpen, results.length],
  );

  const trimmed = query.trim();
  const showDropdown: boolean = Boolean(
    isOpen &&
      trimmed.length >= MIN_QUERY_LENGTH &&
      (loading || error || results.length > 0),
  );
  const activeId =
    focusedIndex >= 0 && focusedIndex < results.length
      ? `${listboxId}-opt-${focusedIndex}`
      : undefined;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={showDropdown}
        aria-controls={listboxId}
        aria-owns={listboxId}
        onSubmit={onSubmit}
        action={localeHref(locale, '/search')}
        method="GET"
        className="flex items-center"
      >
        <label htmlFor={inputId} className="sr-only">
          Search streamers
        </label>
        <div className="relative flex-1">
          <span
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
          <input
            ref={inputRef}
            id={inputId}
            type="search"
            name="q"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            autoComplete="off"
            aria-autocomplete="list"
            aria-activedescendant={activeId}
            maxLength={MAX_QUERY_LENGTH}
            spellCheck={false}
            className="h-11 w-full rounded-lg border border-border-default bg-background-elevated pl-10 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-cyan/60 focus:outline-none focus:ring-1 focus:ring-accent-cyan/40"
          />
        </div>
      </form>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 gradient-border max-h-96 overflow-y-auto">
          <div className="p-1">
            {loading && (
              <div className="px-3 py-2 text-xs text-text-muted">Searching…</div>
            )}
            {error && (
              <div className="px-3 py-2 text-xs text-accent-pink">{error}</div>
            )}
            <ul
              id={listboxId}
              role="listbox"
              aria-label={resultsLabel}
              className="flex flex-col gap-1"
            >
              {results.map((s, i) => (
                <li
                  key={s.id}
                  id={`${listboxId}-opt-${i}`}
                  role="option"
                  aria-selected={focusedIndex === i}
                  className={
                    focusedIndex === i
                      ? 'rounded-md bg-background-highlight'
                      : 'rounded-md'
                  }
                  onMouseEnter={() => setFocusedIndex(i)}
                >
                  <DropdownResult streamer={s} locale={locale} />
                </li>
              ))}
            </ul>
            {!loading && !error && results.length > 0 && (
              <ViewAllRow query={trimmed} onClick={() => navigateToSearch(query)} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DropdownResult({
  streamer,
  locale,
}: {
  streamer: SearchResultStreamer;
  locale: UiLang;
}) {
  return (
    <Link
      href={localeHref(locale, `/streamer/${encodeURIComponent(streamer.id)}`)}
      className="flex items-center gap-3 px-3 py-2 hover:bg-background-highlight rounded-md"
    >
      {streamer.avatar_url ? (
        <Image
          src={streamer.avatar_url}
          alt={streamer.name}
          width={32}
          height={32}
          unoptimized
          className="rounded-full border border-border-default shrink-0"
        />
      ) : (
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full border border-accent-cyan/40 bg-background-highlight text-xs font-bold text-text-primary shrink-0"
          aria-hidden="true"
        >
          {initialsOf(streamer.name)}
        </div>
      )}
      <span className="flex-1 truncate text-sm font-medium text-text-primary">
        {streamer.name}
      </span>
      <div className="flex items-center gap-1.5">
        {streamer.is_live && <LiveBadge />}
        {streamer.platforms.map((p: Platform) => (
          <PlatformBadge key={p} platform={p} />
        ))}
      </div>
    </Link>
  );
}

function ViewAllRow({ query, onClick }: { query: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-1 w-full rounded-md border-t border-divider px-3 py-2 text-left text-xs text-accent-cyan hover:bg-background-highlight"
    >
      View all results for &ldquo;{query}&rdquo; →
    </button>
  );
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
