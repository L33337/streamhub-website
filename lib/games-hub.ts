// Pure view-model layer for the /games hub and its sorted sub-views.
//
// One registry entry per sort mode drives a real, separately-indexable page
// (/games, /games/most-streamed, /games/trending) so each targets its own head
// term instead of hiding behind client-side tab state. Same registry
// convention as lib/rankings.ts and lib/game-ranking.ts; all copy builders are
// pure and unit-tested in lib/__tests__/games-hub.test.ts.
//
// METRIC HONESTY: the hours view is named "most streamed", not "most watched".
// game_stats.hours_28d is sum(stream duration) — hours BROADCAST, not hours
// consumed (refresh_game_stats(), migration 20260720120000). We have no
// watch-time metric at all, so no page here may claim one. The tab carried the
// wrong "Most watched" label until 2026-07-20; do not reintroduce it.

import type { PublicGame } from '@/lib/server/partner-api';
import type { GamesSortMode } from '@/lib/games-sort';
import { MIN_INDEXABLE_GAME_STREAMERS } from '@/lib/rankings';
import { gameSlug } from '@/lib/game-slug';
import { formatCompactNumber } from '@/lib/format/number';
import { pickMetaDescription } from '@/lib/seo';

const SITE_URL = 'https://streamertimes.tv';

// Google truncation budgets — enforced by tests, not by runtime clamping, so a
// too-long string fails CI instead of silently shipping an ellipsis.
export const MAX_HUB_TITLE = 60;
export const MAX_HUB_DESC = 155;

const BRAND_SUFFIX = ' | StreamerTimes';

/**
 * Slow-moving inputs for <title>/<meta description>. Deliberately excludes
 * every live number: metadata that churns on each 10-minute regeneration
 * teaches Google the page is unstable, and the live figures are worth more in
 * the visible intro anyway (same rule as app/game/[slug]/page.tsx).
 */
export interface GamesHubMetaStats {
  /** Catalog size — changes by a handful of entries per day at most. */
  gameCount: number;
  /** Sum of hours_28d across the catalog; null when the aggregate is cold. */
  totalHours28d: number | null;
}

/** Volatile figures — visible copy only, never metadata. */
export interface GamesHubLiveStats {
  liveGameCount: number;
  liveStreamerCount: number;
}

export interface GamesHubViewSpec {
  mode: GamesSortMode;
  /**
   * URL segment under /games, or null for the canonical root view. Keep these
   * stable: they are indexed URLs, and renaming one silently drops its
   * accumulated ranking.
   */
  segment: string | null;
  /** Label on the view switcher. */
  navLabel: string;
  /** Trailing breadcrumb crumb; null for the root view (it IS "Games"). */
  crumb: string | null;
  h1: string;
  buildTitle: (stats: GamesHubMetaStats) => string;
  buildDescription: (stats: GamesHubMetaStats) => string;
  /** One-line explanation of what the ordering actually measures. */
  methodologyNote: string;
}

/** Canonical path for a view. */
export function gamesHubPath(spec: GamesHubViewSpec): string {
  return spec.segment ? `/games/${spec.segment}` : '/games';
}

export function gamesHubUrl(spec: GamesHubViewSpec): string {
  return `${SITE_URL}${gamesHubPath(spec)}`;
}

const withBrand = (core: string): string => core + BRAND_SUFFIX;

/** "260 games" / "1 game" — the only count allowed in metadata. */
function gameCountPhrase(count: number): string {
  return `${count} game${count === 1 ? '' : 's'}`;
}

export const GAMES_HUB_VIEWS: GamesHubViewSpec[] = [
  {
    mode: 'streamers',
    segment: null,
    navLabel: 'Most streamers',
    crumb: null,
    h1: 'Most popular games on Twitch & YouTube',
    // "Popular" is carried by streamer_count — how many tracked channels play
    // the category. Not a viewership claim.
    buildTitle: () => withBrand('Most Popular Games on Twitch & YouTube'),
    buildDescription: (s) =>
      `Browse ${gameCountPhrase(s.gameCount)} ranked by how many streamers play them. See who is live now, upcoming streams and predicted schedules.`,
    methodologyNote:
      'Ordered by how many streamers we track in each category over the last 28 days.',
  },
  {
    mode: 'hours',
    segment: 'most-streamed',
    navLabel: 'Most streamed',
    crumb: 'Most streamed',
    h1: 'Most streamed games on Twitch & YouTube',
    buildTitle: () => withBrand('Most Streamed Games on Twitch & YouTube'),
    buildDescription: (s) => {
      // The hours figure is the differentiator for this view, so it earns its
      // place in the description — but only when the aggregate is warm enough
      // to be meaningful (a cold table would print "0 hours").
      const hours =
        s.totalHours28d != null && s.totalHours28d >= 100
          ? ` Over ${formatCompactNumber(Math.round(s.totalHours28d))} hours streamed in 28 days.`
          : '';
      // ≤155 chars (Bing flags >160; with the hours clause this ran 165).
      return pickMetaDescription(
        `Which games get streamed the most? ${gameCountPhrase(s.gameCount)} ranked by broadcast hours on Twitch and YouTube.${hours}`,
        `Which games get streamed the most? ${gameCountPhrase(s.gameCount)} ranked by broadcast hours on Twitch and YouTube.`,
      );
    },
    methodologyNote:
      'Ordered by hours broadcast in the last 28 days — time streamed, not time watched.',
  },
  {
    mode: 'trending',
    segment: 'trending',
    navLabel: 'Trending',
    crumb: 'Trending',
    h1: 'Trending games on Twitch & YouTube',
    buildTitle: () => withBrand('Trending Games on Twitch & YouTube'),
    buildDescription: (s) =>
      `Which games are growing fastest right now? ${gameCountPhrase(s.gameCount)} ranked by week-over-week change in active streamers.`,
    methodologyNote:
      'Ordered by week-over-week change in the number of active streamers.',
  },
];

