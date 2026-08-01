import 'server-only';

// "Quick facts" for the anonymous homepage (rebuild 2026-07-27, expanded
// 2026-08-01): global aggregates over tables that already carry anon-read RLS
// policies — ai_predictions, stream_history, streamer_schedule_reliability,
// streamers — plus the M24 timing ranking from the Partner API. The signed-out
// siblings of the feed's per-favorites info cards. Every query is
// failure-isolated; a null fact simply hides its card.

import {
  buildPredictionAccuracy,
  floorToHourIso,
  reliabilityHits,
  type PredictionAccuracy,
} from '@/lib/home/logic';
import {
  parseComeback,
  parseMarathon,
  parseStartHistogram,
  parseTopCategory,
  pickCompetitionFact,
  pickRoomToGrowFact,
  type ComebackFact,
  type CompetitionFact,
  type MarathonFact,
  type RoomToGrowFact,
  type StartHistogramFact,
  type TopCategoryFact,
} from '@/lib/home/quick-facts';
import { gameSlug } from '@/lib/game-slug';
import { getPartnerApi } from '@/lib/server/partner-api';
import { anonRestGet } from './anon-rest';

const REVALIDATE_SECONDS = 3600;
const STREAMER_VISIBLE =
  'streamers.is_hidden=eq.false&streamers.approved=eq.true';

export interface HomeQuickFacts {
  /** Share of HIGH-confidence AI predictions (7d) that hit the ±2h window. */
  prediction: PredictionAccuracy | null;
  /** Highest concurrent-viewer peak of the week. */
  peak: { streamerId: string; streamerName: string; peak: number } | null;
  /** Best M14 time-reliability among reliable-tier streamers. */
  reliable: {
    streamerId: string;
    streamerName: string;
    hits: number;
    total: number;
    pct: number;
  } | null;
  /** Next announced vacation/break. */
  pause: { streamerId: string; streamerName: string; until: string } | null;
  /** Longest uninterrupted broadcast of the last 7 days. */
  marathon: MarathonFact | null;
  /** Longest verified break that ended in the last 7 days. */
  comeback: ComebackFact | null;
  /** 168-cell UTC start histogram — feeds the prime-time AND busiest-day card. */
  startHistogram: StartHistogramFact | null;
  /** Most-streamed Twitch category of the last 7 days. */
  topCategory: TopCategoryFact | null;
  /** Category running the most tracked channels side by side (M24). */
  competition: CompetitionFact | null;
  /** Best viewers-per-channel score among uncontested categories (M24). */
  roomToGrow: RoomToGrowFact | null;
  /** Hub slug of `topCategory`, resolved against the /v1/games catalog. */
  topCategoryLink: { slug: string; hasHub: boolean } | null;
}

/** Every fact absent — the degraded shape callers fall back to. */
export const EMPTY_QUICK_FACTS: HomeQuickFacts = {
  prediction: null,
  peak: null,
  reliable: null,
  pause: null,
  marathon: null,
  comeback: null,
  startHistogram: null,
  topCategory: null,
  competition: null,
  roomToGrow: null,
  topCategoryLink: null,
};

/**
 * How many cards the section would render. Exported so the section-nav chip in
 * app/[locale]/page.tsx and the component's own hide rule read from ONE list —
 * a chip pointing at an absent section was the drift this replaces.
 */
export function countQuickFacts(facts: HomeQuickFacts): number {
  return [
    facts.prediction,
    facts.peak,
    facts.reliable,
    facts.pause,
    facts.marathon,
    facts.comeback,
    // One histogram, two independent cards (prime time + busiest day).
    facts.startHistogram,
    facts.startHistogram,
    facts.topCategory,
    facts.competition,
    facts.roomToGrow,
  ].filter(Boolean).length;
}

interface PredictionRow {
  was_accurate: boolean | null;
  slot_kind: string | null;
}

