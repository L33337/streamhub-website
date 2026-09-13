import { describe, expect, it } from 'vitest';
import type { PublicGame } from '@/lib/server/partner-api';
import { dedupeGamesBySlug, findGameBySlug, gameSlug } from '@/lib/game-slug';

const g = (category: string, streamer_count: number): PublicGame => ({ category, streamer_count });

describe('gameSlug', () => {
  it('lowercases, strips diacritics and collapses punctuation', () => {
    expect(gameSlug('Just Chatting')).toBe('just-chatting');
    expect(gameSlug('Pokémon')).toBe('pokemon');
    expect(gameSlug('BOMBANANA!')).toBe('bombanana');
    expect(gameSlug('!!!')).toBe('');
  });
});

describe('findGameBySlug (SEO F5: deterministic on collisions)', () => {
  it('resolves the category with more streamers, whatever the list order', () => {
    const big = g('SILENT HILL 2', 14);
    const small = g('Silent Hill 2', 3);
    expect(findGameBySlug([small, big], 'silent-hill-2')).toBe(big);
    expect(findGameBySlug([big, small], 'silent-hill-2')).toBe(big);
  });

  it('breaks a streamer-count tie by code-unit order of the name', () => {
    const upper = g('BOMBANANA!', 4);
    const mixed = g('Bombanana!', 4);
    // 'O' (0x4F) sorts before 'o' (0x6F) — independent of the runtime's ICU.
    expect(findGameBySlug([mixed, upper], 'bombanana')).toBe(upper);
    expect(findGameBySlug([upper, mixed], 'bombanana')).toBe(upper);
  });

  it('returns null for an unknown slug', () => {
    expect(findGameBySlug([g('Fortnite', 40)], 'minecraft')).toBeNull();
  });
});

describe('dedupeGamesBySlug', () => {
  it('keeps one game per slug — the same winner findGameBySlug picks', () => {
    const games = [g('Fortnite', 40), g('Bombanana!', 3), g('BOMBANANA!', 9), g('Chess', 4)];
    const out = dedupeGamesBySlug(games);
    expect(out.map((x) => x.category)).toEqual(['Fortnite', 'BOMBANANA!', 'Chess']);
    expect(out.find((x) => gameSlug(x.category) === 'bombanana')).toBe(
      findGameBySlug(games, 'bombanana'),
    );
  });

  it('drops categories without a slug', () => {
    expect(dedupeGamesBySlug([g('???', 10), g('Fortnite', 40)]).map((x) => x.category)).toEqual([
      'Fortnite',
    ]);
  });
});
