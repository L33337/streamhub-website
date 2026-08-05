import 'server-only';

// Server-only companions of the signed-in feed (2026-08-03): the Rankings
// blocks and the Streamer Wiki.
//
// These live OUTSIDE loadFeed on purpose. Both read the Partner API, whose key
// never reaches the browser, and both describe slow-moving data (rankings
// refresh nightly, the popular roster hourly). loadFeed runs again on every
// client refresh — putting them there would re-fetch hourly-cached data every
// five minutes for nothing.
//
// Nothing in here may throw: /feed renders for a signed-in user and a degraded
// Partner API must cost them a section, not the page. getPartnerApi() itself
// throws when the env is unset, which is exactly the local-dev case.

import type { SupabaseClient } from '@supabase/supabase-js';
import { listFavoriteStreamers } from '@/lib/supabase/favorites';
import { getPartnerApi } from '@/lib/server/partner-api';
import type {
  PublicStreamSlot,
  PublicStreamer,
  PublicStreamerRankings,
  RankingMetric,
  RankingsResponse,
} from '@/lib/server/partner-api';
import { getNextSlotByStreamer } from '@/lib/server/next-streams';
import { getLiveStreamerIdSet } from '@/lib/server/live-streamers';
import { fetchStreamerFeedStats } from '@/lib/server/streamer-feed-stats';
import { pickWikiStreamers, type WikiFeedStats } from '@/lib/home/streamer-wiki';
import { WIKI_CARD_COUNT } from '@/components/web/home/HomeStreamerWiki';
import { RANKING_PAGES } from '@/lib/rankings';
import {
  buildFeedRankingsBlocks,
  pickResidualFavorites,
  type FeedRankingsData,
} from '@/lib/feed/rankings';

/**
 * Candidate pool for the wiki. 60 rather than the card count because the nine
 * cards are drawn at random and the pool needs completeness (bio + stats row +
 * top category + 28d streams); refresh_streamer_feed_stats() only covers
 * approved streamers, so roughly half the top of the list has no stats row.
 * Same reasoning and same number as the homepage.
 */
const WIKI_POOL = 60;

export interface FeedWikiData {
  streamers: PublicStreamer[];
  statsById: Map<string, WikiFeedStats> | null;
  nextSlots: Map<string, PublicStreamSlot>;
  liveIds: Set<string>;
}

export interface FeedExtras {
  rankings: FeedRankingsData | null;
  wiki: FeedWikiData | null;
}

export const EMPTY_FEED_EXTRAS: FeedExtras = { rankings: null, wiki: null };

/**
 * Loads both server-only feed sections in one wave.
 *
 * @param toHref wraps a site-relative path — the page passes
 *   `h => localeHref(locale, h)` so FeedClient can stay locale-free.
 */
export async function loadFeedExtras(
  supabase: SupabaseClient,
  toHref: (href: string) => string,
): Promise<FeedExtras> {
  let api: ReturnType<typeof getPartnerApi>;
  try {
    api = getPartnerApi();
  } catch {
    // No Partner API configured (local dev without the env pair) — both
    // sections are simply absent.
    return EMPTY_FEED_EXTRAS;
  }

  const [rankings, wiki] = await Promise.all([
    loadRankings(supabase, api, toHref).catch(() => null),
    loadWiki(supabase, api).catch(() => null),
  ]);

  return { rankings, wiki };
}

async function loadRankings(
  supabase: SupabaseClient,
  api: ReturnType<typeof getPartnerApi>,
  toHref: (href: string) => string,
): Promise<FeedRankingsData | null> {
  const favorites = await listFavoriteStreamers(supabase).catch(() => []);
  const favIds = favorites.map((streamer) => streamer.id);
  const nameMap: Record<string, string> = {};
  const avatarMap: Record<string, string> = {};
  favorites.forEach((streamer) => {
    nameMap[streamer.id] = streamer.name;
    if (streamer.avatar_url) avatarMap[streamer.id] = streamer.avatar_url;
  });

  // One top-100 page per metric. Failure-isolated: four working leaderboards
  // beat none. `getRankings` throws (unlike getStreamerRankings), so the
  // allSettled is load-bearing.
  const settled = await Promise.allSettled(
    RANKING_PAGES.map((spec) =>
      api.getRankings(spec.metric, { limit: 100, revalidate: 3600 }),
    ),
  );
  const responses: Partial<Record<RankingMetric, RankingsResponse | null>> = {};
  RANKING_PAGES.forEach((spec, index) => {
    const result = settled[index];
    responses[spec.metric] = result.status === 'fulfilled' ? result.value : null;
  });

  if (Object.values(responses).every((response) => !response)) return null;

  // Favorites the pages did not cover — one call each, already null-safe and
  // capped by pickResidualFavorites.
  const residualIds = pickResidualFavorites(favIds, responses);
  const residualResults = await Promise.all(
    residualIds.map((id) => api.getStreamerRankings(id, { revalidate: 3600 })),
  );
  const residual: Record<string, PublicStreamerRankings | null> = {};
  residualIds.forEach((id, index) => {
    residual[id] = residualResults[index];
  });

  const data = buildFeedRankingsBlocks({
    responses,
    residual,
    favIds,
    nameMap,
    avatarMap,
    toHref,
  });
  return data.blocks.length > 0 ? data : null;
}

async function loadWiki(
  supabase: SupabaseClient,
  api: ReturnType<typeof getPartnerApi>,
): Promise<FeedWikiData | null> {
  const popular = await api
    .listStreamers({ order: 'popular', limit: WIKI_POOL, revalidate: 300 })
    .then((response) => response.data)
    .catch(() => []);
  if (popular.length === 0) return null;

  const ids = popular.map((streamer) => streamer.id);
  const [statsResult, nextSlotsResult, liveIdsResult, favoritesResult] = await Promise.allSettled([
    fetchStreamerFeedStats(ids),
    getNextSlotByStreamer(ids),
    getLiveStreamerIdSet(),
    listFavoriteStreamers(supabase),
  ]);

  // null (fetch failed) and an empty Map (nobody has stats) mean different
  // things to pickWikiStreamers: null skips the completeness gate entirely
  // rather than rejecting every candidate.
  const statsById = statsResult.status === 'fulfilled' ? statsResult.value : null;
  const nextSlots =
    nextSlotsResult.status === 'fulfilled'
      ? nextSlotsResult.value
      : new Map<string, PublicStreamSlot>();
  const liveIds =
    liveIdsResult.status === 'fulfilled' ? liveIdsResult.value : new Set<string>();
  const favoriteIds = new Set(
    favoritesResult.status === 'fulfilled'
      ? favoritesResult.value.map((streamer) => streamer.id)
      : [],
  );

  // The wiki is the feed's DISCOVERY surface now, so streamers the viewer
  // already follows are excluded — they have their own sections above.
  const chipIds = new Set<string>([
    ...liveIds,
    ...[...nextSlots.entries()]
      .filter(([, slot]) => slot.slot_kind !== 'cancelled')
      .map(([id]) => id),
  ]);
  const streamers = pickWikiStreamers(
    popular,
    statsById,
    favoriteIds,
    chipIds,
    WIKI_CARD_COUNT,
    Math.random,
  );
  if (streamers.length === 0) return null;

  return { streamers, statsById, nextSlots, liveIds };
}
