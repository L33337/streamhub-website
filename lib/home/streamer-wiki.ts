/**
 * Selection + formatting logic for the homepage "Streamer Wiki" grid
 * (2026-07-31) — the former `PopularStreamersFooter` pill list, rebuilt as
 * the app's Discover cards (src/components/DiscoverStreamerCard.tsx).
 *
 * Pure and deterministic on purpose: the section is server-rendered into a
 * statically regenerated page, so the same inputs must always produce the
 * same 9 cards in the same order — no Math.random, no Date.now.
 */

/** One row of the nightly `streamer_feed_stats` cache, as the grid needs it. */
export interface WikiFeedStats {
  streamerId: string;
  topCategory: string | null;
  streams28d: number | null;
}

/** The subset of PublicStreamer the pick actually reads. */
export interface WikiStreamerInput {
  id: string;
  description: string | null;
  description_en?: string | null;
}

/**
 * The category a streamer spent most of the last 28 days in.
 *
 * `category_shares` is a fraction map ({"League of Legends": 0.95, …}) written
 * by `refresh_streamer_feed_stats()`. Equal shares are broken alphabetically
 * rather than by object key order — two categories at exactly 0.5 must not
 * flip between regenerations just because PostgREST serialized the JSON
 * differently.
 */
export function topCategoryOf(shares: Record<string, number> | null | undefined): string | null {
  if (!shares) return null;
  let best: string | null = null;
  let bestShare = -1;
  for (const [category, share] of Object.entries(shares)) {
    if (typeof share !== 'number' || !Number.isFinite(share) || share <= 0) continue;
    if (!category) continue;
    if (share > bestShare || (share === bestShare && best !== null && category < best)) {
      best = category;
      bestShare = share;
    }
  }
  return best;
}

/**
 * Bio snippet for a card. The full 350-550 char description already lives on
 * /streamer/<id>; shipping it verbatim on the homepage too would duplicate 9
 * streamer bios onto the site's most important page. CSS `line-clamp` would
 * hide it visually but leave every character in the DOM, so the cut happens
 * here — at a word boundary, with an ellipsis only when something was
 * actually removed.
 */
export function truncateBio(text: string, max = 180): string {
  const clean = text.trim().replace(/\s+/g, ' ');
  if (clean.length <= max) return clean;
  const head = clean.slice(0, max);
  const lastSpace = head.lastIndexOf(' ');
  // A "word" longer than the budget (CJK bios have no spaces at all) falls
  // back to the hard cut rather than collapsing to an empty string.
  const cut = lastSpace > max * 0.6 ? head.slice(0, lastSpace) : head;
  return `${cut.replace(/[\s,.;:!?—-]+$/, '')}…`;
}

/**
 * A card is only worth showing when it can carry the full app-card anatomy:
 * a bio, a category and a 28-day activity count. `refresh_streamer_feed_stats()`
 * filters `approved = true`, so roughly half of the most-watched streamers
 * have NO stats row at all — those would render as a name and an avatar next
 * to fully populated neighbours.
 */
function isComplete(
  streamer: WikiStreamerInput,
  stats: WikiFeedStats | undefined,
): boolean {
  if (!streamer.description && !streamer.description_en) return false;
  if (!stats) return false;
  return Boolean(stats.topCategory) && typeof stats.streams28d === 'number' && stats.streams28d > 0;
}

/**
 * Picks the cards, in popularity order (the caller passes the list already
 * sorted by the Partner API's `order=popular`).
 *
 * - `excludeIds` drops the streamers the Discover grid further up the page is
 *   already showing — two card grids with the same faces read as a bug.
 * - `withChipIds` are the streamers whose fact chip can be filled (live, or a
 *   known next start). They are floated to the front, relative order intact,
 *   so the visible cards are the uniform ones. Chip-less candidates still
 *   qualify — they just lose ties.
 * - `statsById === null` means the stats FETCH FAILED (as opposed to an empty
 *   map, which means "queried, nobody has stats"). Requiring completeness then
 *   would silently delete the whole section, so the completeness gate is
 *   dropped and the cards render without category/stats lines.
 */
export function pickWikiStreamers<T extends WikiStreamerInput>(
  popular: readonly T[],
  statsById: ReadonlyMap<string, WikiFeedStats> | null,
  excludeIds: ReadonlySet<string>,
  withChipIds: ReadonlySet<string>,
  count: number,
): T[] {
  const seen = new Set<string>();
  const eligible = popular.filter((streamer) => {
    if (!streamer.id || excludeIds.has(streamer.id) || seen.has(streamer.id)) return false;
    seen.add(streamer.id);
    if (statsById === null) return true;
    return isComplete(streamer, statsById.get(streamer.id));
  });

  const withChip = eligible.filter((streamer) => withChipIds.has(streamer.id));
  const withoutChip = eligible.filter((streamer) => !withChipIds.has(streamer.id));
  return [...withChip, ...withoutChip].slice(0, Math.max(0, count));
}
