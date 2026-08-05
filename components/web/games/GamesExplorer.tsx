'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { PublicGame } from '@/lib/server/partner-api';
import { filterGames, type GamesSortMode } from '@/lib/games-sort';
import { GAMES_HUB_VIEWS, gamesHubPath } from '@/lib/games-hub';
import { localeHref, type UiLang } from '@/lib/i18n-core';
import { GameCard } from './GameCard';

/** M22 S4.1: server-resolved labels (HubLex.gamesExplorer). Defaults keep any
 *  label-less caller byte-identical to the old inline English. */
export interface GamesExplorerLabels {
  sectionAria: string;
  sortAria: string;
  sortLabels: Record<GamesSortMode, string>;
  searchPlaceholder: string;
  searchAria: string;
  /** {q} is replaced client-side with the query. */
  noMatch: string;
}

const EN_LABELS: GamesExplorerLabels = {
  sectionAria: 'All games and categories',
  sortAria: 'Sort games',
  sortLabels: { streamers: 'Most streamers', hours: 'Most streamed', trending: 'Trending' },
  searchPlaceholder: 'Search games…',
  searchAria: 'Search games',
  noMatch: 'No games match “{q}”.',
};

/**
 * Catalog grid for the /games hub views.
 *
 * Sorting is NOT client state: each mode is its own indexable URL
 * (/games, /games/most-streamed, /games/trending), so the switcher is a row of
 * real links and the server hands us the already-sorted list. That fixes two
 * things at once — the sorted views were previously invisible to crawlers, and
 * the switcher now works with JavaScript disabled.
 *
 * Search stays client-side: it is a pure narrowing of an already-rendered set,
 * has no standalone search intent worth indexing, and a server round trip per
 * keystroke would be worse UX.
 */
export function GamesExplorer({
  games,
  slugs,
  activeMode,
  priorityCount = 0,
  locale = 'en',
  labels = EN_LABELS,
}: {
  /** Already sorted by the server for `activeMode`. */
  games: PublicGame[];
  // Pre-computed on the server (gameSlug is deterministic, but computing it
  // once server-side keeps the client bundle from needing the games list twice).
  slugs: Record<string, string>;
  activeMode: GamesSortMode;
  // LCP hint: the first N cards get priority box art. Keyed off `games` — not
  // the filtered render order — so typing in the search box never reassigns
  // priority to new cards and fires useless late preloads.
  priorityCount?: number;
  /** M22 S4.1: keeps the switcher/card links in the viewer's locale tree. */
  locale?: UiLang;
  labels?: GamesExplorerLabels;
}) {
  const [query, setQuery] = useState('');

  const visible = useMemo(() => filterGames(games, query), [games, query]);

  const prioritized = useMemo(
    () => new Set(games.slice(0, priorityCount).map((g) => g.category)),
    [games, priorityCount]
  );

  return (
    <section aria-label={labels.sectionAria} className="mt-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label={labels.sortAria} className="flex overflow-hidden rounded-lg border border-border-default">
          {GAMES_HUB_VIEWS.map((v) => {
            const active = v.mode === activeMode;
            return (
              <Link
                key={v.mode}
                href={localeHref(locale, gamesHubPath(v))}
                // The active view links to itself; mark it as current rather
                // than emitting a self-referential navigation link.
                aria-current={active ? 'page' : undefined}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-accent-cyan/20 text-accent-cyan'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {labels.sortLabels[v.mode]}
              </Link>
            );
          })}
        </nav>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={labels.searchPlaceholder}
          aria-label={labels.searchAria}
          className="w-full max-w-xs rounded-lg border border-border-default bg-background-elevated px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-cyan/60 focus:outline-none"
        />
      </div>

      {visible.length === 0 ? (
        <p className="mt-6 text-sm text-text-muted">{labels.noMatch.replace('{q}', query)}</p>
      ) : (
        <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {visible.map((g) => (
            <li key={g.category}>
              <GameCard
                game={g}
                slug={slugs[g.category] ?? ''}
                priority={prioritized.has(g.category)}
                locale={locale}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
