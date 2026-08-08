import { describe, expect, it } from 'vitest';
import type { PublicRankingEntry, PublicStreamer } from '@/lib/server/partner-api';
import {
  buildRankingFacets,
  facetCategoryOptions,
  facetLanguageOptions,
  facetMatchCount,
  matchesRankingFilters,
  rankingFacetItem,
  reachableMatchCounts,
  type RankingFacetItem,
} from '@/lib/rankings-facets';

/** Uppercased code, so a test can tell the label apart from the value. */
const label = (code: string) => code.toUpperCase();

function item(category: string, language: string): RankingFacetItem {
  return { category, language };
}

function streamer(overrides: Partial<PublicStreamer> = {}): PublicStreamer {
  return {
    id: 'examplestreamer',
    name: 'ExampleStreamer',
    platforms: ['twitch'],
    avatar_url: null,
    is_featured: false,
    timezone: null,
    language: 'en',
    is_always_on: false,
    avg_view_count: 1200,
    follower_count: 50_000,
    follower_count_updated_at: null,
    updated_at: '2026-07-17T00:00:00Z',
    last_status_change_at: null,
    twitch_login: 'examplestreamer',
    youtube_channel_id: null,
    description: null,
    ...overrides,
  };
}

describe('rankingFacetItem', () => {
  it('takes the main game and the region-stripped language', () => {
    const entry: PublicRankingEntry = {
      rank: 1,
      values: {},
      streamer: streamer({ language: 'pt-BR' }),
      top_category: { category: 'Just Chatting', share_percent: 62 },
    };
    expect(rankingFacetItem(entry)).toEqual({
      category: 'Just Chatting',
      language: 'pt',
    });
  });

  it('leaves both dimensions blank when unknown — never defaults to en', () => {
    const entry: PublicRankingEntry = {
      rank: 1,
      values: {},
      streamer: streamer({ language: null }),
    };
    expect(rankingFacetItem(entry)).toEqual({ category: '', language: '' });
  });
});

describe('matchesRankingFilters', () => {
  const row = item('Fortnite', 'de');

  it('treats an empty dimension as "no constraint"', () => {
    expect(matchesRankingFilters(row, '', '')).toBe(true);
    expect(matchesRankingFilters(row, 'Fortnite', '')).toBe(true);
    expect(matchesRankingFilters(row, '', 'de')).toBe(true);
    expect(matchesRankingFilters(row, 'Fortnite', 'de')).toBe(true);
  });

  it('rejects a mismatch in either dimension', () => {
    expect(matchesRankingFilters(row, 'Minecraft', '')).toBe(false);
    expect(matchesRankingFilters(row, '', 'en')).toBe(false);
    expect(matchesRankingFilters(row, 'Fortnite', 'en')).toBe(false);
  });

  it('never matches an unknown value against a constraint', () => {
    expect(matchesRankingFilters(item('', ''), 'Fortnite', '')).toBe(false);
    expect(matchesRankingFilters(item('', ''), '', 'de')).toBe(false);
    expect(matchesRankingFilters(item('', ''), '', '')).toBe(true);
  });
});

