// Pure view-model for the feed's "Your favorites in numbers" section
// (2026-08-03) — the personalized sibling of the homepage Quick facts.
//
// Payloads come from the `feed_quick_facts(p_streamer_ids)` RPC (StreamHub
// migration 20260803090000), which returns the SAME four fact shapes as
// `home_quick_facts()`. That is why the parsers are imported rather than
// rewritten: a divergence between the two would be invisible until a card
// rendered wrong.
//
// Two things do differ, both because the sample is one viewer's favorites
// rather than the whole roster:
//   * the histogram floor (FEED_HISTOGRAM_MIN_SESSIONS) is far lower, and
//   * the copy is comparative, not superlative — a homepage card may claim
//     "more streams start at 8 PM than at any other hour"; over ten channels
//     that would be a claim about noise, so the feed says "most of your
//     favorites' streams start around 8 PM".
//
// No clock and no fetching here, so every rule stays unit-testable
// (lib/feed/__tests__/quick-facts.test.ts).

import {
  parseComeback,
  parseMarathon,
  parseStartHistogram,
  parseTopCategory,
  type ComebackFact,
  type MarathonFact,
  type StartHistogramFact,
  type TopCategoryFact,
} from '@/lib/home/quick-facts';

/**
 * Sample-size floor for the two histogram-derived cards.
 *
 * The homepage needs 200 sessions before it will name a peak hour; across a
 * handful of favorites that threshold is never reached, so the cards would be
 * dead code. 30 sessions is roughly a week of activity from four regular
 * streamers — enough that the peak is a habit rather than a coincidence, and
 * the softened wording carries the rest of the uncertainty.
 */
export const FEED_HISTOGRAM_MIN_SESSIONS = 30;

/**
 * Below this the section hides entirely: a lone card under its own heading
 * reads as a bug rather than a stat (the homepage's MIN_QUICK_FACT_CARDS rule).
 */
export const MIN_FEED_QUICK_FACTS = 2;

/** Cards rendered at once. The pool is small, so there is no rotation here. */
export const FEED_QUICK_FACTS_VISIBLE = 4;

export interface FeedQuickFacts {
  marathon: MarathonFact | null;
  comeback: ComebackFact | null;
  /** Feeds BOTH the prime-time and the busiest-day card. */
  histogram: StartHistogramFact | null;
  topCategory: TopCategoryFact | null;
}

export const EMPTY_FEED_QUICK_FACTS: FeedQuickFacts = {
  marathon: null,
  comeback: null,
  histogram: null,
  topCategory: null,
};

export interface FeedQuickFactRow {
  fact_key: string;
  payload: unknown;
}

/**
 * Parses the RPC's `(fact_key, payload)` rows. A fact the RPC omitted — or one
 * whose payload does not parse — stays null, and its card simply does not
 * render. A malformed row must never take the section down with it.
 */
export function buildFeedQuickFacts(rows: FeedQuickFactRow[] | null | undefined): FeedQuickFacts {
  const byKey = new Map<string, unknown>();
  for (const row of rows ?? []) {
    if (row && typeof row.fact_key === 'string') byKey.set(row.fact_key, row.payload);
  }
  return {
    marathon: parseMarathon(byKey.get('marathon')),
    comeback: parseComeback(byKey.get('comeback')),
    histogram: parseStartHistogram(byKey.get('start_histogram'), FEED_HISTOGRAM_MIN_SESSIONS),
    topCategory: parseTopCategory(byKey.get('top_category')),
  };
}

/**
 * How many CARDS the facts yield — not how many facts are set. The histogram
 * backs two cards (prime time + busiest day), so it counts twice. This is the
 * one function both the section's hide rule and the page's nav chip read, so
 * the two can never disagree about whether the section exists.
 */
export function countFeedQuickFacts(facts: FeedQuickFacts): number {
  let count = 0;
  if (facts.marathon) count += 1;
  if (facts.comeback) count += 1;
  if (facts.histogram) count += 2;
  if (facts.topCategory) count += 1;
  return count;
}

export function hasFeedQuickFacts(facts: FeedQuickFacts | null | undefined): boolean {
  return Boolean(facts) && countFeedQuickFacts(facts!) >= MIN_FEED_QUICK_FACTS;
}
