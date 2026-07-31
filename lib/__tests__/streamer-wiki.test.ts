import { describe, it, expect } from 'vitest';
import {
  pickWikiStreamers,
  topCategoryOf,
  truncateBio,
  type WikiFeedStats,
} from '../home/streamer-wiki';

function streamer(id: string, description: string | null = 'bio', description_en?: string | null) {
  return { id, description, description_en };
}

function stats(
  streamerId: string,
  topCategory: string | null = 'Just Chatting',
  streams28d: number | null = 12,
): WikiFeedStats {
  return { streamerId, topCategory, streams28d };
}

function statsMap(...entries: WikiFeedStats[]): Map<string, WikiFeedStats> {
  return new Map(entries.map((entry) => [entry.streamerId, entry]));
}

const NO_EXCLUDE = new Set<string>();
const ALL_CHIPS = (...ids: string[]) => new Set(ids);
/**
 * sampleRandom's partial Fisher-Yates swaps index i with i + floor(r * (n-i)),
 * so r === 0 always swaps an element with itself — the pool comes back in its
 * original order. Lets the order-sensitive cases below pin the draw.
 */
const IDENTITY = () => 0;

describe('topCategoryOf', () => {
  it('returns the highest share', () => {
    expect(
      topCategoryOf({ IRL: 0.1429, 'Just Chatting': 0.2857, 'Streamer University': 0.5714 }),
    ).toBe('Streamer University');
  });

  it('breaks exact ties alphabetically so ISR regenerations stay stable', () => {
    // Same input, opposite key order — PostgREST does not promise one.
    expect(topCategoryOf({ Valorant: 0.5, Apex: 0.5 })).toBe('Apex');
    expect(topCategoryOf({ Apex: 0.5, Valorant: 0.5 })).toBe('Apex');
  });

  it('ignores zero, negative, non-finite and unnamed shares', () => {
    expect(topCategoryOf({ Zeroed: 0, Real: 0.2 })).toBe('Real');
    expect(topCategoryOf({ Bad: Number.NaN, Real: 0.2 })).toBe('Real');
    expect(topCategoryOf({ '': 0.9, Real: 0.2 })).toBe('Real');
  });

  it('returns null for missing or empty maps', () => {
    expect(topCategoryOf(null)).toBeNull();
    expect(topCategoryOf(undefined)).toBeNull();
    expect(topCategoryOf({})).toBeNull();
  });
});

describe('truncateBio', () => {
  it('leaves a short bio untouched and adds no ellipsis', () => {
    expect(truncateBio('Short bio.', 180)).toBe('Short bio.');
  });

  it('collapses whitespace', () => {
    expect(truncateBio('a  \n b', 180)).toBe('a b');
  });

  it('cuts at a word boundary and never mid-word', () => {
    const text = `${'word '.repeat(60)}end`;
    const out = truncateBio(text, 40);
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(41);
    expect(out.slice(0, -1)).toBe(out.slice(0, -1).trim());
    expect(out).not.toContain('wor…');
  });

  it('strips trailing punctuation before the ellipsis', () => {
    expect(truncateBio(`${'ab '.repeat(20)}, tail`, 30)).not.toContain(',…');
  });

  it('hard-cuts spaceless text (CJK bios) instead of returning just an ellipsis', () => {
    const cjk = '配'.repeat(200);
    const out = truncateBio(cjk, 50);
    expect(out).toHaveLength(51);
    expect(out.endsWith('…')).toBe(true);
  });
});

