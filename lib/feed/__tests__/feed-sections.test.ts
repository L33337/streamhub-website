// Tests for the feed sections added in the 2026-08-03 expansion round:
// the favorites week leaderboard and the personalized trending rail.

import { describe, it, expect } from 'vitest';
import {
  buildWeekLeaderboard,
  computeFavoritesWeekTotals,
  personalizeTrendingGames,
} from '../logic';
import type {
  FavoriteWeekHistoryRow,
  FeedClip,
  FeedRecentStream,
  HomeLiveEntry,
  StreamSlot,
  TrendingGame,
} from '../types';

const SINCE = new Date('2026-07-27T00:00:00Z');
const NOW = new Date('2026-08-03T00:00:00Z');

function historyRow(
  streamerId: string,
  startedAt: string,
  hours: number,
  category: string | null = null,
): FavoriteWeekHistoryRow {
  const start = new Date(startedAt);
  const end = new Date(start.getTime() + hours * 3_600_000);
  return {
    streamer_id: streamerId,
    started_at: start.toISOString(),
    ended_at: end.toISOString(),
    duration_minutes: Math.round(hours * 60),
    category,
  };
}

const NAMES = { a: 'Streamer A', b: 'Streamer B', c: 'Streamer C' };

describe('buildWeekLeaderboard', () => {
  it('ranks favorites by hours live and carries their session count', () => {
    const rows = [
      historyRow('a', '2026-07-28T18:00:00Z', 4),
      historyRow('a', '2026-07-30T18:00:00Z', 5),
      historyRow('b', '2026-07-29T20:00:00Z', 3),
    ];
    const entries = buildWeekLeaderboard(rows, SINCE, NOW, NAMES);
    expect(entries.map((e) => e.streamerId)).toEqual(['a', 'b']);
    expect(entries[0]).toMatchObject({ name: 'Streamer A', sessions: 2 });
    expect(entries[0].hours).toBeCloseTo(9);
    expect(entries[1].hours).toBeCloseTo(3);
  });

  it('folds split VODs and simulcast twins into one session', () => {
    // Two rows 10 minutes apart (Twitch VOD split) plus a YouTube twin of the
    // first — three rows, one 4h session. Counting rows would say 3 sessions
    // and ~7h.
    const rows: FavoriteWeekHistoryRow[] = [
      historyRow('a', '2026-07-28T18:00:00Z', 2),
      { ...historyRow('a', '2026-07-28T18:00:00Z', 2), category: 'Just Chatting' },
      historyRow('a', '2026-07-28T20:10:00Z', 1.83),
      historyRow('b', '2026-07-29T20:00:00Z', 1),
    ];
    const entries = buildWeekLeaderboard(rows, SINCE, NOW, NAMES);
    expect(entries[0]).toMatchObject({ streamerId: 'a', sessions: 1 });
    expect(entries[0].hours).toBeCloseTo(4, 1);
  });

  it('reports the category a streamer spent the most minutes in', () => {
    const rows = [
      historyRow('a', '2026-07-28T18:00:00Z', 1, 'Just Chatting'),
      historyRow('a', '2026-07-29T18:00:00Z', 4, 'VALORANT'),
      historyRow('b', '2026-07-29T20:00:00Z', 2, 'Fortnite'),
    ];
    const entries = buildWeekLeaderboard(rows, SINCE, NOW, NAMES);
    expect(entries.find((e) => e.streamerId === 'a')?.topCategory).toBe('VALORANT');
    expect(entries.find((e) => e.streamerId === 'b')?.topCategory).toBe('Fortnite');
  });

  it('breaks a category tie alphabetically so the card does not reshuffle', () => {
    const rows = [
      historyRow('a', '2026-07-28T18:00:00Z', 2, 'Zed Game'),
      historyRow('a', '2026-07-29T18:00:00Z', 2, 'Alpha Game'),
      historyRow('b', '2026-07-29T20:00:00Z', 1, null),
    ];
    expect(buildWeekLeaderboard(rows, SINCE, NOW, NAMES)[0].topCategory).toBe('Alpha Game');
  });

  it('leaves the category empty when no row carried one', () => {
    const rows = [
      historyRow('a', '2026-07-28T18:00:00Z', 2),
      historyRow('b', '2026-07-29T20:00:00Z', 1),
    ];
    expect(buildWeekLeaderboard(rows, SINCE, NOW, NAMES)[0].topCategory).toBeNull();
  });

  it('hides itself when fewer than two favorites streamed', () => {
    const rows = [historyRow('a', '2026-07-28T18:00:00Z', 4)];
    expect(buildWeekLeaderboard(rows, SINCE, NOW, NAMES)).toEqual([]);
  });

  it('hides itself when nothing was streamed at all', () => {
    expect(buildWeekLeaderboard([], SINCE, NOW, NAMES)).toEqual([]);
  });

  it('caps the visible rows but still fills them past an unnamed streamer', () => {
    const rows = [
      historyRow('unknown', '2026-07-28T18:00:00Z', 10),
      historyRow('a', '2026-07-28T18:00:00Z', 5),
      historyRow('b', '2026-07-29T18:00:00Z', 4),
      historyRow('c', '2026-07-30T18:00:00Z', 3),
    ];
    const entries = buildWeekLeaderboard(rows, SINCE, NOW, NAMES);
    expect(entries.map((e) => e.streamerId)).toEqual(['a', 'b', 'c']);
  });

  it('counts only the in-window share of a stream that started earlier', () => {
    const rows: FavoriteWeekHistoryRow[] = [
      {
        streamer_id: 'a',
        started_at: '2026-07-26T20:00:00Z',
        ended_at: '2026-07-27T02:00:00Z',
        duration_minutes: 360,
        category: null,
      },
      historyRow('b', '2026-07-29T20:00:00Z', 1),
    ];
    expect(buildWeekLeaderboard(rows, SINCE, NOW, NAMES)[0].hours).toBeCloseTo(2);
  });

  it('ignores rows that never ended', () => {
    const rows: FavoriteWeekHistoryRow[] = [
      { ...historyRow('a', '2026-07-28T18:00:00Z', 4), ended_at: null },
      historyRow('b', '2026-07-29T20:00:00Z', 3),
      historyRow('c', '2026-07-29T20:00:00Z', 2),
    ];
    expect(buildWeekLeaderboard(rows, SINCE, NOW, NAMES).map((e) => e.streamerId)).toEqual([
      'b',
      'c',
    ]);
  });
});