interface PeakRow {
  streamer_id: string;
  viewer_count: number | null;
  streamers: { name: string } | null;
}

interface ReliabilityRow {
  streamer_id: string;
  time_hit_rate: number;
  time_sample: number;
  streamers: { name: string } | null;
}

interface PauseRow {
  id: string;
  name: string;
  vacation_until: string;
}

async function fetchPredictionFact(since: string): Promise<PredictionAccuracy | null> {
  // Row-level count instead of a Prefer:count=exact header — the JSON body
  // survives the Next data-cache unambiguously. PostgREST caps the response at
  // its max-rows anyway; the explicit limit makes the sample size deterministic.
  //
  // HIGH-confidence only (UX round 2026-07-27): the tile headlines its
  // percentage, and the all-confidence mix — dragged down by exploratory
  // LOW/MEDIUM no-shows — sat near 50% and read as a coin flip. The HIGH
  // tier is the population the visible confidence badges actually promise
  // (~74% ±2h in prod at the time of the change). Cancelled slot_kind rows
  // are filtered in buildPredictionAccuracy, where NULL handling is free.
  const rows = await anonRestGet<PredictionRow>(
    'ai_predictions?select=was_accurate,slot_kind' +
      '&confidence=eq.high' +
      `&evaluated_at=gte.${encodeURIComponent(since)}` +
      '&was_accurate=not.is.null&limit=1000',
    REVALIDATE_SECONDS,
  );
  if (!rows) return null;
  return buildPredictionAccuracy(rows);
}

async function fetchPeakFact(since: string): Promise<HomeQuickFacts['peak']> {
  // Source of truth for concurrent viewers is the hourly sampling table —
  // stream_history.peak_viewer_count is NULL on all recent rows in prod
  // (verified 2026-07-27), so the old stream_history query never produced a
  // card.
  const rows = await anonRestGet<PeakRow>(
    'stream_viewer_samples?select=streamer_id,viewer_count,streamers!inner(name,is_hidden,approved)' +
      `&sampled_at=gte.${encodeURIComponent(since)}` +
      `&${STREAMER_VISIBLE}` +
      '&order=viewer_count.desc&limit=1',
    REVALIDATE_SECONDS,
  );
  const row = rows?.[0];
  if (!row || !row.streamers?.name || !row.viewer_count) return null;
  return {
    streamerId: row.streamer_id,
    streamerName: row.streamers.name,
    peak: row.viewer_count,
  };
}

async function fetchReliableFact(): Promise<HomeQuickFacts['reliable']> {
  const rows = await anonRestGet<ReliabilityRow>(
    'streamer_schedule_reliability?select=streamer_id,time_hit_rate,time_sample,streamers!inner(name,is_hidden,approved)' +
      `&time_tier=eq.reliable&time_sample=gte.5&${STREAMER_VISIBLE}` +
      '&order=time_hit_rate.desc,time_sample.desc&limit=1',
    REVALIDATE_SECONDS,
  );
  const row = rows?.[0];
  if (!row || !row.streamers?.name) return null;
  const hits = reliabilityHits(row.time_hit_rate, row.time_sample);
  return {
    streamerId: row.streamer_id,
    streamerName: row.streamers.name,
    hits,
    total: row.time_sample,
    pct: Math.round(row.time_hit_rate * 100),
  };
}

async function fetchPauseFact(nowIso: string): Promise<HomeQuickFacts['pause']> {
  const rows = await anonRestGet<PauseRow>(
    'streamers?select=id,name,vacation_until' +
      `&vacation_until=gt.${encodeURIComponent(nowIso)}` +
      '&is_hidden=eq.false&approved=eq.true' +
      '&order=vacation_until.asc&limit=1',
    REVALIDATE_SECONDS,
  );
  const row = rows?.[0];
  if (!row) return null;
  return { streamerId: row.id, streamerName: row.name, until: row.vacation_until };
}

