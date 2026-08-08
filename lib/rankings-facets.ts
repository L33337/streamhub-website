// Category + language filter facets for the /rankings hub previews.
//
// The hub's Top-5 previews filter over the WHOLE ranking pool (~680 streamers
// per metric today), which is far too much data to ship to the browser. So the
// pool crosses the wire as a contingency TABLE instead of as rows: one count
// per (category, language) pair. That is enough to render both dropdowns with
// cross-filtered counts and to know the exact match count of any selection
// client-side, while the five rows a selection actually shows are fetched from
// /api/rankings/filter (app/api/rankings/filter/route.ts).
//
// Same vocabulary and the same two rules as the homepage filters
// (lib/home/filter-options.ts), so the two read identically:
//   - a blank dimension (no main game, unknown broadcaster language) is never
//     an option of its own — those rows stay reachable only under "All";
//   - options for one dropdown are counted over the pool the OTHER dropdown
//     already narrowed, so a zero-result combination can't be selected.
//
// Everything here is pure and unit-tested (lib/__tests__/rankings-facets.test.ts).

import {
  normalizeLanguageCode,
  type CountedFilterOption,
} from '@/lib/home/filter-options';

/** One pool entry reduced to its two filter dimensions; '' = unknown/absent. */
export interface RankingFacetItem {
  category: string;
  language: string;
}

/**
 * Compact (category × language) contingency table of one ranking pool.
 *
 * `cells` holds 1-BASED indexes into `categories` / `languages`, with 0
 * meaning "unknown" — that keeps the unknown bucket inside the same table
 * (it must count towards the "All" totals) without giving it a label that
 * could accidentally be rendered as an option.
 */
export interface RankingFacets {
  /** Category names, most frequent first. Index i is referenced as i + 1. */
  categories: string[];
  /** Normalized language codes with their display label, most frequent first. */
  languages: { code: string; label: string }[];
  /** [categoryIndex, languageIndex, count] — sparse, only non-zero pairs. */
  cells: [number, number, number][];
  /** Pool size the table describes, unknown buckets included. */
  total: number;
}

/** Empty table — used for pools that failed to load or came back empty. */
export const EMPTY_RANKING_FACETS: RankingFacets = {
  categories: [],
  languages: [],
  cells: [],
  total: 0,
};

/**
 * Reduces one leaderboard entry to its filter dimensions.
 *
 * Category is the streamer's MAIN game (the API's `top_category`, i.e. the
 * category with the most streamed hours in the last 28 days) rather than
 * "every category they touched": a leaderboard row is one streamer, so it must
 * belong to exactly one bucket or the counts would exceed the pool.
 *
 * Language is the broadcaster language, region subtag dropped ("pt-BR" → "pt")
 * by the same helper the homepage uses. NULL stays NULL — never defaulted to
 * 'en' (CLAUDE.md: a missing language is unknown, and YouTube-only channels
 * usually have none).
 */
export function rankingFacetItem(entry: {
  top_category?: { category: string } | undefined;
  streamer: { language: string | null };
}): RankingFacetItem {
  const category = entry.top_category?.category?.trim() ?? '';
  return {
    category,
    language: normalizeLanguageCode(entry.streamer.language) ?? '',
  };
}

/** Does one pool entry match the current selection? '' = no constraint. */
export function matchesRankingFilters(
  item: RankingFacetItem,
  category: string,
  language: string,
): boolean {
  if (category !== '' && item.category !== category) return false;
  if (language !== '' && item.language !== language) return false;
  return true;
}

/**
 * Builds the contingency table of a pool.
 *
 * Ordering is part of the ISR contract: categories and languages are sorted by
 * total count desc then label, and the cells by their indexes — so identical
 * data serializes to identical bytes across regenerations and Vercel does not
 * bill an ISR write for an unchanged page (see docs/, project ISR notes).
 *
 * `labelForLanguage` renders the code in the VIEWER's locale (a dropdown of
 * language names is chrome, CLAUDE.md D6). A code it cannot resolve keeps the
 * code itself as its label, so the option is still selectable.
 */
