'use client';

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import type { UiLang } from '@/lib/i18n-core';
import {
  computeVisibleLiveIds,
  countLiveFilterOptions,
  matchesLiveFilters,
  type LiveFilterItem,
} from '@/lib/home/live-rail';
import { FILTER_SELECT_CLASS } from '@/components/web/home/filter-controls';
import { TONIGHT_LIVE_CAP, type TonightLiveRowSlot } from '@/lib/tonight/logic';
import { TonightLiveRow } from './TonightLiveRow';

export interface TonightLiveFilterStrings {
  categoryLabel: string;
  languageLabel: string;
  allCategories: string;
  allLanguages: string;
  /**
   * Pre-rendered match counter per count, indexed by it. Rendered server-side
   * for the whole 0..pool range so every language keeps its own plural
   * agreement — a `{count}` template would force English "1 live streams" and
   * break the Slavic categories.
   */
  matchesByCount: string[];
  reset: string;
  empty: string;
  /** Localized "{label} ({count})" shape; only the two parts vary. */
  optionPattern: string;
}

/**
 * Category + language dropdowns over tonight's "already live" opener — the same
 * contract as the homepage rail (`HomeLiveRailFilters`), and the filter
 * vocabulary is literally shared (`lib/home/live-rail.ts`), so the two can only
 * ever disagree on purpose.
 *
 * **The pool is what the dropdowns search, not the visible cut.** Unfiltered the
 * section is the first TONIGHT_LIVE_CAP rows; with ANY filter active every
 * match in the pool shows, however deep it ranks. That asymmetry is the whole
 * reason the pool exists: the homepage rail once searched only its rendered
 * cards, so German offered 3 of 17 live streams and some languages had no
 * option at all.
 *
 * The pool is SPLIT: `ssrCards` is the server-rendered head — the unfiltered
 * cut — whose visibility this wrapper toggles imperatively, while
 * `deferredSlots` is the rest of the sweep as DATA, rendered here only once a
 * filter can reveal it. **The two regimes must not fight**: the imperative pass
 * skips `[data-tonight-live-deferred]`, because React owns those nodes.
 *
 * Simpler than the homepage rail in one way: these rows show a viewer count,
 * not a runtime countdown, so this island needs no clock at all.
 */
export function TonightLiveFilters({
  items,
  strings,
  locale,
  ssrCards,
  deferredSlots,
  listClassName,
}: {
  /** Filter metadata for the WHOLE pool, so counts are honest from first paint. */
  items: LiveFilterItem[];
  strings: TonightLiveFilterStrings;
  locale: UiLang;
  /** Server-rendered `<li>` rows, placed in the same list as the deferred ones. */
  ssrCards: ReactNode[];
  deferredSlots: TonightLiveRowSlot[];
  listClassName: string;
}) {
  const [category, setCategory] = useState('');
  const [language, setLanguage] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const categoryId = useId();
  const languageId = useId();

  // Options for one dropdown are counted over the pool the OTHER one narrowed
  // — never by itself, or picking a value would collapse its own list to a
  // single entry.
  const categoryOptions = useMemo(
    () =>
      countLiveFilterOptions(
        items.filter((item) => matchesLiveFilters(item, '', language)),
        'category',
      ),
    [items, language],
  );
  const languageOptions = useMemo(
    () =>
      countLiveFilterOptions(
        items.filter((item) => matchesLiveFilters(item, category, '')),
        'language',
      ),
    [items, category],
  );

  // Belt and braces: cross-filtered options make an unselectable pair
  // unreachable through the UI, but a selection that stops being offered would
  // strand the visitor on an empty list with only Reset as a way out. Clamping
  // in render keeps it a pure derivation (`react-hooks/set-state-in-effect`).
  const activeCategory = isOffered(categoryOptions, category) ? category : '';
  const activeLanguage = isOffered(languageOptions, language) ? language : '';
  const active = activeCategory !== '' || activeLanguage !== '';

  const matching = useMemo(
    () => items.filter((item) => matchesLiveFilters(item, activeCategory, activeLanguage)),
    [items, activeCategory, activeLanguage],
  );

  // Unfiltered this is the server's own cut (the first TONIGHT_LIVE_CAP items);
  // filtered it is every match in the pool.
  const visibleIds = useMemo(
    () => computeVisibleLiveIds(items, activeCategory, activeLanguage, TONIGHT_LIVE_CAP),
    [items, activeCategory, activeLanguage],
  );

  // Unfiltered this is empty — `visibleIds` is then a prefix of the SSR head,
  // which contains no deferred id — so the resting section is pure server HTML.
  const deferredVisible = useMemo(
    () => deferredSlots.filter((slot) => visibleIds.has(slot.id)),
    [deferredSlots, visibleIds],
  );

  // Server-rendered rows only: the deferred ones are a React-controlled list
  // below, so mutating their `hidden` here would be two owners for one node.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container
      .querySelectorAll<HTMLElement>(
        'li[data-tonight-live-id]:not([data-tonight-live-deferred])',
      )
      .forEach((node) => {
        node.hidden = !visibleIds.has(node.dataset.tonightLiveId ?? '');
      });
  }, [visibleIds]);

  return (
    <div ref={containerRef}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
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

        {active && (
          <>
            <span aria-live="polite" className="text-xs font-semibold text-text-muted">
              {strings.matchesByCount[matching.length] ?? String(matching.length)}
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

      {/* ONE list for both regimes. The server's rows arrive as an array of
          <li> and the deferred ones are appended after them, which keeps the
          list in viewer-rank order (the head is a strict prefix of the ranking)
          AND keeps every row in the same grid flow. Hidden rows are
          display:none, so they leave the flow entirely and leave no gap. */}
      <ul className={listClassName}>
        {ssrCards}
        {deferredVisible.map((slot) => (
          <TonightLiveRow key={slot.id} slot={slot} locale={locale} deferred />
        ))}
      </ul>

      {/* Unreachable by construction: an option is only offered when it has a
          match in the pool the other dropdown already narrowed, and the clamp
          above drops a selection that stops being offered. Kept as the visible
          failure mode if that invariant is ever broken — an empty list with no
          explanation is the worse outcome. */}
      {matching.length === 0 && (
        <p className="rounded-xl border border-border-default bg-background-elevated p-6 text-center text-sm text-text-secondary">
          {strings.empty}
        </p>
      )}
    </div>
  );
}

function isOffered(options: ReadonlyArray<{ value: string }>, value: string): boolean {
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
