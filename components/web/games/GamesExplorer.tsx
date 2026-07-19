'use client';

import { useMemo, useState } from 'react';
import type { PublicGame } from '@/lib/server/partner-api';
import { filterGames, sortGames, type GamesSortMode } from '@/lib/games-sort';
import { GameCard } from './GameCard';

const SORT_OPTIONS: { mode: GamesSortMode; label: string }[] = [
  { mode: 'streamers', label: 'Most streamers' },
  { mode: 'watched', label: 'Most watched' },
  { mode: 'trending', label: 'Trending' },
];

/**
 * Interactive catalog grid for /games: client-side search + sort over the
 * full server-fetched list. Rendered on the server too (SSR) — the default
 * sort ('streamers') matches the API order, so the crawlable HTML equals the
 * initial client view (no hydration mismatch, no SEO loss).
 */
export function GamesExplorer({
  games,
  slugs,
}: {
  games: PublicGame[];
  // Pre-computed on the server (gameSlug is deterministic, but computing it
  // once server-side keeps the client bundle from needing the games list twice).
  slugs: Record<string, string>;
}) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<GamesSortMode>('streamers');

  const visible = useMemo(
    () => sortGames(filterGames(games, query), mode),
    [games, query, mode]
  );

  return (
    <section aria-label="All games and categories">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Sort games"
          className="flex overflow-hidden rounded-lg border border-border-default"
        >
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.mode}
              type="button"
              onClick={() => setMode(opt.mode)}
              aria-pressed={mode === opt.mode}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                mode === opt.mode
                  ? 'bg-accent-cyan/20 text-accent-cyan'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search games…"
          aria-label="Search games"
          className="w-full max-w-xs rounded-lg border border-border-default bg-background-elevated px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-cyan/60 focus:outline-none"
        />
      </div>

      {visible.length === 0 ? (
        <p className="mt-6 text-sm text-text-muted">
          No games match &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {visible.map((g) => (
            <li key={g.category}>
              <GameCard game={g} slug={slugs[g.category] ?? ''} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
