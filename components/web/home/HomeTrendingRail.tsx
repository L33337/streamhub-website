import type { PublicGame } from '@/lib/server/partner-api';
import type { TrendingGame } from '@/lib/server/trending';
import type { UiLang } from '@/lib/i18n-core';
import { hubLexFor } from '@/lib/i18n-hub';
import { formatCompactNumber } from '@/lib/format/number';
import {
  availableTrendingModes,
  buildTrendingOrders,
  type TrendingSortItem,
} from '@/lib/home/trending-sort';
import { FeedSectionHeader } from '@/components/web/feed/FeedSectionHeader';
import {
  HomeTrendingRailClient,
  type TrendingTile,
} from './HomeTrendingRailClient';

/**
 * "Trending on Twitch" rail, homepage edition (2026-07-27, sort control added
 * 2026-07-31): the tiles carry the /games catalog card's info block — top-
 * streamer name links, a metric line and the week-over-week trend — while
 * staying a horizontal rail. Trending entries come from the Twitch-wide
 * trending_games cache; stats/links exist only for games in OUR catalog
 * (gamesByName / catalogSlugByName), untracked games degrade to the plain
 * box-art tile and sort last in every metric mode.
 *
 * This component is the server boundary: it flattens the two Maps (which don't
 * serialize) into plain tiles, formats every number and picks every string, and
 * precomputes the sort permutations — the island below only holds the mode.
 */
export function HomeTrendingRail({
  trending,
  gamesByName,
  catalogSlugByName,
  locale = 'en',
}: {
  trending: TrendingGame[];
  /** Category name → catalog row; server-side only (Maps don't serialize). */
  gamesByName: Map<string, PublicGame>;
  catalogSlugByName: Map<string, string>;
  locale?: UiLang;
}) {
  if (trending.length === 0) return null;
  const L = hubLexFor(locale);

  const tiles: TrendingTile[] = trending.map((entry) => {
    const game = gamesByName.get(entry.game_name);
    const hours = game?.hours_28d ?? null;
    // `live_viewer_total` is null when no live stream of the category carries a
    // fresh (<25 min) viewer sample — an honest unknown, never "0 viewers".
    const viewers = game?.live_viewer_total ?? null;
    const streamers = game?.streamer_count ?? null;

    return {
      rank: entry.rank,
      name: entry.game_name,
      boxArtUrl: entry.box_art_url ?? game?.box_art_url ?? null,
      slug: catalogSlugByName.get(entry.game_name) ?? null,
      topStreamers: (game?.top_streamers ?? [])
        .filter((t) => t?.id && t?.name)
        .slice(0, 3)
        .map((t) => ({ id: t.id, name: t.name })),
      trendDelta: game?.trend_delta_percent ?? null,
      rankLabel: L.trending.rankOnTwitch(entry.rank),
      hoursLabel:
        hours != null
          ? L.homeFeed.hoursStreamed(formatCompactNumber(Math.round(hours), locale))
          : null,
      viewersLabel:
        viewers != null ? L.trending.liveViewers(formatCompactNumber(viewers, locale)) : null,
      streamersLabel:
        streamers != null
          ? L.trending.streamerCount(formatCompactNumber(streamers, locale), streamers)
          : null,
    };
  });

  const sortItems: TrendingSortItem[] = trending.map((entry) => {
    const game = gamesByName.get(entry.game_name);
    return {
      rank: entry.rank,
      hours28d: game?.hours_28d ?? null,
      liveViewers: game?.live_viewer_total ?? null,
      streamerCount: game?.streamer_count ?? null,
    };
  });

  return (
    <section aria-label={L.trending.aria}>
      <FeedSectionHeader title={L.trending.heading} />
      {/* Phone: the heading and the box art already say what this is, so the
          line only costs vertical space above the fold. It stays in the HTML
          (display:none) and the section's aria-label carries the same meaning,
          so nothing is lost for screen readers. `-mt-2 mb-3` go with it when
          it hides, which is exactly the spacing the sort control wants. */}
      <p className="-mt-2 mb-3 hidden text-xs text-text-muted sm:block">
        {L.trending.subtitle}
      </p>
      <HomeTrendingRailClient
        tiles={tiles}
        orders={buildTrendingOrders(sortItems)}
        modes={availableTrendingModes(sortItems)}
        strings={{
          aria: L.trending.sortAria,
          modes: {
            twitch: L.trending.sortTwitch,
            hours: L.trending.sortHours,
            viewers: L.trending.sortViewers,
            streamers: L.trending.sortStreamers,
          },
        }}
        locale={locale}
      />
    </section>
  );
}
