// Pure view-model for the signed-in feed's "Rankings" blocks (2026-08-03).
//
// One block per metric: the global top 3, then where the viewer's OWN
// favorites sit on that leaderboard. The point of the section is the second
// half — "#47 of 236, ▲3" for a channel you follow is information no public
// page gives you, because no public page knows who you follow.
//
// Two data sources feed it, and they must produce identical-looking rows:
//   * the top-100 page of /v1/rankings/{metric} — covers the leaders AND any
//     favorite inside the first 100, in one request per metric;
//   * /v1/streamers/{id}/rankings per favorite that appeared in NO top 100 —
//     the API ranks live and unbounded, so a #340 gets a real 340.
// Everything below therefore formats from a raw metric VALUE rather than from
// a RankingsResponse row, so a favorite renders the same either way.
//
// Hrefs arrive pre-built: FeedClient carries no locale, so the caller passes
// `toHref` (the page wraps localeHref) and the client just renders strings.
//
// All display logic lives here; the components stay markup-only and every rule
// is unit-tested (lib/feed/__tests__/rankings.test.ts).

import type {
  PublicRankingEntry,
  PublicStreamerRankings,
  RankingMetric,
  RankingsResponse,
} from '@/lib/server/partner-api';
import {
  RANKING_PAGES,
  formatHitRate,
  formatHours,
  formatSignedCompact,
  sanitizeRankingEntries,
} from '@/lib/rankings';
import { MIN_POOL_SIZE, rankTrend, rankingHref, type RankTrend } from '@/lib/streamer-rankings';
import { formatCompactNumber } from '@/lib/format/number';

/**
 * Favorites resolved through a per-streamer rankings call when they missed
 * every top-100 page. Each is one HTTP round trip (1 h data-cached, shared
 * with that streamer's own page), so the tail is capped rather than unbounded:
 * a viewer with 300 favorites must not turn one feed render into 300 requests.
 * Favorites are consulted in the order the caller supplies them.
 */
export const RESIDUAL_RANKINGS_CAP = 20;

/** Favorite rows shown before the "more of your favorites" disclosure opens. */
export const RANKINGS_FAV_ROWS = 2;

export interface FeedRankingRow {
  streamerId: string;
  name: string;
  rank: number;
  /** Pool size behind the rank — the denominator of "#7 of 236". */
  total: number;
  /** Pre-formatted metric value, e.g. "2.1M", "+12.4K", "182.5 h", "92%". */
  value: string;
  trend: RankTrend;
  /** Deep link to the exact leaderboard row, already locale-prefixed. */
  href: string;
  isFavorite: boolean;
  avatarUrl: string | null;
}

export interface FeedRankingsBlock {
  metric: RankingMetric;
  /** Localized-free English label from the ranking registry, e.g. "Most punctual". */
  title: string;
  /** Link to the full leaderboard, already locale-prefixed. */
  href: string;
  top3: FeedRankingRow[];
  /** Best-placed favorites not already shown in top3. */
  favRows: FeedRankingRow[];
  /** The remaining placed favorites — rendered inside a disclosure. */
  moreFavRows: FeedRankingRow[];
}

export interface FeedRiser {
  streamerId: string;
  name: string;
  /** Pre-formatted signed gain, e.g. "+12.4K". */
  gainLabel: string;
  href: string;
}

export interface FeedRankingsData {
  blocks: FeedRankingsBlock[];
  /** Fastest-growing favorite — feeds the inline "on the rise" info card. */
  favRiser: FeedRiser | null;
}

export interface BuildFeedRankingsInput {
  /** One top-100 response per metric; a missing/failed metric is simply absent. */
  responses: Partial<Record<RankingMetric, RankingsResponse | null>>;
  /** Per-streamer rankings for favorites outside every top 100. null = call failed. */
  residual?: Record<string, PublicStreamerRankings | null>;
  /** The viewer's favorite streamer ids, in the order residual calls were spent. */
  favIds: readonly string[];
  /** Favorite id → display name. Required for residual rows (no streamer object there). */
  nameMap?: Record<string, string>;
  avatarMap?: Record<string, string>;
  /** Wraps a site-relative href, e.g. `h => localeHref(locale, h)`. Identity by default. */
  toHref?: (href: string) => string;
}

