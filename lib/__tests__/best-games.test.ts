import { describe, expect, it } from 'vitest';
import type { BestGameEntry } from '../server/partner-api';
import {
  BEST_GAMES_DISPLAY_LIMIT,
  MIN_INDEXABLE_BEST_GAMES,
  buildBestGameRows,
  isBestGamesIndexable,
  sortBestGameRows,
} from '../best-games';

const ENTRIES: BestGameEntry[] = [
  {
    category: 'Dead by Daylight',
    overall_score: 80,
    avg_viewers: 400,
    avg_streamers: 5,
    best_slot: { dow: 1, hour: 20, score: 90, viewers: 450, streamers: 5 },
    tracked_streamers: 8,
    is_trending: false,
    box_art_url: 'https://img/dbd.jpg',
  },
  {
    category: 'Fortnite',
    overall_score: 50,
    avg_viewers: 250,
    avg_streamers: 5,
    tracked_streamers: 5,
    is_trending: true,
  },
  {
    category: 'Valorant',
    overall_score: 158.7,
    avg_viewers: 238,
    avg_streamers: 1.5,
    tracked_streamers: 6,
  },
];

const HUBS = new Set(['Dead by Daylight', 'Valorant']);

describe('buildBestGameRows', () => {
  it('sanitizes, resolves hub linking and sorts by score desc', () => {
    const rows = buildBestGameRows(ENTRIES, HUBS);
    expect(rows.map((r) => r.category)).toEqual(['Valorant', 'Dead by Daylight', 'Fortnite']);
    expect(rows[0].hasHub).toBe(true);
    expect(rows[2].hasHub).toBe(false); // Fortnite not in the hub catalog
    expect(rows[1].bestSlot?.hour).toBe(20);
    expect(rows[2].isTrending).toBe(true);
  });

  it('drops rows without a finite score and junk categories', () => {
    const rows = buildBestGameRows(
      [
        { category: 'No Score' },
        { category: '', overall_score: 10 },
        { category: 'Bad', overall_score: Number.NaN },
        { category: 'Ok', overall_score: 5, tracked_streamers: 5 },
      ],
      new Set(),
    );
    expect(rows.map((r) => r.category)).toEqual(['Ok']);
  });

  it('caps the rendered list', () => {
    const many = Array.from({ length: BEST_GAMES_DISPLAY_LIMIT + 20 }, (_, i) => ({
      category: `Game ${i}`,
      overall_score: 1000 - i,
      tracked_streamers: 5,
    }));
    expect(buildBestGameRows(many, new Set()).length).toBe(BEST_GAMES_DISPLAY_LIMIT);
  });
});

describe('sortBestGameRows', () => {
  const rows = buildBestGameRows(
    [
      ...ENTRIES,
      { category: 'No Streamer Avg', overall_score: 70, avg_streamers: null, tracked_streamers: 5 },
    ],
    HUBS,
  );

  it('opportunity: score desc', () => {
    const sorted = sortBestGameRows(rows, 'opportunity');
    expect(sorted[0].category).toBe('Valorant');
  });

  it('competition: fewest avg live channels first, nulls last', () => {
    const sorted = sortBestGameRows(rows, 'competition');
    expect(sorted[0].category).toBe('Valorant'); // 1.5 channels
    expect(sorted[sorted.length - 1].category).toBe('No Streamer Avg'); // null → last
  });

  it('does not mutate the input order', () => {
    const before = rows.map((r) => r.category);
    sortBestGameRows(rows, 'competition');
    expect(rows.map((r) => r.category)).toEqual(before);
  });
});

describe('isBestGamesIndexable', () => {
  it('gates on the row count', () => {
    expect(isBestGamesIndexable(MIN_INDEXABLE_BEST_GAMES)).toBe(true);
    expect(isBestGamesIndexable(MIN_INDEXABLE_BEST_GAMES - 1)).toBe(false);
    expect(isBestGamesIndexable(0)).toBe(false);
  });
});