describe('computeFavoritesWeekTotals', () => {
  it('agrees with the leaderboard rendered above it', () => {
    // The whole reason this function exists: on Mondays both cards are on
    // screen, so the recap total must equal the sum of the per-streamer rows.
    const rows = [
      historyRow('a', '2026-07-28T18:00:00Z', 4, 'VALORANT'),
      historyRow('a', '2026-07-30T18:00:00Z', 5, 'VALORANT'),
      historyRow('b', '2026-07-29T20:00:00Z', 3, 'Just Chatting'),
    ];
    const leaderboard = buildWeekLeaderboard(rows, SINCE, NOW, NAMES);
    const totals = computeFavoritesWeekTotals(rows, SINCE, NOW)!;
    const summedHours = leaderboard.reduce((sum, e) => sum + e.hours, 0);
    const summedSessions = leaderboard.reduce((sum, e) => sum + e.sessions, 0);
    expect(totals.totalHours).toBe(Math.round(summedHours));
    expect(totals.streams).toBe(summedSessions);
    expect(totals.topCategory).toBe('VALORANT');
  });

  it('counts sessions, not rows — simulcast twins and split VODs fold', () => {
    const rows: FavoriteWeekHistoryRow[] = [
      historyRow('a', '2026-07-28T18:00:00Z', 2),
      { ...historyRow('a', '2026-07-28T18:00:00Z', 2), category: 'VALORANT' },
      historyRow('a', '2026-07-28T20:10:00Z', 2),
      historyRow('b', '2026-07-29T20:00:00Z', 3),
    ];
    const totals = computeFavoritesWeekTotals(rows, SINCE, NOW)!;
    expect(totals.streams).toBe(2); // one session for a, one for b — not 4 rows
  });

  it('stays silent on a thin week', () => {
    expect(computeFavoritesWeekTotals([], SINCE, NOW)).toBeNull();
    expect(
      computeFavoritesWeekTotals([historyRow('a', '2026-07-28T18:00:00Z', 4)], SINCE, NOW),
    ).toBeNull();
    const blips: FavoriteWeekHistoryRow[] = [
      historyRow('a', '2026-07-28T18:00:00Z', 0.2),
      historyRow('b', '2026-07-29T18:00:00Z', 0.2),
    ];
    expect(computeFavoritesWeekTotals(blips, SINCE, NOW)).toBeNull();
  });

  it('leaves the category empty when no row carried one', () => {
    const rows = [
      historyRow('a', '2026-07-28T18:00:00Z', 3),
      historyRow('b', '2026-07-29T18:00:00Z', 2),
    ];
    expect(computeFavoritesWeekTotals(rows, SINCE, NOW)?.topCategory).toBeNull();
  });
});

