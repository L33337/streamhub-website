import type { ListGamesOptions, PublicGame } from './partner-api';
import { findGameBySlug } from '@/lib/game-slug';

/**
 * The part of the Partner API client the resolver needs (keeps it testable
 * with a plain stub).
 */
interface GamesApi {
  listGames(opts?: ListGamesOptions): Promise<{ data: PublicGame[] }>;
}

export interface ResolvedGame {
  game: PublicGame;
  /**
   * The default catalog (>= 3 streamers). Link lists (related games, chips)
   * must be filtered against THIS list, never against the fallback, so a thin
   * category is reachable by URL but never linked.
   */
  catalog: PublicGame[];
  /** False when the game came from the thin-tail fallback lookup. */
  inCatalog: boolean;
}

/**
 * Fallback catalog floor and size. The API caps `limit` at 1000; the view
 * held 978 categories on 2026-09-13, 799 of them below the default floor of 3.
 * A slug that misses here too is unknown (404).
 */
const FALLBACK_MIN_STREAMERS = 1;
const FALLBACK_LIMIT = 1000;
/**
 * One URL for every miss (the call carries no slug), so a bot sweeping
 * thousands of dead game URLs costs at most one Partner API call per window.
 */
const FALLBACK_REVALIDATE_SECONDS = 600;

/** Only slugs `gameSlug()` can produce are worth a second lookup. */
const PLAUSIBLE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Resolve a `/game/<slug>` style slug (SEO F5, 2026-09).
 *
 * Game URLs used to 404 as soon as a category dropped below the catalog floor
 * of 3 streamers, which happens every night somewhere in the tail: crawlers
 * had indexed the URL while it qualified, then kept receiving 404s (485 bot
 * 404s on /game/* in 48 h). Now a category that still exists renders; its own
 * thin-content gates (`isGameHubIndexable`, `isRankingIndexable`, the
 * best-time `usable` flag) make it `noindex,follow` instead of gone.
 *
 * Throws when the CATALOG call fails, exactly like the callers' previous
 * direct `listGames` call, so their existing failure handling is unchanged.
 * A failing fallback call resolves to null (the pre-F5 answer: not found).
 *
 * `catalogOptions` must be the caller's existing catalog call, so the data
 * cache entry stays shared with every other `listGames({ limit: 500 })` on the
 * site.
 */
export async function resolveGameBySlug(
  api: GamesApi,
  slug: string,
  catalogOptions: ListGamesOptions = { limit: 500 },
): Promise<ResolvedGame | null> {
  const { data: catalog } = await api.listGames(catalogOptions);
  const game = findGameBySlug(catalog, slug);
  if (game) return { game, catalog, inCatalog: true };
  if (!PLAUSIBLE_SLUG.test(slug)) return null;

  try {
    const { data: all } = await api.listGames({
      limit: FALLBACK_LIMIT,
      minStreamers: FALLBACK_MIN_STREAMERS,
      revalidate: FALLBACK_REVALIDATE_SECONDS,
    });
    const thin = findGameBySlug(all, slug);
    return thin ? { game: thin, catalog, inCatalog: false } : null;
  } catch {
    return null;
  }
}