export function buildRankingFacets(
  items: readonly RankingFacetItem[],
  labelForLanguage: (code: string) => string,
): RankingFacets {
  const categoryCounts = new Map<string, number>();
  const languageCounts = new Map<string, number>();
  for (const item of items) {
    if (item.category) {
      categoryCounts.set(item.category, (categoryCounts.get(item.category) ?? 0) + 1);
    }
    if (item.language) {
      languageCounts.set(item.language, (languageCounts.get(item.language) ?? 0) + 1);
    }
  }

  const categories = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([category]) => category);
  const languages = [...languageCounts.entries()]
    .map(([code, count]) => ({ code, label: labelForLanguage(code) || code, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .map(({ code, label }) => ({ code, label }));

  const categoryIndex = new Map(categories.map((c, i) => [c, i + 1]));
  const languageIndex = new Map(languages.map((l, i) => [l.code, i + 1]));

  const cellCounts = new Map<string, number>();
  for (const item of items) {
    const c = item.category ? (categoryIndex.get(item.category) ?? 0) : 0;
    const l = item.language ? (languageIndex.get(item.language) ?? 0) : 0;
    const key = `${c}:${l}`;
    cellCounts.set(key, (cellCounts.get(key) ?? 0) + 1);
  }
  const cells = [...cellCounts.entries()]
    .map(([key, count]): [number, number, number] => {
      const [c, l] = key.split(':');
      return [Number(c), Number(l), count];
    })
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  return { categories, languages, cells, total: items.length };
}

/**
 * Category options, counted over the pool the language selection narrowed.
 * Never counted over its own dimension — picking a value would otherwise
 * collapse the list to that single entry.
 */
export function facetCategoryOptions(
  facets: RankingFacets,
  language: string,
): CountedFilterOption[] {
  const wanted = languageIndexOf(facets, language);
  if (wanted === null) return [];
  const counts = new Map<number, number>();
  for (const [c, l, n] of facets.cells) {
    if (c === 0) continue; // unknown category is not an option
    if (wanted !== 0 && l !== wanted) continue;
    counts.set(c, (counts.get(c) ?? 0) + n);
  }
  return [...counts.entries()]
    .map(([index, count]) => ({
      value: facets.categories[index - 1] ?? '',
      label: facets.categories[index - 1] ?? '',
      count,
    }))
    .filter((option) => option.value !== '')
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** Language options, counted over the pool the category selection narrowed. */
export function facetLanguageOptions(
  facets: RankingFacets,
  category: string,
): CountedFilterOption[] {
  const wanted = categoryIndexOf(facets, category);
  if (wanted === null) return [];
  const counts = new Map<number, number>();
  for (const [c, l, n] of facets.cells) {
    if (l === 0) continue; // unknown language is not an option
    if (wanted !== 0 && c !== wanted) continue;
    counts.set(l, (counts.get(l) ?? 0) + n);
  }
  return [...counts.entries()]
    .map(([index, count]) => ({
      value: facets.languages[index - 1]?.code ?? '',
      label: facets.languages[index - 1]?.label ?? '',
      count,
    }))
    .filter((option) => option.value !== '')
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/**
 * How many pool entries a selection matches. Drives the counter ("23
 * streamers") and — because the preview only ever shows five rows — tells the
 * island whether a fetch is worth making at all.
 */
export function facetMatchCount(
  facets: RankingFacets,
  category: string,
  language: string,
): number {
  const wantedCategory = categoryIndexOf(facets, category);
  const wantedLanguage = languageIndexOf(facets, language);
  if (wantedCategory === null || wantedLanguage === null) return 0;
  let total = 0;
  for (const [c, l, n] of facets.cells) {
    if (wantedCategory !== 0 && c !== wantedCategory) continue;
    if (wantedLanguage !== 0 && l !== wantedLanguage) continue;
    total += n;
  }
  return total;
}

/**
 * Every match count the UI can actually display, ascending.
 *
 * The counter is pluralized, and plural agreement lives in the server-side
 * lexicon — so the page pre-renders one string per REACHABLE count instead of
 * shipping a `{count}` template that would force English agreement ("1
 * streamers") and break the Slavic categories. Reachable means: any single
 * dimension, plus any pair that has a cell — which is a few dozen distinct
 * integers, not the whole 0..total range (that array would be ~680 strings per
 * ranking).
 */
export function reachableMatchCounts(facets: RankingFacets): number[] {
  const counts = new Set<number>([0, facetMatchCount(facets, '', '')]);
  for (const option of facetCategoryOptions(facets, '')) {
    counts.add(option.count);
  }
  for (const option of facetLanguageOptions(facets, '')) {
    counts.add(option.count);
  }
  for (const [, , n] of facets.cells) counts.add(n);
  return [...counts].sort((a, b) => a - b);
}

/** 0 = "all", n = index of that category, null = not in the pool. */
function categoryIndexOf(facets: RankingFacets, category: string): number | null {
  if (category === '') return 0;
  const index = facets.categories.indexOf(category);
  return index === -1 ? null : index + 1;
}

/** 0 = "all", n = index of that language, null = not in the pool. */
function languageIndexOf(facets: RankingFacets, language: string): number | null {
  if (language === '') return 0;
  const index = facets.languages.findIndex((l) => l.code === language);
  return index === -1 ? null : index + 1;
}
