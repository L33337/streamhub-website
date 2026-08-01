'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { RotateCcw } from 'lucide-react';
import type { UiLang } from '@/lib/i18n-core';
import { liveRuntimeLexFor } from '@/lib/i18n/live-runtime';
import {
  computeVisibleLiveIds,
  countLiveFilterOptions,
  formatLiveRuntime,
  liveRuntimeFrom,
  matchesLiveFilters,
  LIVE_RAIL_DEFAULT_VISIBLE,
  type LiveFilterItem,
} from '@/lib/home/live-rail';
import type { LiveCardSlot } from '@/lib/home/slot-payload';
import {
  getMinuteClockSnapshot,
  getServerMinuteClockSnapshot,
  subscribeMinuteClock,
} from '@/lib/home/minute-clock';
import { RailScroller } from '@/components/web/feed/RailScroller';
import { FILTER_SELECT_CLASS } from './filter-controls';
import { LiveRailCard } from './LiveRailCard';

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
 * Category + language dropdowns over the "Most Watched right now" rail, plus
 * the minute tick that keeps the runtime lines honest.
 *
 * The pool is SPLIT (2026-08-01, mirroring `HomeUpNextFilters`): `ssrCards` is
 * the server-rendered head — the unfiltered cut — whose visibility this wrapper
 * toggles imperatively, while `deferredSlots` is the rest of the live sweep as
 * DATA. Those cards are rendered HERE, and only once a filter is active, which
 * is the only state that can reveal them. So the filters still reach a stream
 * at rank 84 without the homepage paying ~170 cards of DOM up front. **The two
 * regimes must not fight**: the imperative pass deliberately skips
 * `[data-live-deferred]`, because React owns those nodes.
 *
 * Two additions the lineup filter doesn't need:
 *
 * - **Cross-filtered option counts.** Picking "German" narrows the category
 *   counts to German streams, so a combination that yields nothing can't be
 *   selected. The initial (unfiltered) render matches the server's option list
 *   exactly, so hydration is clean.
 * - **Runtime tick.** "~2 h left" is served from ISR HTML that can be up to a
 *   minute old, and a tab left open ages arbitrarily. Every 60 s the SSR labels
 *   are re-derived from `data-live-start` / `data-live-duration` with the same
 *   pure formatter the server used — including the flip to "Longer than
 *   expected" when an estimate lapses while the page is open. Deferred cards
 *   take the same clock as a PROP and re-render instead; they carry none of
 *   those data attributes, so the two paths can never both own a label.
 */
export function HomeLiveRailFilters({
  items,
  strings,
  locale,
  ssrCards,
  deferredSlots,
}: {
  items: LiveFilterItem[];
  strings: LiveFilterStrings;
  locale: UiLang;
  /** Server-rendered `<li>` cards, placed in the same rail as the deferred ones. */
  ssrCards: React.ReactNode[];
  /** The sweep beyond the server-rendered head, rendered here on demand. */
  deferredSlots: LiveCardSlot[];
}) {
  const [category, setCategory] = useState('');
  const [language, setLanguage] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const categoryId = useId();
  const languageId = useId();
  // Drives the DEFERRED cards' runtime lines only. Its server snapshot is null
  // and that is safe here: no deferred card can render server-side (the
  // unfiltered visible set is the SSR head by construction), so `?? 0` is
  // unreachable in practice and merely keeps the type honest.
  const now = useSyncExternalStore(
    subscribeMinuteClock,
    getMinuteClockSnapshot,
    getServerMinuteClockSnapshot,
  );
  const runtimeLex = useMemo(() => liveRuntimeLexFor(locale), [locale]);

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

  // Unfiltered this is the server's own cut (the first N items); filtered it
  // is every match in the pool, however deep. `matching` above stays the
  // counter's and the empty state's input — with a filter active the two sets
  // are identical.
  const visibleIds = useMemo(
    () =>
      computeVisibleLiveIds(
        items,
        activeCategory,
        activeLanguage,
        LIVE_RAIL_DEFAULT_VISIBLE,
      ),
    [items, activeCategory, activeLanguage],
  );

  // Only the deferred cards the current selection actually reveals. Unfiltered
  // this is empty — `visibleIds` is then the SSR head's prefix, which contains
  // no deferred id — so the resting rail is pure server HTML.
  const deferredVisible = useMemo(
    () => deferredSlots.filter((slot) => visibleIds.has(slot.id)),
    [deferredSlots, visibleIds],
  );

  // Server-rendered cards only: the deferred ones are a React-controlled list
  // below, so mutating their `hidden` here would be two owners for one node.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container
      .querySelectorAll<HTMLElement>('li[data-live-id]:not([data-live-deferred])')
      .forEach((node) => {
        node.hidden = !visibleIds.has(node.dataset.liveId ?? '');
      });
    // Going from 30 cards to 5 (or back) leaves the horizontal scroller
    // parked wherever the previous set ended — often past the end of the new
    // one, i.e. on empty space.
    container
      .querySelectorAll<HTMLElement>('[data-rail-scroll]')
      .forEach((node) => {
        node.scrollLeft = 0;
      });
  }, [visibleIds]);

  // Runtime lines of the SERVER-rendered cards: re-derived on mount (the
  // served HTML may be a minute stale) and every minute after. Deferred cards
  // are excluded by construction — they carry no `data-live-runtime`.
  useEffect(() => {
    const container = containerRef.current;
    const lex = liveRuntimeLexFor(locale);
    const refresh = () => {
      const nowMs = Date.now();
      container
        ?.querySelectorAll<HTMLElement>('[data-live-runtime]')
        .forEach((node) => {
          const start = Number(node.dataset.liveStart);
          const duration = Number(node.dataset.liveDuration);
          const alwaysOn = node.dataset.liveAlwayson === '1';
          if (!Number.isFinite(start)) return;
          const text = formatLiveRuntime(
            liveRuntimeFrom(start, duration, alwaysOn, nowMs),
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

      {/* ONE rail for both regimes. The server's cards arrive as an array of
          <li> and the deferred ones are appended after them, which keeps the
          list in viewer-rank order (the head is a strict prefix of the
          ranking, so every head match outranks every tail match) AND keeps
          every card in the same horizontal flex row. Hidden cards are
          display:none, so they leave the flow entirely and leave no gap. */}
      <RailScroller contentClassName="pb-2">
        <ul className="flex gap-3">
          {ssrCards}
          {deferredVisible.map((slot) => (
            <LiveRailCard
              key={slot.id}
              slot={slot}
              locale={locale}
              nowMs={now ?? 0}
              runtimeLex={runtimeLex}
              deferred
            />
          ))}
        </ul>
      </RailScroller>

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
