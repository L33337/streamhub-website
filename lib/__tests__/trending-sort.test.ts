import { describe, expect, it } from 'vitest';
import {
  availableTrendingModes,
  buildTrendingOrders,
  type TrendingSortItem,
} from '../home/trending-sort';

function item(overrides: Partial<TrendingSortItem> & { rank: number }): TrendingSortItem {
  return {
    hours28d: null,
    liveViewers: null,
    streamerCount: null,
    ...overrides,
  };
}

// Mirrors the real prod shape: Twitch's top games, of which some are missing
// from our catalog and some have no fresh viewer sample.
const ITEMS: TrendingSortItem[] = [
  item({ rank: 1, hours28d: 4108, liveViewers: 16335, streamerCount: 242 }), // Just Chatting
  item({ rank: 2, hours28d: 2121, liveViewers: 53475, streamerCount: 70 }), // League of Legends
  item({ rank: 3, hours28d: 404, liveViewers: null, streamerCount: 17 }), // Rust, no fresh sample
  item({ rank: 4 }), // not in our catalog at all
  item({ rank: 5, hours28d: 833, liveViewers: 30191, streamerCount: 53 }), // IRL
];

/** Reads an order back as the Twitch ranks it puts on screen. */
function ranks(order: number[]): number[] {
  return order.map((index) => ITEMS[index].rank);
}

describe('buildTrendingOrders', () => {
  it('twitch mode is the identity — the served HTML order', () => {
    expect(buildTrendingOrders(ITEMS).twitch).toEqual([0, 1, 2, 3, 4]);
  });

  it('hours mode sorts by hours_28d desc', () => {
    expect(ranks(buildTrendingOrders(ITEMS).hours)).toEqual([1, 2, 5, 3, 4]);
  });

  it('viewers mode sorts by live viewer total desc', () => {
    expect(ranks(buildTrendingOrders(ITEMS).viewers)).toEqual([2, 5, 1, 3, 4]);
  });

  it('streamers mode sorts by streamer_count desc', () => {
    expect(ranks(buildTrendingOrders(ITEMS).streamers)).toEqual([1, 2, 5, 3, 4]);
  });

  it('puts unknown metrics last and keeps them in Twitch order', () => {
    const items = [
      item({ rank: 1 }),
      item({ rank: 2, hours28d: 10 }),
      item({ rank: 3 }),
    ];
    expect(ranks2(items, buildTrendingOrders(items).hours)).toEqual([2, 1, 3]);
  });

  it('never treats an unknown metric as zero', () => {
    const items = [item({ rank: 1 }), item({ rank: 2, liveViewers: 0 })];
    // The tracked 0 outranks the unknown, even though it sits lower on Twitch.
    expect(ranks2(items, buildTrendingOrders(items).viewers)).toEqual([2, 1]);
  });

  it('breaks ties by Twitch rank asc (deterministic across server and client)', () => {
    const items = [
      item({ rank: 7, hours28d: 100 }),
      item({ rank: 3, hours28d: 100 }),
      item({ rank: 5, hours28d: 100 }),
    ];
    expect(ranks2(items, buildTrendingOrders(items).hours)).toEqual([3, 5, 7]);
  });

  it('does not mutate the input array', () => {
    const input = [...ITEMS];
    buildTrendingOrders(input);
    expect(input.map((entry) => entry.rank)).toEqual(ITEMS.map((entry) => entry.rank));
  });

  it('handles an empty list', () => {
    const orders = buildTrendingOrders([]);
    expect(orders.twitch).toEqual([]);
    expect(orders.viewers).toEqual([]);
  });
});

describe('availableTrendingModes', () => {
  it('offers every mode when the data is there', () => {
    expect(availableTrendingModes(ITEMS)).toEqual([
      'twitch',
      'hours',
      'viewers',
      'streamers',
    ]);
  });

  it('drops the viewers mode at night, when nothing has a fresh sample', () => {
    const items = ITEMS.map((entry) => ({ ...entry, liveViewers: null }));
    expect(availableTrendingModes(items)).toEqual(['twitch', 'hours', 'streamers']);
  });

  it('drops a mode whose metric is zero everywhere', () => {
    const items = ITEMS.map((entry) => ({ ...entry, liveViewers: 0 }));
    expect(availableTrendingModes(items)).not.toContain('viewers');
  });

  it('always offers the Twitch order, even with no catalog data at all', () => {
    const items = [item({ rank: 1 }), item({ rank: 2 })];
    expect(availableTrendingModes(items)).toEqual(['twitch']);
  });
});

function ranks2(items: TrendingSortItem[], order: number[]): number[] {
  return order.map((index) => items[index].rank);
}
