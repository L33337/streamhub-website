import { cache } from 'react';
import {
  getPartnerApi,
  PartnerApiError,
  type PublicGame,
} from '@/lib/server/partner-api';
import { fetchTrendingRail, type TrendingGame } from '@/lib/server/trending';
import { gameSlug } from '@/lib/game-slug';
import { floorToBucket } from '@/lib/home/logic';

/** The /games routes export `revalidate = 600`; the freshness stamp follows it. */
const GAMES_HUB_REVALIDATE_MS = 600_000;
import type { GamesHubLiveStats, GamesHubMetaStats } from '@/lib/games-hub';

export type GameWithSlug = PublicGame & { slug: string };

export interface GamesHubData {
  /** Catalog in API order (streamer_count desc); each entry has a usable slug. */
  games: GameWithSlug[];
  trending: TrendingGame[];
  meta: GamesHubMetaStats;
  live: GamesHubLiveStats;
  /** True when the catalog fetch degraded — render the error state, not an empty page. */
  failed: boolean;
  /** Generation time; feeds the visible freshness line and CollectionPage.dateModified. */
  generatedAt: Date;
}

/**
 * Single load of everything the /games hub views need, shared between
 * generateMetadata and the page body.
 *
 * `cache()` dedupes within one request — without it every view would fetch the
 * catalog twice per render (metadata + body). The fetches themselves are also
 * ISR-cached (revalidate 600), so this is about avoiding a redundant round trip
 * inside a single regeneration, not about correctness.
 *
 * Both fetches are failure-isolated: a thrown error during prerender aborts the
 * whole production build (2026-07-07 incident). A PartnerApiError degrades to
 * `failed`; anything else is a genuine bug and rethrows.
 */
export const loadGamesHub = cache(async (): Promise<GamesHubData> => {
  let games: PublicGame[] = [];
  let trending: TrendingGame[] = [];
  let failed = false;

  const [gamesResult, trendingResult] = await Promise.allSettled([
    getPartnerApi().listGames({ limit: 500, revalidate: 600 }),
    fetchTrendingRail(20),
  ]);

  if (gamesResult.status === 'fulfilled') {
    games = gamesResult.value.data;
  } else if (gamesResult.reason instanceof PartnerApiError) {
    failed = true;
  } else {
    throw gamesResult.reason;
  }
  if (trendingResult.status === 'fulfilled') {
    trending = trendingResult.value;
  }

  // Drop categories that slug to nothing — they have no hub URL, so a card
  // linking to /game/ would 404.
  const withSlug: GameWithSlug[] = games
    .map((g) => ({ ...g, slug: gameSlug(g.category) }))
    .filter((g) => g.slug.length > 0);

  // hours_28d is nullable per game (cold aggregate / old API row). Sum what
  // exists; null only when NOTHING does, so the copy can distinguish "no data"
  // from a genuine zero.
  let hoursSum = 0;
  let hoursSeen = false;
  let liveGameCount = 0;
  let liveStreamerCount = 0;
  for (const g of withSlug) {
    if (g.hours_28d != null) {
      hoursSum += g.hours_28d;
      hoursSeen = true;
    }
    const live = g.live_streamer_count ?? 0;
    if (live > 0) {
      liveGameCount++;
      liveStreamerCount += live;
    }
  }

  return {
    games: withSlug,
    trending,
    meta: { gameCount: withSlug.length, totalHours28d: hoursSeen ? hoursSum : null },
    live: { liveGameCount, liveStreamerCount },
    failed,
    // Floored to the route's 600 s ISR window (2026-08-29): the freshness line
    // and CollectionPage.dateModified render from this value, and a raw clock
    // made every regeneration of every locale/view byte-different — a billed
    // ISR write even when no game moved. The label now changes exactly when the
    // underlying data can change.
    generatedAt: floorToBucket(new Date(), GAMES_HUB_REVALIDATE_MS),
  };
});
