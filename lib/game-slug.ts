import type { PublicGame } from '@/lib/server/partner-api';

/**
 * Deterministic URL slug for a game/category name. Lowercased, diacritics
 * stripped, punctuation/spaces collapsed to single hyphens.
 *   "Just Chatting"      → "just-chatting"
 *   "Grand Theft Auto V" → "grand-theft-auto-v"
 *   "Counter-Strike"     → "counter-strike"
 *   "Pokémon"            → "pokemon"
 * Names that reduce to nothing (e.g. all symbols) return "" — callers should
 * skip those (they don't get a hub page).
 */
export function gameSlug(category: string): string {
  return category
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // non-alphanumerics → hyphen
    .replace(/^-+|-+$/g, ''); // trim leading/trailing hyphens
}

/**
 * Resolve a slug back to its game. Slugs are derived from category names, so we
 * match against the canonical list from /v1/games. Deterministic on the rare
 * collision: the first match wins, and the API returns popularity-desc order.
 */
export function findGameBySlug(games: PublicGame[], slug: string): PublicGame | null {
  return games.find((g) => gameSlug(g.category) === slug) ?? null;
}
