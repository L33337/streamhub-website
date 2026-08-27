import 'server-only';

// Per-tier prediction accuracy for the public methodology page
// (/methodology/predictions, 2026-08-27). Sibling of the homepage's
// fetchPredictionFact (lib/server/quick-facts.ts): same anon-read table, same
// 7-day window, same scoring (buildPredictionAccuracy drops cancelled slots,
// whose evaluation semantics are inverted) — but one number per confidence
// tier and NO minimum percentage, because the page's whole point is to show
// what each badge has meant recently, LOW included.
//
// Failure-isolated like every anon-REST fact: a null tier hides its row, all
// three null hides the box. Never throws — a throw during prerender aborts
// the whole production build.

import { buildPredictionAccuracy, floorToHourIso, type PredictionAccuracy } from '@/lib/home/logic';
import type { ConfidenceLevel } from '@/lib/server/partner-api';
import { anonRestGetPaged } from './anon-rest';

const REVALIDATE_SECONDS = 3600;
const WINDOW_DAYS = 7;
/** Below this many graded predictions a percentage is noise, not a signal. */
const MIN_GRADED_PER_TIER = 20;

export type TierAccuracy = Record<ConfidenceLevel, PredictionAccuracy | null>;

export const CONFIDENCE_TIERS: readonly ConfidenceLevel[] = ['high', 'medium', 'low'];

interface PredictionRow {
  was_accurate: boolean | null;
  slot_kind: string | null;
}

async function fetchTier(level: ConfidenceLevel, since: string): Promise<PredictionAccuracy | null> {
  // `order` is mandatory for the paged walk (offset pagination over an
  // unordered set duplicates/drops rows); newest-first so a truncated walk
  // still describes the most recent week.
  const rows = await anonRestGetPaged<PredictionRow>(
    'ai_predictions?select=was_accurate,slot_kind' +
      `&confidence=eq.${level}` +
      `&evaluated_at=gte.${encodeURIComponent(since)}` +
      '&was_accurate=not.is.null&order=evaluated_at.desc',
    REVALIDATE_SECONDS,
  );
  if (rows.length === 0) return null;
  return buildPredictionAccuracy(rows, MIN_GRADED_PER_TIER, 0);
}

export async function fetchPredictionAccuracyByTier(): Promise<TierAccuracy> {
  // Hour-bucketed `since` → stable data-cache keys across re-renders.
  const nowHour = floorToHourIso(new Date());
  const since = new Date(Date.parse(nowHour) - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const [high, medium, low] = await Promise.all(
    CONFIDENCE_TIERS.map((level) => fetchTier(level, since).catch(() => null)),
  );
  return { high, medium, low };
}

/** True when at least one tier has a number to show. */
export function hasAnyTierAccuracy(tiers: TierAccuracy): boolean {
  return CONFIDENCE_TIERS.some((level) => tiers[level] !== null);
}
