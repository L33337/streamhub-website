/**
 * Selection + formatting logic for the homepage "Streamer Wiki" grid
 * (2026-07-31) — the former `PopularStreamersFooter` pill list, rebuilt as
 * the app's Discover cards (src/components/DiscoverStreamerCard.tsx).
 *
 * The nine cards are a RANDOM draw from the eligible pool, redrawn on every
 * ISR regeneration, so the section cycles through the roster instead of
 * showing the same nine faces forever (same behaviour as the Discover grid
 * further up the page). The randomness is injected, never called here, so
 * tests stay deterministic.
 *
 * Everything that is NOT the draw stays deterministic — notably
 * `topCategoryOf`'s tie-break, so a streamer's category can't flip between
 * regenerations while the card set rotates around it.
 */

import { preferWithNextSlot, sampleRandom } from './logic';

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
 * How many candidates to draw before the chip preference trims back to
 * `count`. Oversampling is what lets the preference matter at all: draw
 * exactly nine and there is nothing to drop, so a chip-less streamer takes a
 * visible slot even when chip-capable ones were available.
 */
const OVERSAMPLE = 1.5;

/**
 * Picks the cards: a random draw from the eligible pool, redrawn per
 * regeneration.
 *
 * - `excludeIds` drops the streamers the Discover grid further up the page is
 *   already showing — two card grids with the same faces read as a bug.
 * - `withChipIds` are the streamers whose fact chip can be filled (live, or a
 *   known next start). Within the drawn sample they are floated to the front
 *   and the overflow is trimmed off the back, so the nine visible cards are
 *   the uniform ones. Chip-less candidates still qualify — they just lose
 *   ties, which keeps them in rotation instead of banning them.
 * - `statsById === null` means the stats FETCH FAILED (as opposed to an empty
 *   map, which means "queried, nobody has stats"). Requiring completeness then
 *   would silently delete the whole section, so the completeness gate is
 *   dropped and the cards render without category/stats lines.
 * - `random` is injected so tests can pin the draw; production passes
 *   `Math.random`. Passing `() => 0` yields the pool's own order untouched.
 */
export function pickWikiStreamers<T extends WikiStreamerInput>(
  popular: readonly T[],
  statsById: ReadonlyMap<string, WikiFeedStats> | null,
  excludeIds: ReadonlySet<string>,
  withChipIds: ReadonlySet<string>,
  count: number,
  random: () => number = Math.random,
): T[] {
  const seen = new Set<string>();
  const eligible = popular.filter((streamer) => {
    if (!streamer.id || excludeIds.has(streamer.id) || seen.has(streamer.id)) return false;
    seen.add(streamer.id);
    if (statsById === null) return true;
    return isComplete(streamer, statsById.get(streamer.id));
  });

  const capped = Math.max(0, count);
  const drawn = sampleRandom(eligible, Math.ceil(capped * OVERSAMPLE), random);
  return preferWithNextSlot(drawn, withChipIds, capped);
}
