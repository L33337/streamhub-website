'use client';

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { ChevronRight, RotateCcw } from 'lucide-react';
import {
  computeVisibleLiveIds,
  countLiveFilterOptions,
  matchesLiveFilters,
  type LiveFilterItem,
} from '@/lib/home/live-rail';
import {
  GAME_LIVE_VISIBLE_CAP,
  MIN_LANGUAGE_OPTIONS,
  type GameLiveCardSlot,
} from '@/lib/game-live';
import { FILTER_SELECT_CLASS } from '@/components/web/home/filter-controls';
import { GameLiveCard } from './GameLiveCard';

export interface GameLiveFilterStrings {
  languageLabel: string;
  allLanguages: string;
  /** Localized "{label} ({count})" shape; only the two parts vary. */
  optionPattern: string;
  /**
   * Pre-rendered match counter per count, indexed by it (`matchesByCount[3]` =
   * "3 live streams"). Rendered server-side for the whole 0..pool range so every
   * language keeps its own plural agreement — a `{count}` template would force
   * English "1 live streams" and break the Slavic categories.
   */
  matchesByCount: string[];
  reset: string;
  empty: string;
  /** Already counted server-side ("Show 20 more live channels"). */
  showMore: string;
  showLess: string;
}

/**
 * Language dropdown over the game hub's "Watching {category} now" grid — the
 * homepage rail's control (`HomeLiveRailFilters`), minus the category dimension
 * this page has no use for: every slot here is in the page's own category, so a
 * category dropdown would offer exactly one option.
 *
 * **The pool is what the dropdown searches, not the visible cut.** Unfiltered
 * the section is the first `GAME_LIVE_VISIBLE_CAP` cards (the show-more raises
 * that to the whole server-rendered head); with a language picked, every match
 * in the pool shows, however deep it ranks. That asymmetry is the entire point
 * — filtering only the rendered cards is how the homepage rail once ended up
 * offering German for 3 of 17 live streams.
 *
 * The pool is SPLIT (`splitGameLiveSlots`): `ssrCards` is the server-rendered
 * head, whose visibility this wrapper toggles imperatively, while
 * `deferredSlots` is the rest of the sweep as DATA, rendered here only once a
 * filter can reveal it. **The two regimes must not fight**: the imperative pass
 * skips `[data-game-live-deferred]`, because React owns those nodes.
 *
 * This replaced a `<details>` expander, which a filter cannot work with: its
 * matches past rank 4 would sit inside a collapsed element, and force-opening it
 * leaves two grids with a seam and a hole in the two-column layout. One list,
 * one owner. The no-JS reveal the `<details>` used to provide is kept in CSS
 * (`@media (scripting: none)` in app/globals.css).
 */
