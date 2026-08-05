import { describe, it, expect } from 'vitest';
import {
  buildFeedQuickFacts,
  countFeedQuickFacts,
  hasFeedQuickFacts,
  EMPTY_FEED_QUICK_FACTS,
  FEED_HISTOGRAM_MIN_SESSIONS,
  MIN_FEED_QUICK_FACTS,
} from '../quick-facts';
import { HEATMAP_CELLS } from '@/lib/game-heatmap';

/** 168 cells whose sum is exactly `total`, concentrated on one weekday-hour. */
function histogramPayload(total: number) {
  const cells = new Array<number>(HEATMAP_CELLS).fill(0);
  cells[20] = total; // Monday 20:00 UTC
  return { cells, total };
}

const MARATHON = {
  streamer_id: 'a',
  streamer_name: 'Streamer A',
  category: 'VALORANT',
  minutes: 245,
};
const COMEBACK = {
  streamer_id: 'b',
  streamer_name: 'Streamer B',
  gap_days: 23,
  returned_at: '2026-07-30T10:00:00Z',
};
const TOP_CATEGORY = { category: 'Just Chatting', sessions: 4, streamers: 2 };

describe('buildFeedQuickFacts', () => {
  it('parses every fact the RPC returned', () => {
    const facts = buildFeedQuickFacts([
      { fact_key: 'marathon', payload: MARATHON },
      { fact_key: 'comeback', payload: COMEBACK },
      { fact_key: 'start_histogram', payload: histogramPayload(40) },
      { fact_key: 'top_category', payload: TOP_CATEGORY },
    ]);
    expect(facts.marathon).toMatchObject({ streamerName: 'Streamer A', minutes: 245 });
    expect(facts.comeback).toMatchObject({ streamerName: 'Streamer B', gapDays: 23 });
    expect(facts.histogram?.total).toBe(40);
    expect(facts.topCategory).toMatchObject({ category: 'Just Chatting', sessions: 4 });
  });

  it('leaves omitted facts null — an absent fact is the empty state', () => {
    const facts = buildFeedQuickFacts([{ fact_key: 'marathon', payload: MARATHON }]);
    expect(facts.comeback).toBeNull();
    expect(facts.histogram).toBeNull();
    expect(facts.topCategory).toBeNull();
  });

  it('survives a malformed payload without losing the other facts', () => {
    const facts = buildFeedQuickFacts([
      { fact_key: 'marathon', payload: { streamer_id: 'a' } },
      { fact_key: 'comeback', payload: COMEBACK },
      { fact_key: 'start_histogram', payload: { cells: [1, 2, 3], total: 6 } },
    ]);
    expect(facts.marathon).toBeNull();
    expect(facts.histogram).toBeNull();
    expect(facts.comeback).not.toBeNull();
  });

  it('handles null / empty input', () => {
    expect(buildFeedQuickFacts(null)).toEqual(EMPTY_FEED_QUICK_FACTS);
    expect(buildFeedQuickFacts([])).toEqual(EMPTY_FEED_QUICK_FACTS);
  });

  it('accepts a marathon without a category (YouTube-only session)', () => {
    const facts = buildFeedQuickFacts([
      { fact_key: 'marathon', payload: { ...MARATHON, category: null } },
    ]);
    expect(facts.marathon).toMatchObject({ minutes: 245, category: null });
  });

  it('applies the feed histogram floor, not the homepage one', () => {
    const below = buildFeedQuickFacts([
      { fact_key: 'start_histogram', payload: histogramPayload(FEED_HISTOGRAM_MIN_SESSIONS - 1) },
    ]);
    const atFloor = buildFeedQuickFacts([
      { fact_key: 'start_histogram', payload: histogramPayload(FEED_HISTOGRAM_MIN_SESSIONS) },
    ]);
    expect(below.histogram).toBeNull();
    expect(atFloor.histogram?.total).toBe(FEED_HISTOGRAM_MIN_SESSIONS);
    // The homepage floor (200) would reject a sample this size — that it does
    // not here is the entire point of the parameter.
    expect(FEED_HISTOGRAM_MIN_SESSIONS).toBeLessThan(200);
  });
});

describe('countFeedQuickFacts / hasFeedQuickFacts', () => {
  it('counts the histogram twice — it backs two cards', () => {
    const facts = buildFeedQuickFacts([
      { fact_key: 'start_histogram', payload: histogramPayload(50) },
    ]);
    expect(countFeedQuickFacts(facts)).toBe(2);
    expect(hasFeedQuickFacts(facts)).toBe(true);
  });

  it('counts every fact', () => {
    const facts = buildFeedQuickFacts([
      { fact_key: 'marathon', payload: MARATHON },
      { fact_key: 'comeback', payload: COMEBACK },
      { fact_key: 'start_histogram', payload: histogramPayload(50) },
      { fact_key: 'top_category', payload: TOP_CATEGORY },
    ]);
    expect(countFeedQuickFacts(facts)).toBe(5);
  });

  it('hides the section below the minimum', () => {
    const single = buildFeedQuickFacts([{ fact_key: 'marathon', payload: MARATHON }]);
    expect(countFeedQuickFacts(single)).toBe(1);
    expect(MIN_FEED_QUICK_FACTS).toBe(2);
    expect(hasFeedQuickFacts(single)).toBe(false);
    expect(hasFeedQuickFacts(EMPTY_FEED_QUICK_FACTS)).toBe(false);
    expect(hasFeedQuickFacts(null)).toBe(false);
  });

  it('shows the section for two independent facts', () => {
    const pair = buildFeedQuickFacts([
      { fact_key: 'marathon', payload: MARATHON },
      { fact_key: 'top_category', payload: TOP_CATEGORY },
    ]);
    expect(hasFeedQuickFacts(pair)).toBe(true);
  });
});