interface RpcFactRow {
  fact_key: string;
  payload: unknown;
}

/**
 * The four history-derived facts in ONE call. They need window functions
 * (session de-duplication, comeback gaps) and a GROUP BY over ~11k rows, so
 * they live in the STABLE `home_quick_facts()` SQL function instead of being
 * downloaded row by row — see supabase/migrations/20260801150000 in the
 * StreamHub repo. STABLE is what lets PostgREST serve it over GET, which is
 * what keeps it inside the Next data cache.
 *
 * The function omits a fact entirely when nothing qualifies, so a missing key
 * is the normal empty state, not an error.
 */
async function fetchRpcFacts(): Promise<Map<string, unknown>> {
  const rows = await anonRestGet<RpcFactRow>('rpc/home_quick_facts', REVALIDATE_SECONDS);
  const byKey = new Map<string, unknown>();
  for (const row of rows ?? []) {
    if (typeof row?.fact_key === 'string') byKey.set(row.fact_key, row.payload);
  }
  return byKey;
}

interface TimingFacts {
  competition: CompetitionFact | null;
  roomToGrow: RoomToGrowFact | null;
  hubCategories: ReadonlySet<string>;
}

/**
 * The two M24 timing cards. `category_timing_stats` is service-role-only (no
 * anon policy), so this goes through the Partner API rather than PostgREST.
 *
 * The catalog call is byte-identical (URL + revalidate) to the one the
 * homepage already makes for its /game link check, so both share a single
 * data-cache entry — no extra request in the steady state. Everything is
 * best-effort: a degraded API drops the two cards, never the section.
 */
async function fetchTimingFacts(): Promise<TimingFacts> {
  const empty: TimingFacts = {
    competition: null,
    roomToGrow: null,
    hubCategories: new Set<string>(),
  };
  let api: ReturnType<typeof getPartnerApi>;
  try {
    api = getPartnerApi();
  } catch {
    // Unset PARTNER_API_* (local dev without credentials) — not an outage.
    return empty;
  }

  const [catalog, best] = await Promise.allSettled([
    api.listGames({ limit: 500, revalidate: 600 }),
    api.listBestGamesToStream(),
  ]);

  const hubCategories =
    catalog.status === 'fulfilled'
      ? new Set(catalog.value.data.map((game) => game.category))
      : new Set<string>();
  if (best.status !== 'fulfilled') return { ...empty, hubCategories };

  return {
    competition: pickCompetitionFact(best.value.data, hubCategories),
    roomToGrow: pickRoomToGrowFact(best.value.data, hubCategories),
    hubCategories,
  };
}

export async function fetchHomeQuickFacts(): Promise<HomeQuickFacts> {
  // Hour-bucketed timestamps → stable data-cache keys across 60 s re-renders.
  const nowHour = floorToHourIso(new Date());
  const weekAgo = floorToHourIso(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

  const [prediction, peak, reliable, pause, rpc, timing] = await Promise.all([
    fetchPredictionFact(weekAgo),
    fetchPeakFact(weekAgo),
    fetchReliableFact(),
    fetchPauseFact(nowHour),
    fetchRpcFacts(),
    fetchTimingFacts(),
  ]);

  const topCategory = parseTopCategory(rpc.get('top_category'));
  const topCategorySlug = topCategory ? gameSlug(topCategory.category) : '';

  return {
    prediction,
    peak,
    reliable,
    pause,
    marathon: parseMarathon(rpc.get('marathon')),
    comeback: parseComeback(rpc.get('comeback')),
    startHistogram: parseStartHistogram(rpc.get('start_histogram')),
    topCategory,
    competition: timing.competition,
    roomToGrow: timing.roomToGrow,
    topCategoryLink: topCategory
      ? {
          slug: topCategorySlug,
          hasHub:
            topCategorySlug.length > 0 && timing.hubCategories.has(topCategory.category),
        }
      : null,
  };
}