export function GameLiveFilters({
  items,
  strings,
  locale,
  ssrCards,
  deferredSlots,
  listClassName,
  listAriaLabel,
  footer,
}: {
  /** Filter metadata for the WHOLE pool, so counts are honest from first paint. */
  items: LiveFilterItem[];
  strings: GameLiveFilterStrings;
  locale: string;
  /** Server-rendered `<li>` cards, placed in the same grid as the deferred ones. */
  ssrCards: ReactNode[];
  /** The sweep beyond the server-rendered head, rendered here on demand. */
  deferredSlots: GameLiveCardSlot[];
  listClassName: string;
  listAriaLabel: string;
  /** "N more live in the full ranking →" — an unfiltered statement, so it is
   *  shown only in the state it describes. */
  footer?: ReactNode;
}) {
  const [language, setLanguage] = useState('');
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const languageId = useId();

  const languageOptions = useMemo(
    () => countLiveFilterOptions(items, 'language'),
    [items],
  );

  // Belt and braces. With a single dimension the option list never narrows, so
  // a selection cannot stop being offered — but clamping in render (rather than
  // trusting that) keeps the invariant local and survives a second dimension
  // being added later, and it is a pure derivation either way.
  const activeLanguage = languageOptions.some((o) => o.value === language)
    ? language
    : '';
  const active = activeLanguage !== '';

  const matching = useMemo(
    () => items.filter((item) => matchesLiveFilters(item, '', activeLanguage)),
    [items, activeLanguage],
  );

  // Unfiltered this is the server's own cut — the resting 4, or the whole
  // server-rendered head once the visitor asked for more. Filtered, the cut is
  // gone and every match in the pool shows.
  const visibleIds = useMemo(
    () =>
      computeVisibleLiveIds(
        items,
        '',
        activeLanguage,
        expanded ? ssrCards.length : GAME_LIVE_VISIBLE_CAP,
      ),
    [items, activeLanguage, expanded, ssrCards.length],
  );

  // Only the deferred cards the current selection actually reveals. Unfiltered
  // this is empty — `visibleIds` is then a prefix of the SSR head, which
  // contains no deferred id — so the resting section is pure server HTML.
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
      .querySelectorAll<HTMLElement>(
        'li[data-game-live-id]:not([data-game-live-deferred])',
      )
      .forEach((node) => {
        node.hidden = !visibleIds.has(node.dataset.gameLiveId ?? '');
      });
  }, [visibleIds]);

  // One option is not a filter. Same threshold the server applied when it
  // decided whether to ship a deferred tail at all, so the two always agree.
  const filterable = languageOptions.length >= MIN_LANGUAGE_OPTIONS;
  const canExpand = ssrCards.length > GAME_LIVE_VISIBLE_CAP;

  return (
    <div ref={containerRef} className="mt-4">
      {filterable && (
        <div
          data-game-live-controls=""
          className="mb-3 flex flex-wrap items-center gap-2"
        >
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
              <span
                aria-live="polite"
                className="text-xs font-semibold text-text-muted"
              >
                {strings.matchesByCount[matching.length] ?? String(matching.length)}
              </span>
              <button
                type="button"
                onClick={() => setLanguage('')}
                className="flex min-h-11 items-center gap-1 rounded-full border border-dashed border-border-default px-3 text-xs font-semibold text-text-muted transition-colors hover:border-accent-cyan/50 hover:text-accent-cyan"
              >
                <RotateCcw size={11} aria-hidden="true" />
                {strings.reset}
              </button>
            </>
          )}
        </div>
      )}

      {/* ONE grid for both regimes. The server's cards arrive as an array of
          <li> and the deferred ones are appended after them, which keeps the
          list in viewer-rank order (the head is a strict prefix of the ranking,
          so every head match outranks every tail match) AND keeps every card in
          the same grid flow. Hidden cards are display:none, so they leave the
          flow entirely and leave no hole in the two-column layout. */}
      <ul className={listClassName} aria-label={listAriaLabel}>
        {ssrCards}
        {deferredVisible.map((slot) => (
          <GameLiveCard key={slot.id} slot={slot} locale={locale} deferred />
        ))}
      </ul>

      {/* The show-more is meaningless while a filter is active: the filtered cut
          already shows every match. */}
      {!active && canExpand && (
        <button
          type="button"
          data-game-live-controls=""
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="mt-3 flex min-h-11 items-center gap-1.5 rounded-lg border border-border-default/60 bg-background-elevated/40 px-3 text-sm text-text-muted transition-colors hover:border-accent-cyan/60 hover:text-accent-cyan"
        >
          <ChevronRight
            size={14}
            aria-hidden="true"
            className={`shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
          {expanded ? strings.showLess : strings.showMore}
        </button>
      )}

      {/* Kept in the HTML and merely hidden, exactly as the `<details>` used to
          keep it: it is an internal link into /rankings/game/*, and rendering it
          conditionally would drop that link from the served markup entirely. */}
      {footer && (
        <div data-game-live-footer="" hidden={active || !expanded}>
          {footer}
        </div>
      )}

      {/* Unreachable by construction: an option is only offered when it has a
          match in the pool it was counted over. Kept as the visible failure mode
          if that invariant is ever broken — an empty grid with no explanation is
          the worse outcome. */}
      {matching.length === 0 && (
        <p className="rounded-xl border border-border-default bg-background-elevated p-6 text-center text-sm text-text-secondary">
          {strings.empty}
        </p>
      )}
    </div>
  );
}

/**
 * Rebuilds a localized "Label (7)" option from the server-supplied pattern,
 * which was rendered once with the tokens `{label}` / `{count}` — a lexicon
 * FUNCTION cannot cross the server→client boundary. Keeps the punctuation
 * choice (ja uses full-width parens) in the lexicon.
 */
function fillOption(pattern: string, label: string, count: number): string {
  return pattern.replace('{label}', label).replace('{count}', String(count));
}