function compactOrDash(value: number | null | undefined): string {
  const text = formatCompactNumber(value ?? null, 'en');
  return text === '' ? '—' : text;
}

/**
 * Metric → value formatter. These mirror the `primary: true` column of each
 * RANKING_PAGES spec, but take a bare number: the per-streamer endpoint hands
 * us a scalar `value`, not a RankingValues object, and a favorite must not
 * render "182.5 h" from one source and "182" from the other.
 */
const VALUE_FORMATTERS: Record<RankingMetric, (value: number | null | undefined) => string> = {
  'most-followed': compactOrDash,
  'fastest-growing': formatSignedCompact,
  'most-watched': compactOrDash,
  'most-active': formatHours,
  'most-reliable': formatHitRate,
};

/**
 * Ranks worth showing — the streamer page's rule (lib/streamer-rankings.ts).
 * "#1 of 2" reads as an achievement but isn't.
 */
function isMeaningfulPlacement(rank: number, total: number): boolean {
  return (
    Number.isInteger(rank) &&
    rank >= 1 &&
    Number.isInteger(total) &&
    total >= MIN_POOL_SIZE &&
    rank <= total
  );
}

/**
 * Rank movement vs the ~7-day snapshot baseline. Deliberately the 2-argument
 * `rankTrend` of lib/streamer-rankings, NOT the entry-based one in
 * lib/rankings: that one has a 'new' state, which on an UNBOUNDED rank would
 * assert a rise that may never have happened — snapshots only reach 100 deep,
 * so a missing baseline usually means "was outside the top 100", not "new".
 * Unknown → no arrow.
 */
function trendOf(rank: number, previousRank: number | null | undefined): RankTrend {
  return rankTrend(rank, previousRank ?? null);
}

export function buildFeedRankingsBlocks(input: BuildFeedRankingsInput): FeedRankingsData {
  const {
    responses,
    residual = {},
    favIds,
    nameMap = {},
    avatarMap = {},
    toHref = (href) => href,
  } = input;

  const favSet = new Set(favIds);
  const blocks: FeedRankingsBlock[] = [];
  let riser: (FeedRiser & { gain: number }) | null = null;

  for (const spec of RANKING_PAGES) {
    const response = responses[spec.metric];
    if (!response || !Array.isArray(response.data) || response.data.length === 0) continue;

    // Sanitize BEFORE slicing: it drops value-less rows and re-ranks densely,
    // which is also what the /rankings page renders — so a "#rank-n" deep link
    // built here lands on the row that page shows under that number.
    const entries = sanitizeRankingEntries(spec, response.data);
    if (entries.length === 0) continue;

    const total = response.pagination?.total ?? entries.length;
    const formatValue = VALUE_FORMATTERS[spec.metric];
    const blockHref = toHref(`/rankings/${spec.slug}`);

    const rowFromEntry = (entry: PublicRankingEntry): FeedRankingRow => ({
      streamerId: entry.streamer.id,
      name: entry.streamer.name,
      rank: entry.rank,
      total,
      value: formatValue(spec.primaryValue(entry)),
      trend: trendOf(entry.rank, entry.values.previous_rank),
      href: toHref(rankingHref(spec.metric, entry.rank)),
      isFavorite: favSet.has(entry.streamer.id),
      avatarUrl: entry.streamer.avatar_url ?? avatarMap[entry.streamer.id] ?? null,
    });

    const rankedRows = entries.filter((entry) => isMeaningfulPlacement(entry.rank, total));
    if (rankedRows.length === 0) continue;

    const top3 = rankedRows.slice(0, 3).map(rowFromEntry);
    const shownIds = new Set(top3.map((row) => row.streamerId));

    // Favorites that made the top-100 page but sit below the podium. A favorite
    // ALREADY badged in top3 is excluded here rather than repeated, which is
    // what lets the next-best favorite take the freed slot.
    const favFromPage = rankedRows
      .filter((entry) => favSet.has(entry.streamer.id) && !shownIds.has(entry.streamer.id))
      .map(rowFromEntry);

    // A favorite carried by the fetched page never also reads from residual:
    // the page row is the richer one (it has an avatar) and both describe the
    // same placement.
    const seenFavIds = new Set(
      rankedRows.filter((e) => favSet.has(e.streamer.id)).map((e) => e.streamer.id),
    );

    // Favorites outside the fetched page — one per-streamer call each, already
    // capped by the caller. A failed call (null) or a metric the streamer does
    // not place in is omitted silently: an absent row is honest, a "—" is not.
    const favFromResidual: FeedRankingRow[] = [];
    for (const favId of favIds) {
      if (seenFavIds.has(favId)) continue;
      const placement = residual[favId]?.rankings?.find((p) => p.metric === spec.metric);
      if (!placement) continue;
      if (!isMeaningfulPlacement(placement.rank, placement.total)) continue;
      const name = nameMap[favId];
      if (!name) continue;
      favFromResidual.push({
        streamerId: favId,
        name,
        rank: placement.rank,
        total: placement.total,
        value: formatValue(placement.value),
        trend: trendOf(placement.rank, placement.previous_rank),
        href: toHref(rankingHref(spec.metric, placement.rank)),
        isFavorite: true,
        avatarUrl: avatarMap[favId] ?? null,
      });
    }

    const favAll = [...favFromPage, ...favFromResidual].sort((a, b) => a.rank - b.rank);

    blocks.push({
      metric: spec.metric,
      title: spec.navLabel,
      href: blockHref,
      top3,
      favRows: favAll.slice(0, RANKINGS_FAV_ROWS),
      moreFavRows: favAll.slice(RANKINGS_FAV_ROWS),
    });

    // The riser card rides the fastest-growing block: the data is already here,
    // so it costs no extra request. Only a POSITIVE gain qualifies — "gained
    // −2.1K followers" is not a card anyone wants about someone they follow.
    if (spec.metric === 'fastest-growing') {
      const favRowsForRiser = [...top3.filter((row) => row.isFavorite), ...favAll];
      for (const row of favRowsForRiser) {
        const gain = gainForRow(row.streamerId, rankedRows, residual);
        if (gain == null || gain <= 0) continue;
        if (riser && riser.gain >= gain) continue;
        riser = {
          streamerId: row.streamerId,
          name: row.name,
          gainLabel: formatSignedCompact(gain),
          href: row.href,
          gain,
        };
      }
    }
  }

  return {
    blocks,
    favRiser: riser ? { streamerId: riser.streamerId, name: riser.name, gainLabel: riser.gainLabel, href: riser.href } : null,
  };
}

