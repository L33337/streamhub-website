'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { RotateCcw } from 'lucide-react';
import type { UiLang } from '@/lib/i18n-core';
import type { RankingRowDto } from '@/lib/rankings-row';
import {
  facetCategoryOptions,
  facetLanguageOptions,
  facetMatchCount,
  type RankingFacets,
} from '@/lib/rankings-facets';
import {
  buildRankingFilterUrl,
  rankingFilterCacheKey,
  type RankingFilterResponse,
} from '@/lib/rankings-filter-api';
import {
  RankingRowsTable,
  type RankingTableChrome,
} from '@/components/web/RankingRowsTable';
import { FILTER_SELECT_CLASS } from '@/components/web/home/filter-controls';

export interface RankingFilterStrings {
  categoryLabel: string;
  languageLabel: string;
  allCategories: string;
  allLanguages: string;
  /** Localized "{label} ({count})" shape; only the two parts vary. */
  optionPattern: string;
  reset: string;
  /**
   * Pre-rendered match counter keyed by the count ("23" → "23 streamers").
   * Only the counts a selection can actually produce are shipped
   * (reachableMatchCounts) — a `{count}` template would force English plural
   * agreement and break the Slavic categories, and the full 0..pool range
   * would be hundreds of strings per ranking.
   */
  matchesByCount: Record<string, string>;
  /** Shown when the selection has no match in this ranking's pool. */
  empty: string;
  /** Shown when the fetch failed. */
  error: string;
  /** Label of the retry button next to that message. */
  retry: string;
  /** Link under the table, e.g. "See full ranking". */
  seeFullRanking: string;
  /**
   * category → label of that category's own full ranking ("Top Minecraft
   * streamers"). Only passed for the followers ranking, the one metric with a
   * per-category page.
   */
  categoryRankingLabels?: Record<string, string>;
}

type PreviewState =
  | { kind: 'ssr' }
  | { kind: 'loading' }
  | { kind: 'ready'; rows: RankingRowDto[] }
  | { kind: 'empty' }
  | { kind: 'error' };

/**
 * Category + language dropdowns over ONE Top-5 leaderboard preview on
 * /rankings, plus the "full ranking" link under it.
 *
 * The pool is NOT in the browser. A ranking runs to ~680 streamers and the top
 * five Italian streamers can sit at rank 300+, so the honest answer to a
 * selection needs the whole pool — the page therefore ships only the FACETS (a
 * compact (category × language) count table, lib/rankings-facets.ts) and this
 * island fetches the five rows from /api/rankings/filter. Consequences:
 *
 * - **The dropdowns are exact without any rows.** Counts come from the facet
 *   table, cross-filtered the same way the homepage filters are (options for
 *   one dimension counted over the pool the other narrowed), so an empty
 *   combination cannot be selected — and a selection with 0 matches never
 *   fires a request at all.
 * - **The unfiltered preview stays server HTML.** `ssrTable` is rendered by the
 *   page (SEO, zero client work); it is swapped out only while a filter is
 *   active, which is a state no crawler reaches.
 * - **Responses are cached per selection** in component state, so switching
 *   back to a previous filter is instant and re-fires nothing.
 * - **Ranks stay absolute.** The rows carry their real position in the full
 *   ranking (#12, #43, …) rather than a renumbered 1..5 — see
 *   lib/rankings-row.ts.
 */
