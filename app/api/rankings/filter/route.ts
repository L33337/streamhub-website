import type { NextRequest } from 'next/server';
import { getRankingPageSpec } from '@/lib/rankings';
import { toRankingRow } from '@/lib/rankings-row';
import {
  RANKING_FILTER_ROWS,
  type RankingFilterResponse,
} from '@/lib/rankings-filter-api';
import { matchesRankingFilters, rankingFacetItem } from '@/lib/rankings-facets';
import { normalizeLanguageCode } from '@/lib/home/filter-options';
import { findTopRankingMatches } from '@/lib/server/rankings-pool';
import { getLiveStreamerIdSet } from '@/lib/server/live-streamers';
import { getNextSlotByStreamer } from '@/lib/server/next-streams';
import { isUiLang, type UiLang } from '@/lib/i18n-core';
import { hubLexFor } from '@/lib/i18n-hub';

/**
 * Rows of ONE filtered leaderboard preview for the /rankings hub.
 *
 * GET /api/rankings/filter?metric=most-followed&category=Just+Chatting&language=de&locale=de
 *
 * Why a route and not client-side filtering: the pool of a metric is ~680
 * streamers and the top five of a rare-language selection can sit at rank 500,
 * so an honest "top 5 Italian streamers" needs the whole pool — which is far
 * too much data to ship into the page. The hub therefore ships only the filter
 * FACETS (a compact count table, lib/rankings-facets.ts) and asks here for the
 * five rows a selection actually shows.
 *
 * Everything the browser needs is resolved server-side into RankingRowDto
 * (formatted values, localized language names, trend titles), so the island
 * renders the very same component the server-rendered preview uses.
 *
 * Cheap by construction: the pool pages are the same hour-cached fetches the
 * hub page already warms (lib/server/rankings-pool.ts), the walk stops at the
 * fifth match, and identical selections are served from the CDN for 5 minutes.
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Longest category name we will look for (Twitch's longest is far below). */
const MAX_CATEGORY_LENGTH = 100;
/** Region-tagged codes ("pt-BR") are normalized, so this is generous. */
const MAX_LANGUAGE_LENGTH = 12;

export async function GET(req: NextRequest): Promise<Response> {
  const sp = req.nextUrl.searchParams;

  const spec = getRankingPageSpec(sp.get('metric') ?? '');
  if (!spec) {
    return Response.json({ error: 'unknown metric' }, { status: 400 });
  }
  const localeParam = sp.get('locale');
  const locale: UiLang = isUiLang(localeParam) ? localeParam : 'en';

  const category = (sp.get('category') ?? '').trim();
  if (category.length > MAX_CATEGORY_LENGTH) {
    return Response.json({ error: 'category too long' }, { status: 400 });
  }
  const languageRaw = (sp.get('language') ?? '').trim();
  if (languageRaw.length > MAX_LANGUAGE_LENGTH) {
    return Response.json({ error: 'language too long' }, { status: 400 });
  }
  // Same normalization the facets were counted with ("pt-BR" → "pt"), so a
  // hand-written request can't miss rows the dropdown would have matched.
  const language = normalizeLanguageCode(languageRaw) ?? '';

  try {
    // The pool walk is the long leg; the live set (60 s process cache + 60 s
    // data cache) runs alongside it rather than after it.
    const [entries, liveIds] = await Promise.all([
      findTopRankingMatches(
        spec,
        (entry) => matchesRankingFilters(rankingFacetItem(entry), category, language),
        RANKING_FILTER_ROWS,
      ),
      getLiveStreamerIdSet().catch(() => new Set<string>()),
    ]);

    // Only for the handful of rows we return — never for the whole pool.
    const nextSlots = await getNextSlotByStreamer(entries.map((e) => e.streamer.id));
    const lex = hubLexFor(locale).rankings;
    const rows = entries.map((entry) =>
      toRankingRow(entry, {
        columns: spec.columns,
        lex,
        locale,
        liveIds,
        nextSlots,
        // The hub's preview table has no "Main game" column — a sixth column
        // does not fit a phone (see RankingRowsTable).
      }),
    );

    const body: RankingFilterResponse = { rows };
    return Response.json(body, {
      headers: {
        // Public, cookie-free and identical for everyone asking the same
        // question — so the edge can answer repeats. Kept well under the
        // pool's 1 h data cache so a nightly rank change surfaces quickly.
        //
        // `max-age=0` is not redundant: without it the browser is free to
        // reuse a response heuristically (no validator, no Expires), and a
        // filter that answers with minutes-old rows while the page around it
        // is fresh reads as a bug. The shared cache still keeps its 5 minutes.
        'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (err) {
    console.error(
      `[rankings-filter] ${spec.metric} failed:`,
      err instanceof Error ? err.message : err,
    );
    return Response.json({ error: 'ranking filter failed' }, { status: 502 });
  }
}