export const DEFAULT_GAMES_HUB_VIEW = GAMES_HUB_VIEWS[0];

/** Resolve a URL segment to its view. Returns null for unknown segments so the
 *  route can 404 rather than silently rendering the default. */
export function gamesHubViewBySegment(segment: string): GamesHubViewSpec | null {
  return GAMES_HUB_VIEWS.find((v) => v.segment === segment) ?? null;
}

/** Every non-root segment — feeds generateStaticParams and the sitemap. */
export function gamesHubSegments(): string[] {
  return GAMES_HUB_VIEWS.map((v) => v.segment).filter((s): s is string => s !== null);
}

/**
 * Would /game/<slug> be indexable? Mirrors isGameHubIndexable() using only the
 * fields a catalog row carries — it cannot see upcoming slots, so this is the
 * same deliberate over-approximation the sitemap uses (app/sitemap.ts). Used to
 * keep noindex hubs out of this page's ItemList: structured data that points at
 * noindex URLs contradicts the robots directive.
 */
export function isLikelyIndexableGame(game: PublicGame): boolean {
  return (
    game.streamer_count >= MIN_INDEXABLE_GAME_STREAMERS ||
    (game.live_streamer_count ?? 0) > 0
  );
}

// Mirrors the detail page's cap. An ItemList enumerating all ~260 catalog
// entries is both schema spam and mostly noindex URLs; the top slice carries
// the entity links that matter.
export const HUB_ITEMLIST_LIMIT = 20;

export interface HubItemListEntry {
  category: string;
  slug: string;
  topStreamerNames: string[];
}

/**
 * ItemList payload for a hub view: indexable games only, in the view's own
 * render order, capped. Takes games ALREADY sorted by the caller so the
 * structured data mirrors what the page renders.
 */
export function buildHubItemListEntries(
  sortedGames: PublicGame[],
  limit = HUB_ITEMLIST_LIMIT,
): HubItemListEntry[] {
  const out: HubItemListEntry[] = [];
  for (const g of sortedGames) {
    if (out.length >= limit) break;
    if (!isLikelyIndexableGame(g)) continue;
    const slug = gameSlug(g.category);
    if (!slug) continue;
    out.push({
      category: g.category,
      slug,
      topStreamerNames: (g.top_streamers ?? [])
        .map((t) => t?.name)
        .filter((n): n is string => !!n),
    });
  }
  return out;
}

/**
 * CollectionPage wrapping an ItemList — the page-level type for a curated
 * listing (the bare ItemList types the list, not the page). The ItemList nests
 * as mainEntity WITHOUT its own @context: one graph per script block, same
 * pattern as buildProfilePageJsonLd in lib/seo.ts.
 */
export function buildGamesCollectionPageJsonLd(params: {
  spec: GamesHubViewSpec;
  entries: HubItemListEntry[];
  description: string;
  dateModified: Date;
}): object {
  const { spec, entries, description, dateModified } = params;
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: spec.h1,
    description,
    url: gamesHubUrl(spec),
    dateModified: dateModified.toISOString(),
    mainEntity: {
      '@type': 'ItemList',
      name: spec.h1,
      numberOfItems: entries.length,
      itemListElement: entries.map((e, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: e.category,
        url: `${SITE_URL}/game/${e.slug}`,
        ...(e.topStreamerNames.length > 0 && {
          description: `${e.category} streamers on Twitch and YouTube, including ${e.topStreamerNames.join(', ')}.`,
        }),
      })),
    },
  };
}