describe('buildRankingFacets', () => {
  const items = [
    item('Just Chatting', 'en'),
    item('Just Chatting', 'en'),
    item('Just Chatting', 'de'),
    item('Fortnite', 'de'),
    item('Fortnite', 'de'),
    item('Fortnite', 'de'),
    item('', 'en'), // no main game
    item('Minecraft', ''), // unknown language
    item('', ''), // neither
  ];
  const facets = buildRankingFacets(items, label);

  it('orders both dimensions by count desc, then label', () => {
    expect(facets.categories).toEqual(['Fortnite', 'Just Chatting', 'Minecraft']);
    expect(facets.languages).toEqual([
      { code: 'de', label: 'DE' },
      { code: 'en', label: 'EN' },
    ]);
  });

  it('counts every item, unknown buckets included', () => {
    expect(facets.total).toBe(items.length);
    const summed = facets.cells.reduce((sum, [, , n]) => sum + n, 0);
    expect(summed).toBe(items.length);
  });

  it('keeps the cells in a deterministic order (ISR byte stability)', () => {
    const again = buildRankingFacets([...items].reverse(), label);
    expect(again.cells).toEqual(facets.cells);
    expect(again.categories).toEqual(facets.categories);
  });

  it('never offers the unknown buckets as an option', () => {
    expect(facetCategoryOptions(facets, '').map((o) => o.value)).toEqual([
      'Fortnite',
      'Just Chatting',
      'Minecraft',
    ]);
    expect(facetLanguageOptions(facets, '').map((o) => o.value)).toEqual(['de', 'en']);
  });

  it('cross-filters the category options by the selected language', () => {
    expect(facetCategoryOptions(facets, 'de')).toEqual([
      { value: 'Fortnite', label: 'Fortnite', count: 3 },
      { value: 'Just Chatting', label: 'Just Chatting', count: 1 },
    ]);
    expect(facetCategoryOptions(facets, 'en')).toEqual([
      { value: 'Just Chatting', label: 'Just Chatting', count: 2 },
    ]);
  });

  it('cross-filters the language options by the selected category', () => {
    expect(facetLanguageOptions(facets, 'Just Chatting')).toEqual([
      { value: 'en', label: 'EN', count: 2 },
      { value: 'de', label: 'DE', count: 1 },
    ]);
    // Minecraft's only row has no language → the dropdown has nothing to offer.
    expect(facetLanguageOptions(facets, 'Minecraft')).toEqual([]);
  });

  it('returns no options for a value outside the pool', () => {
    expect(facetCategoryOptions(facets, 'xx')).toEqual([]);
    expect(facetLanguageOptions(facets, 'Rust')).toEqual([]);
  });

  it('counts matches for every combination the UI can produce', () => {
    expect(facetMatchCount(facets, '', '')).toBe(items.length);
    expect(facetMatchCount(facets, 'Fortnite', '')).toBe(3);
    expect(facetMatchCount(facets, '', 'en')).toBe(3);
    expect(facetMatchCount(facets, 'Just Chatting', 'de')).toBe(1);
    expect(facetMatchCount(facets, 'Fortnite', 'en')).toBe(0);
  });

  it('counts 0 for values the pool does not contain', () => {
    expect(facetMatchCount(facets, 'Rust', '')).toBe(0);
    expect(facetMatchCount(facets, '', 'xx')).toBe(0);
  });

  it('collects the counts the counter can display, ascending', () => {
    const counts = reachableMatchCounts(facets);
    expect(counts).toEqual([...counts].sort((a, b) => a - b));
    expect(counts).toContain(0); // the empty-state counter
    expect(counts).toContain(items.length); // unfiltered
    expect(counts).toContain(3); // Fortnite / de
    expect(counts).toContain(1); // Just Chatting + de pair
    // Deduped: 3 appears as a category total AND a language total.
    expect(new Set(counts).size).toBe(counts.length);
  });

  it('covers every count a selection can produce', () => {
    const reachable = new Set(reachableMatchCounts(facets));
    const categories = ['', ...facets.categories];
    const languages = ['', ...facets.languages.map((l) => l.code)];
    for (const category of categories) {
      for (const language of languages) {
        expect(reachable).toContain(facetMatchCount(facets, category, language));
      }
    }
  });
});

describe('buildRankingFacets: empty pool', () => {
  it('yields an empty, harmless table', () => {
    const facets = buildRankingFacets([], label);
    expect(facets).toEqual({ categories: [], languages: [], cells: [], total: 0 });
    expect(facetCategoryOptions(facets, '')).toEqual([]);
    expect(facetLanguageOptions(facets, '')).toEqual([]);
    expect(facetMatchCount(facets, '', '')).toBe(0);
    expect(reachableMatchCounts(facets)).toEqual([0]);
  });
});