/** Raw follower gain for a streamer, from whichever source carried them. */
function gainForRow(
  streamerId: string,
  entries: PublicRankingEntry[],
  residual: Record<string, PublicStreamerRankings | null>,
): number | null {
  const entry = entries.find((e) => e.streamer.id === streamerId);
  if (entry) {
    const gain = entry.values.follower_gain_7d;
    return typeof gain === 'number' && Number.isFinite(gain) ? gain : null;
  }
  const placement = residual[streamerId]?.rankings?.find((p) => p.metric === 'fastest-growing');
  const value = placement?.value;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Favorites that need a per-streamer rankings call, in the caller's favorite
 * order and capped at RESIDUAL_RANKINGS_CAP.
 *
 * A favorite qualifies unless it already appears in EVERY successfully fetched
 * top-100 page. Membership in one metric's top 100 must not suppress the call,
 * because one call returns all five placements: skipping it would show that
 * streamer under "Most followed" and silently omit them from the other four
 * blocks they also place in — the same streamer looking less ranked than a
 * smaller one whose call did happen. Being in all five top-100s is rare, so
 * this is usually "every favorite up to the cap"; when it does hit, the call
 * is genuinely redundant.
 */
export function pickResidualFavorites(
  favIds: readonly string[],
  responses: Partial<Record<RankingMetric, RankingsResponse | null>>,
  cap: number = RESIDUAL_RANKINGS_CAP,
): string[] {
  const fetched = Object.values(responses).filter(
    (response): response is RankingsResponse => Boolean(response?.data?.length),
  );
  if (fetched.length === 0) return [];

  const idsPerMetric = fetched.map(
    (response) => new Set(response.data.map((entry) => entry?.streamer?.id).filter(Boolean)),
  );

  return favIds
    .filter((id) => !idsPerMetric.every((ids) => ids.has(id)))
    .slice(0, Math.max(0, cap));
}
