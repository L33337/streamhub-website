'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import type { UiLang } from '@/lib/i18n-core';
import { liveRuntimeLexFor } from '@/lib/i18n/live-runtime';
import {
  countLiveFilterOptions,
  formatLiveRuntime,
  liveRuntimeFrom,
  matchesLiveFilters,
  type LiveFilterItem,
} from '@/lib/home/live-rail';

export interface LiveFilterStrings {
  categoryLabel: string;
  languageLabel: string;
  allCategories: string;
  allLanguages: string;
  /**
   * Pre-rendered match counter per count, indexed by it (`matchesByCount[3]`
   * = "3 live streams"). Rendered server-side for the whole 0..pool range so
   * every language keeps its own plural agreement — a `{count}` template
   * would force English "1 live streams" and break the Slavic categories.
   */
  matchesByCount: string[];
  reset: string;
  empty: string;
  /** Localized "{label} ({count})" shape; only the two parts vary. */
  optionPattern: string;
}

/**
 * Category + language dropdowns over the server-rendered "Most Watched right
 * now" rail, plus the minute tick that keeps the runtime lines honest.
 *
 * Same philosophy as HomeUpNextFilters: the cards stay fully server-rendered
 * and this wrapper only toggles `hidden` on `li[data-live-id]`, so crawlers and
 * a JS-less browser get the complete rail (the dropdowns SSR too but do
 * nothing there — the right degradation for a filter over a complete list).
 * Two additions the lineup filter doesn't need:
 *
 * - **Cross-filtered option counts.** Picking "German" narrows the category
 *   counts to German streams, so a combination that yields nothing can't be
 *   selected. The initial (unfiltered) render matches the server's option list
 *   exactly, so hydration is clean.
 * - **Runtime tick.** "~2 h left" is served from ISR HTML that can be up to a
 *   minute old, and a tab left open ages arbitrarily. Every 60 s the labels are
 *   re-derived from `data-live-start` / `data-live-duration` with the same pure
 *   formatter the server used — including the flip to "Longer than expected"
 *   when an estimate lapses while the page is open.
 */
export function HomeLiveRailFilters({
  items,
  strings,
  locale,
  children,
}: {
  items: LiveFilterItem[];
  strings: LiveFilterStrings;
  locale: UiLang;
  children: React.ReactNode;
}) {
  const [category, setCategory] = useState('');
  const [language, setLanguage] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const categoryId = useId();
  const languageId = useId();

  // Options for one dropdown are counted over the pool narrowed by the OTHER
  // dropdown — never by itself, or picking a value would collapse its own list
  // to a single entry.
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
  // impossible to reach through the UI, but a stale selection would strand the
  // user on an empty rail with only Reset as a way out. Clamping in render
  // (instead of a self-healing effect) keeps it a pure derivation.
  const activeCategory = isOffered(categoryOptions, category) ? category : '';
  const activeLanguage = isOffered(languageOptions, language) ? language : '';

  const matching = useMemo(
    () =>
      items.filter((item) =>
        matchesLiveFilters(item, activeCategory, activeLanguage),
      ),
    [items, activeCategory, activeLanguage],
  );

  const active = activeCategory !== '' || activeLanguage !== '';

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const visible = new Set(matching.map((item) => item.id));
    container.querySelectorAll<HTMLElement>('li[data-live-id]').forEach((node) => {
      node.hidden = !visible.has(node.dataset.liveId ?? '');
    });
  }, [matching]);

  // Runtime lines: re-derived on mount (the served HTML may be a minute stale)
  // and every minute after.
  useEffect(() => {
    const container = containerRef.current;
    const lex = liveRuntimeLexFor(locale);
    const refresh = () => {
      const now = Date.now();
      container
        ?.querySelectorAll<HTMLElement>('[data-live-runtime]')
        .forEach((node) => {
          const start = Number(node.dataset.liveStart);
          const duration = Number(node.dataset.liveDuration);
          const alwaysOn = node.dataset.liveAlwayson === '1';
          if (!Number.isFinite(start)) return;
          const text = formatLiveRuntime(
            liveRuntimeFrom(start, duration, alwaysOn, now),
            lex,
          );
          // An empty line would collapse the card's meta row and shift the
          // rail; keep whatever the server rendered in that case.
          if (text && text !== node.textContent) node.textContent = text;
        });
    };
    refresh();
    const timer = setInterval(refresh, 60_000);
    return () => clearInterval(timer);
  }, [locale]);

  // `min-h-11` on the controls: these are the primary filter affordance on a
  // phone and were 32px tall, well under the 44px touch minimum.
  const selectClass =
    'min-h-11 rounded-full border border-border-default bg-background-elevated px-3 text-xs font-semibold text-text-secondary transition-colors hover:border-accent-cyan/50 hover:text-white focus-visible:border-accent-cyan focus-visible:outline-none';

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
          className={selectClass}
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
          className={selectClass}
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

      {children}

      {/* Unreachable by construction: an option is only offered when it has a
          match in the pool the other dropdown already narrowed, and the clamp
          above drops a selection that stops being offered. Kept as the visible
          failure mode if that invariant is ever broken — an empty rail with no
          explanation is the worse outcome. */}
      {matching.length === 0 && (
        <p className="rounded-xl border border-border-default bg-background-elevated p-6 text-center text-sm text-text-secondary">
          {strings.empty}
        </p>
      )}
    </div>
  );
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
