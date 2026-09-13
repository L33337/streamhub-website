import { describe, expect, it, vi } from 'vitest';
import type { ListGamesOptions, PublicGame } from '@/lib/server/partner-api';
import { resolveGameBySlug } from '@/lib/server/games';

const g = (category: string, streamer_count: number): PublicGame => ({ category, streamer_count });

const CATALOG = [g('Fortnite', 40), g('Chess', 4)];
const ALL = [...CATALOG, g('Bombanana!', 2), g('Tiny Indie', 1)];

function stubApi(opts: { catalog?: () => PublicGame[]; all?: () => PublicGame[] } = {}) {
  const listGames = vi.fn(async (o?: ListGamesOptions) => {
    if (o?.minStreamers !== undefined) return { data: (opts.all ?? (() => ALL))() };
    return { data: (opts.catalog ?? (() => CATALOG))() };
  });
  return { api: { listGames }, listGames };
}

describe('resolveGameBySlug (SEO F5)', () => {
  it('answers from the catalog without a second call', async () => {
    const { api, listGames } = stubApi();
    const r = await resolveGameBySlug(api, 'fortnite', { limit: 500, revalidate: 3600 });
    expect(r?.game.category).toBe('Fortnite');
    expect(r?.inCatalog).toBe(true);
    expect(listGames).toHaveBeenCalledTimes(1);
    // The caller's catalog call is passed through verbatim (shared data-cache entry).
    expect(listGames).toHaveBeenCalledWith({ limit: 500, revalidate: 3600 });
  });

  it('resolves a thin category through the fallback, keeping the catalog for links', async () => {
    const { api, listGames } = stubApi();
    const r = await resolveGameBySlug(api, 'bombanana');
    expect(r?.game).toEqual(g('Bombanana!', 2));
    expect(r?.inCatalog).toBe(false);
    expect(r?.catalog).toEqual(CATALOG);
    expect(listGames).toHaveBeenLastCalledWith({ limit: 1000, minStreamers: 1, revalidate: 600 });
  });

  it('returns null for a slug unknown to both lists', async () => {
    const { api } = stubApi();
    expect(await resolveGameBySlug(api, 'does-not-exist')).toBeNull();
  });

  it('skips the fallback for slugs gameSlug() can never produce', async () => {
    const { api, listGames } = stubApi();
    for (const slug of ['Fortnite', 'wp-login.php', 'a--b', '-x', '']) {
      expect(await resolveGameBySlug(api, slug)).toBeNull();
    }
    expect(listGames.mock.calls.every(([o]) => o?.minStreamers === undefined)).toBe(true);
  });

  it('degrades a failing fallback to "not found"', async () => {
    const { api } = stubApi({
      all: () => {
        throw new Error('400 invalid_request');
      },
    });
    expect(await resolveGameBySlug(api, 'bombanana')).toBeNull();
  });

  it('lets a failing catalog call throw, like the direct call it replaces', async () => {
    const { api } = stubApi({
      catalog: () => {
        throw new Error('503');
      },
    });
    await expect(resolveGameBySlug(api, 'fortnite')).rejects.toThrow('503');
  });
});