function game(rank: number, gameName: string): TrendingGame {
  return { rank, gameId: `g${rank}`, gameName, boxArtUrl: undefined };
}

function liveEntry(
  streamerId: string,
  category: string | null,
  isFeaturedSuggestion = false,
): HomeLiveEntry {
  return {
    slot: { streamerId, category: category ?? undefined } as StreamSlot,
    isFeaturedSuggestion,
  };
}

describe('personalizeTrendingGames', () => {
  const games = [game(1, 'League of Legends'), game(2, 'VALORANT'), game(3, 'Just Chatting')];

  it('floats games the viewer\'s favorites play and counts them', () => {
    const result = personalizeTrendingGames(games, {
      liveNow: [liveEntry('a', 'Just Chatting')],
      upNext: [{ streamerId: 'b', category: 'Just Chatting' } as StreamSlot],
    });
    expect(result.map((g) => g.gameName)).toEqual([
      'Just Chatting',
      'League of Legends',
      'VALORANT',
    ]);
    expect(result[0].favoriteCount).toBe(2);
    expect(result[1].favoriteCount).toBe(0);
  });

  it('counts a streamer once across sections', () => {
    const result = personalizeTrendingGames(games, {
      liveNow: [liveEntry('a', 'VALORANT')],
      upNext: [{ streamerId: 'a', category: 'VALORANT' } as StreamSlot],
      recent: [{ streamerId: 'a', category: 'VALORANT' } as FeedRecentStream],
      clips: [{ streamerId: 'a', category: 'VALORANT' } as FeedClip],
    });
    expect(result[0]).toMatchObject({ gameName: 'VALORANT', favoriteCount: 1 });
  });

  it('does not count featured suggestions as "your streamers"', () => {
    const result = personalizeTrendingGames(games, {
      liveNow: [liveEntry('stranger', 'VALORANT', true)],
    });
    expect(result.every((g) => g.favoriteCount === 0)).toBe(true);
    expect(result.map((g) => g.gameName)).toEqual([
      'League of Legends',
      'VALORANT',
      'Just Chatting',
    ]);
  });

  it('matches category names exactly', () => {
    const result = personalizeTrendingGames(games, {
      liveNow: [liveEntry('a', 'Valorant Champions Tour')],
    });
    expect(result.every((g) => g.favoriteCount === 0)).toBe(true);
  });

  it('keeps Twitch rank order inside both partitions', () => {
    const result = personalizeTrendingGames(
      [game(1, 'A'), game(2, 'B'), game(3, 'C'), game(4, 'D')],
      { liveNow: [liveEntry('x', 'D'), liveEntry('y', 'B')] },
    );
    expect(result.map((g) => g.gameName)).toEqual(['B', 'D', 'A', 'C']);
  });

  it('is a no-op without personalization data', () => {
    expect(personalizeTrendingGames(games, {}).map((g) => g.gameName)).toEqual([
      'League of Legends',
      'VALORANT',
      'Just Chatting',
    ]);
    expect(personalizeTrendingGames([], { liveNow: [liveEntry('a', 'VALORANT')] })).toEqual([]);
  });
});
