import { describe, expect, it } from 'vitest';
import { filterGames, sortGames } from '../games-sort';
import type { PublicGame } from '../server/partner-api';

function game(overrides: Partial<PublicGame> & { category: string }): PublicGame {
  return { streamer_count: 0, ...overrides };
}

const GAMES: PublicGame[] = [
  game({ category: 'Fortnite', streamer_count: 12, hours_28d: 300, trend_delta_percent: 5 }),
  game({ category: 'Valorant', streamer_count: 8, hours_28d: 500, trend_delta_percent: null }),
  game({ category: 'Pokémon', streamer_count: 8, hours_28d: null, trend_delta_percent: 40 }),
  game({ category: 'Art', streamer_count: 20 }), // old-API row: no enrichment fields at all
];

describe('sortGames', () => {
  it('streamers mode sorts by streamer_count desc (tie → category asc)', () => {
    const out = sortGames(GAMES, 'streamers').map((g) => g.category);
    expect(out).toEqual(['Art', 'Fortnite', 'Pokémon', 'Valorant']);
  });

  it('hours mode sorts by hours_28d desc (hours BROADCAST, not watched) with nulls/undefined last', () => {
    const out = sortGames(GAMES, 'hours').map((g) => g.category);
    // Valorant 500 > Fortnite 300 > (null/undefined) Art 20 streamers > Pokémon 8
    expect(out).toEqual(['Valorant', 'Fortnite', 'Art', 'Pokémon']);
  });

  it('trending mode sorts by trend_delta_percent desc with nulls last', () => {
    const out = sortGames(GAMES, 'trending').map((g) => g.category);
    expect(out).toEqual(['Pokémon', 'Fortnite', 'Art', 'Valorant']);
  });

  it('ties break by streamer_count then category (deterministic)', () => {
    const tied = [
      game({ category: 'Beta', streamer_count: 5, hours_28d: 100 }),
      game({ category: 'Alpha', streamer_count: 5, hours_28d: 100 }),
    ];
    expect(sortGames(tied, 'hours').map((g) => g.category)).toEqual(['Alpha', 'Beta']);
  });

  it('does not mutate the input array', () => {
    const input = [...GAMES];
    sortGames(input, 'hours');
    expect(input.map((g) => g.category)).toEqual(GAMES.map((g) => g.category));
  });
});

describe('filterGames', () => {
  it('matches case-insensitively', () => {
    expect(filterGames(GAMES, 'FORT').map((g) => g.category)).toEqual(['Fortnite']);
  });

  it('matches diacritic-insensitively ("pokem" finds "Pokémon")', () => {
    expect(filterGames(GAMES, 'pokem').map((g) => g.category)).toEqual(['Pokémon']);
  });

  it('blank query returns everything', () => {
    expect(filterGames(GAMES, '   ')).toHaveLength(GAMES.length);
  });

  it('no match returns empty array', () => {
    expect(filterGames(GAMES, 'zzz')).toEqual([]);
  });
});
