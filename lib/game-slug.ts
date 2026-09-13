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
 * Which of two games sharing a slug owns the URL: more streamers wins, ties go
 * to the category name that sorts first by UTF-16 code units (deliberately not
 * `localeCompare`, whose order depends on the runtime's ICU data).
 *
 * Collisions are real: `game_stats` is case-sensitive, so a Twitch rename
 * leaves "BOMBANANA!" and "Bombanana!" (or "SILENT HILL 2" / "Silent Hill 2")
 * side by side, and both slug to the same URL. Before this rule the winner was
 * whichever row the API listed first, which flipped with every nightly
 * popularity change and moved the page between two categories.
 */
function ownsSlug(candidate: PublicGame, current: PublicGame): boolean {
  if (candidate.streamer_count !== current.streamer_count) {
    return candidate.streamer_count > current.streamer_count;
  }
  return candidate.category < current.category;
}

/**
 * Resolve a slug back to its game. Slugs are derived from category names, so we
 * match against the canonical list from /v1/games. On a collision the result is
 * independent of list order (see `ownsSlug`).
 */
export function findGameBySlug(games: readonly PublicGame[], slug: string): PublicGame | null {
  let best: PublicGame | null = null;
  for (const game of games) {
    if (gameSlug(game.category) !== slug) continue;
    if (best === null || ownsSlug(game, best)) best = game;
  }
  return best;
}

/**
 * One game per slug, the same winner `findGameBySlug` resolves, in the order
 * the winners appear in the input. Games whose name slugs to "" are dropped
 * (they have no page). For URL lists such as the sitemap, which would
 * otherwise emit the same URL twice.
 */
export function dedupeGamesBySlug(games: readonly PublicGame[]): PublicGame[] {
  const winners = new Map<string, PublicGame>();
  for (const game of games) {
    const slug = gameSlug(game.category);
    if (!slug) continue;
    const current = winners.get(slug);
    if (current === undefined || ownsSlug(game, current)) winners.set(slug, game);
  }
  const kept = new Set(winners.values());
  return games.filter((g) => kept.has(g));
}