describe('pickWikiStreamers', () => {
  it('keeps the pool order when the draw is pinned and everyone has a chip', () => {
    const popular = [streamer('a'), streamer('b'), streamer('c')];
    const picked = pickWikiStreamers(
      popular,
      statsMap(stats('a'), stats('b'), stats('c')),
      NO_EXCLUDE,
      ALL_CHIPS('a', 'b', 'c'),
      9,
      IDENTITY,
    );
    expect(picked.map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('drops candidates without a feed-stats row', () => {
    const popular = [streamer('a'), streamer('nostats'), streamer('c')];
    const picked = pickWikiStreamers(
      popular,
      statsMap(stats('a'), stats('c')),
      NO_EXCLUDE,
      ALL_CHIPS('a', 'nostats', 'c'),
      9,
      IDENTITY,
    );
    expect(picked.map((s) => s.id)).toEqual(['a', 'c']);
  });

  it('drops candidates whose stats row has no category or no 28d streams', () => {
    const popular = [streamer('nocat'), streamer('nostreams'), streamer('zero'), streamer('ok')];
    const picked = pickWikiStreamers(
      popular,
      statsMap(
        stats('nocat', null, 12),
        stats('nostreams', 'Just Chatting', null),
        stats('zero', 'Just Chatting', 0),
        stats('ok'),
      ),
      NO_EXCLUDE,
      ALL_CHIPS('nocat', 'nostreams', 'zero', 'ok'),
      9,
      IDENTITY,
    );
    expect(picked.map((s) => s.id)).toEqual(['ok']);
  });

  it('drops candidates with no description in either language', () => {
    const popular = [streamer('nobio', null, null), streamer('ok')];
    const picked = pickWikiStreamers(
      popular,
      statsMap(stats('nobio'), stats('ok')),
      NO_EXCLUDE,
      ALL_CHIPS('nobio', 'ok'),
      9,
      IDENTITY,
    );
    expect(picked.map((s) => s.id)).toEqual(['ok']);
  });

  it('accepts an English-only description (foreign bio not yet written)', () => {
    const picked = pickWikiStreamers(
      [streamer('enonly', null, 'English bio')],
      statsMap(stats('enonly')),
      NO_EXCLUDE,
      ALL_CHIPS('enonly'),
      9,
      IDENTITY,
    );
    expect(picked.map((s) => s.id)).toEqual(['enonly']);
  });

  it('excludes the streamers the Discover grid already shows', () => {
    const popular = [streamer('a'), streamer('dupe'), streamer('c')];
    const picked = pickWikiStreamers(
      popular,
      statsMap(stats('a'), stats('dupe'), stats('c')),
      new Set(['dupe']),
      ALL_CHIPS('a', 'dupe', 'c'),
      9,
      IDENTITY,
    );
    expect(picked.map((s) => s.id)).toEqual(['a', 'c']);
  });

  it('floats chip-capable candidates ahead of chip-less ones, order intact', () => {
    const popular = [streamer('a'), streamer('b'), streamer('c'), streamer('d')];
    const picked = pickWikiStreamers(
      popular,
      statsMap(stats('a'), stats('b'), stats('c'), stats('d')),
      NO_EXCLUDE,
      ALL_CHIPS('b', 'd'),
      9,
      IDENTITY,
    );
    expect(picked.map((s) => s.id)).toEqual(['b', 'd', 'a', 'c']);
  });

  it('caps at the requested count', () => {
    const popular = Array.from({ length: 20 }, (_, i) => streamer(`s${i}`));
    const picked = pickWikiStreamers(
      popular,
      statsMap(...popular.map((s) => stats(s.id))),
      NO_EXCLUDE,
      new Set(popular.map((s) => s.id)),
      9,
      IDENTITY,
    );
    expect(picked).toHaveLength(9);
    expect(picked[0].id).toBe('s0');
  });

  it('returns fewer than the cap rather than padding with incomplete cards', () => {
    const popular = [streamer('a'), streamer('b')];
    const picked = pickWikiStreamers(
      popular,
      statsMap(stats('a'), stats('b')),
      NO_EXCLUDE,
      ALL_CHIPS('a', 'b'),
      9,
      IDENTITY,
    );
    expect(picked).toHaveLength(2);
  });

  it('keeps the section alive when the stats FETCH failed (null, not empty)', () => {
    const popular = [streamer('a'), streamer('b'), streamer('c')];
    const picked = pickWikiStreamers(popular, null, NO_EXCLUDE, ALL_CHIPS('a', 'b', 'c'), 9, IDENTITY);
    expect(picked.map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('still honours exclusions when the stats fetch failed', () => {
    const popular = [streamer('a'), streamer('dupe')];
    const picked = pickWikiStreamers(popular, null, new Set(['dupe']), ALL_CHIPS('a'), 9, IDENTITY);
    expect(picked.map((s) => s.id)).toEqual(['a']);
  });

  it('empties out when nobody has stats (empty map is NOT a failure)', () => {
    const popular = [streamer('a'), streamer('b')];
    expect(
      pickWikiStreamers(popular, new Map(), NO_EXCLUDE, ALL_CHIPS('a', 'b'), 9, IDENTITY),
    ).toEqual([]);
  });

  it('drops blank ids and de-duplicates repeated ones', () => {
    const popular = [streamer(''), streamer('a'), streamer('a')];
    const picked = pickWikiStreamers(
      popular,
      statsMap(stats(''), stats('a')),
      NO_EXCLUDE,
      ALL_CHIPS('', 'a'),
      9,
      IDENTITY,
    );
    expect(picked.map((s) => s.id)).toEqual(['a']);
  });
});

/**
 * The section exists to cycle the roster, not to pin nine faces to the
 * homepage forever — these lock that in.
 */
describe('pickWikiStreamers rotation', () => {
  /** Deterministic LCG so a "random" draw is reproducible per seed. */
  function seeded(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0x100000000;
    };
  }

  const POOL = Array.from({ length: 30 }, (_, i) => streamer(`s${i}`));
  const POOL_STATS = statsMap(...POOL.map((s) => stats(s.id)));
  const ALL = new Set(POOL.map((s) => s.id));

  function draw(seed: number): string[] {
    return pickWikiStreamers(POOL, POOL_STATS, NO_EXCLUDE, ALL, 9, seeded(seed)).map((s) => s.id);
  }

  it('returns a different set of cards for different draws', () => {
    const a = draw(1);
    const b = draw(2);
    expect(a).toHaveLength(9);
    expect(b).toHaveLength(9);
    expect(a).not.toEqual(b);
    // Not merely reordered — the actual membership has to move, or the page
    // shows the same nine streamers shuffled.
    const overlap = a.filter((id) => b.includes(id)).length;
    expect(overlap).toBeLessThan(9);
  });

  it('never repeats a streamer inside one draw', () => {
    for (const seed of [1, 7, 42, 99, 1234]) {
      const ids = draw(seed);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('eventually surfaces every eligible streamer — nobody is stuck off-page', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 200; seed++) draw(seed).forEach((id) => seen.add(id));
    expect(seen.size).toBe(POOL.length);
  });

  it('still honours the completeness gate and exclusions while rotating', () => {
    const pool = [...POOL, streamer('nostats'), streamer('dupe')];
    const seen = new Set<string>();
    for (let seed = 0; seed < 120; seed++) {
      pickWikiStreamers(pool, POOL_STATS, new Set(['dupe']), ALL, 9, seeded(seed)).forEach((s) =>
        seen.add(s.id),
      );
    }
    expect(seen.has('nostats')).toBe(false);
    expect(seen.has('dupe')).toBe(false);
  });

  it('prefers chip-capable candidates within the random draw', () => {
    // Only 9 of 30 can fill a chip — with a 1.5x oversample the draw usually
    // holds a few of them, and they must claim the visible slots first.
    const chipIds = new Set(POOL.slice(0, 9).map((s) => s.id));
    let chipLeadingDraws = 0;
    for (let seed = 0; seed < 60; seed++) {
      const ids = pickWikiStreamers(POOL, POOL_STATS, NO_EXCLUDE, chipIds, 9, seeded(seed)).map(
        (s) => s.id,
      );
      const firstChipless = ids.findIndex((id) => !chipIds.has(id));
      const lastChip = ids.map((id) => chipIds.has(id)).lastIndexOf(true);
      // Every chip-capable card must sit ahead of every chip-less one.
      if (firstChipless === -1 || lastChip < firstChipless) chipLeadingDraws++;
    }
    expect(chipLeadingDraws).toBe(60);
  });
});