/**
 * Visible intro paragraph. Live numbers are welcome here (unlike metadata) —
 * they are the page's freshest signal and cost nothing when they churn.
 * Every clause is dropped when its data is absent rather than printing a zero.
 */
export function buildGamesHubIntro(
  spec: GamesHubViewSpec,
  meta: GamesHubMetaStats,
  live: GamesHubLiveStats,
): string {
  const lead = `We track ${gameCountPhrase(meta.gameCount)} and categories across Twitch and YouTube.`;
  if (live.liveStreamerCount <= 0) {
    return `${lead} ${spec.methodologyNote}`;
  }
  const streamers = `${formatCompactNumber(live.liveStreamerCount)} streamer${live.liveStreamerCount === 1 ? ' is' : 's are'} live right now`;
  const across =
    live.liveGameCount > 0
      ? ` across ${live.liveGameCount} ${live.liveGameCount === 1 ? 'category' : 'categories'}`
      : '';
  return `${lead} ${streamers}${across}. ${spec.methodologyNote}`;
}

/**
 * Data-driven Q&A rendered under the grid — targets informational long-tail
 * queries ("what is the most streamed game on twitch"). Plain content only,
 * deliberately NO FAQPage JSON-LD: Google restricted FAQ rich results to
 * gov/health sites in 2023, so the copy itself is the whole value. Same
 * decision as lib/rankings.ts and lib/game-ranking.ts.
 *
 * Only questions whose data actually exists are emitted — never a Q&A that
 * answers itself with a zero or an empty name.
 */
export function buildGamesHubFaq(params: {
  spec: GamesHubViewSpec;
  meta: GamesHubMetaStats;
  live: GamesHubLiveStats;
  /** Top entries of THIS view's ordering, already sorted. */
  topGames: PublicGame[];
}): { q: string; a: string }[] {
  const { spec, meta, live, topGames } = params;
  const faq: { q: string; a: string }[] = [];
  const top = topGames[0];
  const second = topGames[1];

  if (top) {
    if (spec.mode === 'hours' && top.hours_28d != null && top.hours_28d > 0) {
      const runnerUp =
        second?.hours_28d != null
          ? `, ahead of ${second.category} with ${formatCompactNumber(Math.round(second.hours_28d))}`
          : '';
      faq.push({
        q: 'What is the most streamed game right now?',
        a: `${top.category} leads with about ${formatCompactNumber(Math.round(top.hours_28d))} hours broadcast in the last 28 days${runnerUp}. That measures time streamed, not time watched.`,
      });
    } else if (spec.mode === 'trending' && top.trend_delta_percent != null) {
      const delta = top.trend_delta_percent;
      const trail = second ? `, followed by ${second.category}` : '';
      // The #1 of a trend ranking is not necessarily growing — when the whole
      // catalog is contracting it merely declines least. Saying "growing
      // fastest" there would be a fabricated superlative.
      const a =
        delta > 0
          ? `${top.category} is growing fastest, with ${delta}% more active streamers week over week${trail}.`
          : delta === 0
            ? `${top.category} leads the ranking, but no category gained active streamers this week${trail}.`
            : `No category is growing right now. ${top.category} leads with the smallest decline, down ${Math.abs(delta)}% in active streamers week over week.`;
      faq.push({ q: 'Which games are trending right now?', a });
    } else if (spec.mode === 'streamers' && top.streamer_count > 0) {
      const runnerUp = second ? `, ahead of ${second.category} with ${second.streamer_count}` : '';
      faq.push({
        q: 'What is the most popular game on Twitch and YouTube?',
        a: `${top.category} has the most streamers we track — ${top.streamer_count} channel${top.streamer_count === 1 ? '' : 's'} streamed it in the last 28 days${runnerUp}.`,
      });
    }
  }

  if (live.liveStreamerCount > 0) {
    faq.push({
      q: 'Who is streaming right now?',
      a: `${live.liveStreamerCount} streamer${live.liveStreamerCount === 1 ? ' is' : 's are'} live across ${live.liveGameCount} ${live.liveGameCount === 1 ? 'category' : 'categories'}. Open any category to see the live channels and their upcoming streams.`,
    });
  }

  faq.push({
    q: 'How are these games ranked?',
    a: `${spec.methodologyNote} Figures come from a nightly aggregate of finished broadcasts across ${gameCountPhrase(meta.gameCount)}; live counts update every few minutes.`,
  });

  // The distinction that the old "Most watched" label got wrong. Worth stating
  // explicitly — it is also a real long-tail query.
  faq.push({
    q: 'Does "hours streamed" mean watch time?',
    a: 'No. Hours streamed is how long broadcasters were live in a category. We do not report viewer watch time; live viewer counts shown on the cards are a current sample, not a total.',
  });

  return faq;
}