export function RankingSectionFilters({
  metric,
  locale,
  facets,
  strings,
  chrome,
  ssrTable,
  fullRankingHref,
  categoryRankingHrefs,
}: {
  /** Ranking slug, forwarded to the API route. */
  metric: string;
  locale: UiLang;
  facets: RankingFacets;
  strings: RankingFilterStrings;
  /** Table chrome of the filtered preview — identical to the SSR table's. */
  chrome: RankingTableChrome;
  /** Server-rendered unfiltered Top 5. */
  ssrTable: React.ReactNode;
  fullRankingHref: string;
  /**
   * category → href of that category's own full ranking. Only the followers
   * ranking has per-category pages (/rankings/game/<slug>), and only for
   * categories in the games catalog — the route 404s for the rest, so a
   * missing key means "keep the metric link".
   */
  categoryRankingHrefs?: Record<string, string>;
}) {
  const [category, setCategory] = useState('');
  const [language, setLanguage] = useState('');
  const [loaded, setLoaded] = useState<Record<string, RankingRowDto[]>>({});
  const [failed, setFailed] = useState<Record<string, true>>({});
  const categoryId = useId();
  const languageId = useId();

  // Options for one dropdown are counted over the pool the OTHER narrowed —
  // never by itself, or picking a value would collapse its own list to a
  // single entry.
  const categoryOptions = useMemo(
    () => facetCategoryOptions(facets, language),
    [facets, language],
  );
  const languageOptions = useMemo(
    () => facetLanguageOptions(facets, category),
    [facets, category],
  );

  // Belt and braces: cross-filtered options make an unselectable pair
  // impossible to reach through the UI, but a stale selection would strand the
  // visitor on an empty preview with only Reset as a way out. Clamping in
  // render (instead of a self-healing effect) keeps it a pure derivation.
  const activeCategory = isOffered(categoryOptions, category) ? category : '';
  const activeLanguage = isOffered(languageOptions, language) ? language : '';
  const active = activeCategory !== '' || activeLanguage !== '';

  const matchCount = useMemo(
    () => facetMatchCount(facets, activeCategory, activeLanguage),
    [facets, activeCategory, activeLanguage],
  );

  const key = rankingFilterCacheKey(activeCategory, activeLanguage);
  const rows = loaded[key];
  const hasFailed = failed[key] === true;
  // Derived, never stored: a status in state would need a synchronous setState
  // inside the effect below, which is exactly the pattern React 19's lint rules
  // (and the homepage islands) avoid.
  const state: PreviewState = !active
    ? { kind: 'ssr' }
    : matchCount === 0
      ? { kind: 'empty' }
      : rows
        ? // A fetch that came back with nothing means the pool moved since the
          // page was generated (the facet count promised matches). Show the
          // empty state — a table with headers and no rows reads as broken.
          rows.length > 0
          ? { kind: 'ready', rows }
          : { kind: 'empty' }
        : hasFailed
          ? { kind: 'error' }
          : { kind: 'loading' };
  const needsFetch = state.kind === 'loading';

  const url = buildRankingFilterUrl({
    metric,
    category: activeCategory,
    language: activeLanguage,
    locale,
  });

  useEffect(() => {
    if (!needsFetch) return;
    const controller = new AbortController();
    let cancelled = false;
    void (async () => {
      try {
        const resp = await fetch(url, { signal: controller.signal });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const body = (await resp.json()) as RankingFilterResponse;
        if (cancelled) return;
        // An empty array is a valid answer and is cached as such: the facet
        // count said there were matches, so this means the pool moved between
        // the page's regeneration and now — showing the empty state (rather
        // than retrying forever) is the honest outcome.
        setLoaded((prev) => ({ ...prev, [key]: body.rows ?? [] }));
      } catch (err) {
        // A cancelled request is not a failure — it means the visitor moved on.
        if (cancelled || (err instanceof DOMException && err.name === 'AbortError')) {
          return;
        }
        setFailed((prev) => ({ ...prev, [key]: true }));
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [needsFetch, url, key]);

  const fullLink = resolveFullLink(
    activeCategory,
    fullRankingHref,
    strings,
    categoryRankingHrefs,
  );

  return (
    <div>
      {/* Without scripting the dropdowns cannot do anything (the rows are
          fetched), so they are hidden rather than left inert — the unfiltered
          Top 5 and its link below are server HTML and work on their own. The
          query is only honoured by browsers that also support it, and a
          non-supporting browser with JS keeps the working controls. */}
      <div className="mb-3 flex flex-wrap items-center gap-2 [@media(scripting:none)]:hidden">
        {categoryOptions.length > 0 && (
          <>
            <label className="sr-only" htmlFor={categoryId}>
              {strings.categoryLabel}
            </label>
            <select
              id={categoryId}
              value={activeCategory}
              onChange={(event) => setCategory(event.target.value)}
              className={FILTER_SELECT_CLASS}
            >
              <option value="">{strings.allCategories}</option>
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {fillOption(strings.optionPattern, option.label, option.count)}
                </option>
              ))}
            </select>
          </>
        )}

        {languageOptions.length > 0 && (
          <>
            <label className="sr-only" htmlFor={languageId}>
              {strings.languageLabel}
            </label>
            <select
              id={languageId}
              value={activeLanguage}
              onChange={(event) => setLanguage(event.target.value)}
              className={FILTER_SELECT_CLASS}
            >
              <option value="">{strings.allLanguages}</option>
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {fillOption(strings.optionPattern, option.label, option.count)}
                </option>
              ))}
            </select>
          </>
        )}

        {active && (
          <>
            <span aria-live="polite" className="text-xs font-semibold text-text-muted">
              {strings.matchesByCount[String(matchCount)] ?? String(matchCount)}
            </span>
            <button
              type="button"
              onClick={() => {
                setCategory('');
                setLanguage('');
              }}
              className="flex min-h-11 items-center gap-1 rounded-full border border-dashed border-border-default px-3 text-xs font-semibold text-text-muted transition-colors hover:border-accent-cyan/50 hover:text-accent-cyan"
            >
              <RotateCcw size={11} aria-hidden="true" />
              {strings.reset}
            </button>
          </>
        )}
      </div>

      {state.kind === 'ssr' && ssrTable}

      {state.kind === 'ready' && (
        <RankingRowsTable chrome={chrome} rows={state.rows} locale={locale} />
      )}

      {/* aria-busy sits on the region itself (announced), while the placeholder
          bars are decoration and stay hidden from assistive tech. */}
      {state.kind === 'loading' && (
        <div
          aria-busy="true"
          className="space-y-2 rounded-xl bg-background-elevated p-1 gradient-border"
        >
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              aria-hidden="true"
              className="h-13 rounded-lg bg-background-highlight motion-safe:animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Unreachable through the dropdowns (an option is only offered when it
          has a match in the pool the other one narrowed) — kept as the visible
          failure mode, because an empty table with no explanation is worse. */}
      {state.kind === 'empty' && (
        <p className="rounded-xl border border-border-default bg-background-elevated p-6 text-center text-sm text-text-secondary">
          {strings.empty}
        </p>
      )}

      {state.kind === 'error' && (
        <p
          role="status"
          className="rounded-xl border border-border-default bg-background-elevated p-6 text-center text-sm text-text-secondary"
        >
          {strings.error}{' '}
          <button
            type="button"
            onClick={() =>
              setFailed((prev) => {
                const next = { ...prev };
                delete next[key];
                return next;
              })
            }
            className="font-semibold text-accent-cyan underline underline-offset-4 hover:text-text-primary"
          >
            {strings.retry}
          </button>
        </p>
      )}

      {/* Both labels carry their own arrow in the lexicon — don't add one. */}
      <p className="mt-3 text-right text-sm">
        <Link href={fullLink.href} className="text-accent-cyan hover:text-text-primary">
          {fullLink.label}
        </Link>
      </p>
    </div>
  );
}

/**
 * Link under the table. With a category selected it points at that category's
 * OWN full ranking where one exists — the metric page cannot express the
 * filter, so "see full ranking" would otherwise drop it silently.
 */
function resolveFullLink(
  category: string,
  fullRankingHref: string,
  strings: RankingFilterStrings,
  categoryRankingHrefs?: Record<string, string>,
): { href: string; label: string } {
  const href = category ? categoryRankingHrefs?.[category] : undefined;
  const label = category ? strings.categoryRankingLabels?.[category] : undefined;
  if (href && label) return { href, label };
  return { href: fullRankingHref, label: strings.seeFullRanking };
}

function isOffered(
  options: ReadonlyArray<{ value: string }>,
  value: string,
): boolean {
  return value === '' || options.some((option) => option.value === value);
}

/**
 * Rebuilds a localized "Label (7)" option from the server-supplied pattern,
 * which was rendered once with the tokens `{label}` / `{count}`. Keeps the
 * punctuation choice (ja uses full-width parens) in the lexicon.
 */
function fillOption(pattern: string, label: string, count: number): string {
  return pattern.replace('{label}', label).replace('{count}', String(count));
}
