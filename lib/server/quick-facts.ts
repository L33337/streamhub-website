import 'server-only';

// "Quick facts" for the anonymous homepage (rebuild 2026-07-27): four global
// aggregates over tables that already carry anon-read RLS policies —
// ai_predictions, stream_history, streamer_schedule_reliability, streamers.
// The signed-out siblings of the feed's per-favorites info cards. Each query
// is failure-isolated; a null fact simply hides its card.

import {
  buildPredictionAccuracy,
  floorToHourIso,
  reliabilityHits,
  type PredictionAccuracy,
} from '@/lib/home/logic';
import { anonRestGet } from './anon-rest';

const REVALIDATE_SECONDS = 3600;
const STREAMER_VISIBLE =
  'streamers.is_hidden=eq.false&streamers.approved=eq.true';

export interface HomeQuickFacts {
  /** Share of AI predictions (7d) that were evaluated accurate. */
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
}

interface PredictionRow {
  was_accurate: boolean | null;
}

interface PeakRow {
  streamer_id: string;
  peak_viewer_count: number | null;
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
  const rows = await anonRestGet<PredictionRow>(
    'ai_predictions?select=was_accurate' +
      `&evaluated_at=gte.${encodeURIComponent(since)}` +
      '&was_accurate=not.is.null&limit=1000',
    REVALIDATE_SECONDS,
  );
  if (!rows) return null;
  return buildPredictionAccuracy(rows);
}

async function fetchPeakFact(since: string): Promise<HomeQuickFacts['peak']> {
  const rows = await anonRestGet<PeakRow>(
    'stream_history?select=streamer_id,peak_viewer_count,streamers!inner(name,is_hidden,approved)' +
      '&source=eq.stream_slot' +
      `&ended_at=gte.${encodeURIComponent(since)}` +
      `&peak_viewer_count=not.is.null&${STREAMER_VISIBLE}` +
      '&order=peak_viewer_count.desc&limit=1',
    REVALIDATE_SECONDS,
  );
  const row = rows?.[0];
  if (!row || !row.streamers?.name || !row.peak_viewer_count) return null;
  return {
    streamerId: row.streamer_id,
    streamerName: row.streamers.name,
    peak: row.peak_viewer_count,
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

export async function fetchHomeQuickFacts(): Promise<HomeQuickFacts> {
  // Hour-bucketed timestamps → stable data-cache keys across 60 s re-renders.
  const nowHour = floorToHourIso(new Date());
  const weekAgo = floorToHourIso(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

  const [prediction, peak, reliable, pause] = await Promise.all([
    fetchPredictionFact(weekAgo),
    fetchPeakFact(weekAgo),
    fetchReliableFact(),
    fetchPauseFact(nowHour),
  ]);

  return { prediction, peak, reliable, pause };
}
