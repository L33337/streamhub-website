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
import { sizedAvatarUrl } from '@/lib/format/image-size';
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
  /**
   * Header mode (2026-07-31): below `lg` the field collapses to a 36px icon
   * button and opens as a panel under the header instead of competing for
   * width with the brand, the nav links and the sign-in button. Measured
   * before: on an iPad in portrait the field was down to 48px (es) and on a
   * phone to 22px — present, but far too small to type in.
   *
   * There is exactly ONE input in the DOM either way: the wrapper switches
   * between `hidden`, a fixed panel, and the normal inline field, so the
   * dropdown keeps anchoring to it and no state is duplicated.
   */
  collapsible?: boolean;
  /** aria-labels for the collapsed button and the panel's close button. */
  openLabel?: string;
  closeLabel?: string;
  /** M22 S4.1: remaining chrome strings, pre-localized by the server layout.
   *  Defaults keep every other caller byte-identical to the old inline text. */
  inputLabel?: string;
  searchingLabel?: string;
  errorLabel?: string;
  /** {q} is replaced with the query. */
  viewAllTemplate?: string;
}

export function SearchBar({
  className = '',
  locale = 'en',
  placeholder = 'Search streamers…',
  resultsLabel = 'Search results',
  collapsible = false,
  openLabel = 'Open search',
  closeLabel = 'Close search',
  inputLabel = 'Search streamers',
  searchingLabel = 'Searching…',
  errorLabel = 'Search is unavailable right now.',
  viewAllTemplate = 'View all results for “{q}” →',
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
  // Collapsed mode only: is the panel showing? Always false on the server, so
  // the header's static HTML is the collapsed one and hydration stays clean.
  const [expanded, setExpanded] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Close dropdown when navigating away. Syncs UI state with the URL — an
  // external system — which is the documented use case for useEffect.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setIsOpen(false);
    setQuery('');
    setResults([]);
    setFocusedIndex(-1);
    setExpanded(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [pathname]);

  // Click outside → close. In collapsed mode the panel folds away too, so a
  // tap anywhere on the page dismisses it (the button itself is excluded, or
  // its own click would reopen what this just closed).
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (!containerRef.current) return;
      const target = e.target as Node;
      if (containerRef.current.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setIsOpen(false);
      setExpanded(false);
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
          setError(errorLabel);
          setResults([]);
          setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query, errorLabel]);

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
        // First Escape closes the suggestions, a second one folds the mobile
        // panel away and hands focus back to the button that opened it.
        if (isOpen) {
          e.preventDefault();
          setIsOpen(false);
          setFocusedIndex(-1);
        } else if (expanded) {
          e.preventDefault();
          setExpanded(false);
          buttonRef.current?.focus();
        }
      } else if (e.key === 'Home' && isOpen) {
        e.preventDefault();
        setFocusedIndex(0);
      } else if (e.key === 'End' && isOpen) {
        e.preventDefault();
        setFocusedIndex(results.length - 1);
      }
    },
    [expanded, isOpen, results.length],
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

  // Three states, one input. Below `lg` the wrapper is either gone (collapsed)
  // or a fixed panel under the header — never an inline field, which is the
  // whole point: there is no width left for one. From `lg` up every collapsed
  // rule is overridden and the caller's own classes take over, so the desktop
  // header is byte-identical to before. Breakpoint variants are emitted after
  // base utilities, so `lg:relative` reliably beats `fixed`.
  const wrapperClass = !collapsible
    ? `relative ${className}`
    : [
        expanded
          ? 'fixed inset-x-3 top-[calc(var(--header-height)+0.5rem)] z-50 rounded-xl border border-border-default bg-background-elevated p-2 shadow-lg'
          : 'hidden',
        'lg:relative lg:inset-auto lg:z-auto lg:block lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none',
        className,
      ].join(' ');

  return (
    <>
      {collapsible && (
        <button
          ref={buttonRef}
          type="button"
          aria-label={openLabel}
          aria-expanded={expanded}
          onClick={() => {
            setExpanded(true);
            // The input mounts in the same commit; focusing it in the click
            // handler would race the layout, so hand it to the next frame.
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
          // Same 36px box and invisible 44px hit area as the hamburger next to
          // it — `--header-height` is a layout contract, the header must not
          // grow. `ml-auto` makes this the element that pushes the right-hand
          // controls over once the field is gone.
          // The `:has` clause is the 320px trade-off: brand, sign-in and the
          // hamburger are all shrink-0 and together already fill that screen,
          // so below 360px the search steps out — but ONLY while a sign-in
          // button is actually rendered next to it.
          className="relative ml-auto inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border-default bg-background-elevated text-text-secondary transition-colors before:absolute before:-inset-1 before:content-[''] hover:border-accent-cyan/40 hover:text-accent-cyan max-[359px]:[&:has(~[data-signin])]:hidden lg:hidden"
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
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </button>
      )}
      <div ref={containerRef} className={wrapperClass}>
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
          {inputLabel}
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
        {collapsible && (
          // Panel-only: the desktop field has no close button, so this one is
          // hidden from `lg` up rather than rendered conditionally on state —
          // one markup tree, no hydration branch.
          <button
            type="button"
            aria-label={closeLabel}
            onClick={() => {
              setExpanded(false);
              setIsOpen(false);
              buttonRef.current?.focus();
            }}
            className="relative ml-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors before:absolute before:-inset-1 before:content-[''] hover:bg-background-highlight hover:text-accent-cyan lg:hidden"
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
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </form>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 gradient-border max-h-96 overflow-y-auto">
          <div className="p-1">
            {loading && (
              <div className="px-3 py-2 text-xs text-text-muted">{searchingLabel}</div>
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
              <ViewAllRow
                label={viewAllTemplate.replace('{q}', trimmed)}
                onClick={() => navigateToSearch(query)}
              />
            )}
          </div>
        </div>
      )}
      </div>
    </>
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
          src={sizedAvatarUrl(streamer.avatar_url, 32)}
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

function ViewAllRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-1 w-full rounded-md border-t border-divider px-3 py-2 text-left text-xs text-accent-cyan hover:bg-background-highlight"
    >
      {label}
    </button>
  );
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
