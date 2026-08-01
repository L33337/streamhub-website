'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { Lock, RotateCcw } from 'lucide-react';
import type { UiLang } from '@/lib/i18n-core';
import type { LineupCardSlot } from '@/lib/home/slot-payload';
import { SlotCard } from '@/components/web/SlotCard';
import { SlotBellButton } from './SlotBellButton';
import { FILTER_SELECT_CLASS } from './filter-controls';
import {
  getMinuteClockSnapshot,
  getServerMinuteClockSnapshot,
  subscribeMinuteClock,
} from '@/lib/home/minute-clock';
import {
  countLineupCategoryOptions,
  countLineupLanguageOptions,
  countLineupTimeOptions,
  isLineupItemExpired,
  lineupRevealLimit,
  LINEUP_REVEAL_STEP,
  localHourOf,
  matchesLineupFilters,
  matchingLineupIds,
  type LineupFilterItem,
  type LineupSelection,
} from '@/lib/home/lineup-filters';
import { HomeUpsellSheet, type UpsellSheetStrings } from './HomeUpsellSheet';

export interface LineupFilterStrings {
  categoryLabel: string;
  languageLabel: string;
  timeLabel: string;
  allCategories: string;
  allLanguages: string;
  allTimes: string;
  /** Hour value ("20") → localized label ("From 8:00 PM"), counts added here. */
  timeOptionLabels: Record<string, string>;
  /**
   * Pre-rendered match counter per count, indexed by it (`matchesByCount[3]`
   * = "3 streams"). Rendered server-side for the whole 0..pool range so every
   * language keeps its own plural agreement — a `{count}` template would force
   * English "1 streams" and break the Slavic categories.
   */
  matchesByCount: string[];
  reset: string;
  empty: string;
  /** Localized "{label} ({count})" shape; only the two parts vary. */
  optionPattern: string;
  favoritesLabel: string;
  /**
   * Fallback label only — the reveal button normally uses showMoreByCount.
   * Kept for the impossible case of a batch size outside that array.
   */
  showAllLabel: string;
  /**
   * Pre-rendered "show N more" per batch size, indexed by it (0..step). Same
   * reason as matchesByCount: the wording agrees with the number in several
   * languages, so a `{count}` template would break their plural categories.
   */
  showMoreByCount: string[];
  showLessLabel: string;
  /** `bellAria` rendered with a `{name}` token, filled in per deferred card. */
  bellAriaPattern: string;
}

/**
 * Category + language + start-time dropdowns and the collapse state over the
 * server-rendered "Today's lineup". Same philosophy as HomeLiveRailFilters and
 * CollapsibleBio: the cards stay fully server-rendered (SEO) and this wrapper
 * only toggles `hidden` on `li[data-home-id]` plus a purely visual clamp.
 *
 * The pool is SPLIT (2026-07-30): `children`/`moreChildren` are the
 * server-rendered head, whose visibility this wrapper toggles imperatively,
 * while `deferredSlots` is the rest of the 24 h window as DATA. Those cards are
 * rendered HERE, and only once a filter is active or the list is expanded — so
 * the filters cover the whole window without the homepage paying ~350 cards of
 * DOM up front (measured: 12,859 elements / 213 ms TBT for the all-HTML
 * variant). The two regimes must not fight: the imperative pass deliberately
 * skips `[data-home-deferred]`, because React owns those nodes.
 *
 * What this section needs that the live rail does not:
 *
 * - **A clock, for two jobs.** Cards whose predicted start has passed are
 *   hidden (the ISR page can be served hours stale, and an expired prediction
 *   would read as "was expected at …"), and the time dimension needs the
 *   current day's hours. Both re-run every minute.
 * - **Timezone resolution at mount.** "From 8 PM" means 8 PM where the visitor
 *   is; one prerendered page serves every timezone. So the server ships epoch
 *   ms per card and localized hour LABELS, and the buckets plus their counts
 *   are computed here. This is also why the time options can't be
 *   pre-rendered with counts the way the other two dropdowns are.
 * - **Auto-expand on selection.** A match may live entirely inside the
 *   collapsed peek zone, and a filter over a clipped list reads as broken.
 *
 * The locked "My favorites" chip stays as implicit hook I3 (upsell sheet).
 */
export function HomeUpNextFilters({
  items,
  strings,
  upsellStrings,
  bellStrings,
  ssrCards,
  deferredSlots,
  listClassName,
  locale,
}: {
  items: LineupFilterItem[];
  strings: LineupFilterStrings;
  upsellStrings: UpsellSheetStrings;
  bellStrings: UpsellSheetStrings;
  /** Server-rendered `<li>` cards, placed in the same grid as the deferred ones. */
  ssrCards: React.ReactNode[];
  /**
   * The pool beyond the server-rendered head, rendered here on demand —
   * pruned to what SlotCard reads, reasoning already resolved for the page's
   * locale (`toLineupCardSlot`).
   */
  deferredSlots: LineupCardSlot[];
  listClassName: string;
  locale: UiLang;
}) {
  const [category, setCategory] = useState('');
  const [language, setLanguage] = useState('');
  const [fromHour, setFromHour] = useState<number | null>(null);
  // How many times the visitor asked for more. The ONLY thing that opens the
  // list — filtering deliberately does not touch it: one dropdown change used
  // to expand the section and render the whole window.
  const [revealSteps, setRevealSteps] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  // Clock for the expiry check AND the time buckets. Unlike the live rail's
  // island this one feeds the render output (the time dropdown's options are
  // per-timezone), so it comes from an external store whose server snapshot is
  // null — see lib/home/minute-clock.ts. `null` = pre-hydration: no expiry
  // hiding and no time options, which is exactly what the server can promise.
  const now = useSyncExternalStore(
    subscribeMinuteClock,
    getMinuteClockSnapshot,
    getServerMinuteClockSnapshot,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const categoryId = useId();
  const languageId = useId();
  const timeId = useId();
  const listId = useId();

  // Expired cards leave every pool: they are about to disappear from the
  // section, so counting them would over-promise on each dropdown.
  const live = useMemo(
    () =>
      now === null
        ? items
        : items.filter((item) => !isLineupItemExpired(item, now)),
    [items, now],
  );

  // Options for one dropdown are counted over the pool the OTHER TWO narrowed
  // — never by itself, or picking a value would collapse its own list to a
  // single entry.
  const categoryOptions = useMemo(
    () =>
      countLineupCategoryOptions(
        live.filter((item) =>
          matchesLineupFilters(item, { category: '', language, fromHour }, localHourOf),
        ),
      ),
    [live, language, fromHour],
  );
  const languageOptions = useMemo(
    () =>
      countLineupLanguageOptions(
        live.filter((item) =>
          matchesLineupFilters(item, { category, language: '', fromHour }, localHourOf),
        ),
      ),
    [live, category, fromHour],
  );
  // Empty until the clock (and with it the viewer's timezone) is known: the
  // hour an option means is local, so a server-rendered list would be someone
  // else's evening.
  const timeOptions = useMemo(
    () =>
      now === null
        ? []
        : countLineupTimeOptions(
            live.filter((item) =>
              matchesLineupFilters(
                item,
                { category, language, fromHour: null },
                localHourOf,
              ),
            ),
            localHourOf,
            (hour) => strings.timeOptionLabels[String(hour)] ?? String(hour),
            now,
          ),
    [live, category, language, now, strings.timeOptionLabels],
  );

  // Belt and braces: cross-filtered options make an unselectable combination
  // impossible to reach through the UI, but a selection that stops being
  // offered (the clock moved past it, or a card expired) would strand the user
  // on an empty list with only Reset as a way out. Clamping in render instead
  // of a self-healing effect keeps it a pure derivation
  // (`react-hooks/set-state-in-effect`).
  const activeCategory = isOffered(categoryOptions, category) ? category : '';
  const activeLanguage = isOffered(languageOptions, language) ? language : '';
  const activeFromHour = isOffered(
    timeOptions,
    fromHour === null ? '' : String(fromHour),
  )
    ? fromHour
    : null;

  const active =
    activeCategory !== '' || activeLanguage !== '' || activeFromHour !== null;

  // Every match, in chronological order. Built inside the memo so the three
  // clamped values ARE the dependencies — a `selection` object assembled in
  // render would be a new reference every pass. `now ?? 0` is the
  // pre-hydration case: epoch 0 expires nothing, and no selection can exist
  // yet, so the markup matches what the server sent.
  const matchingIds = useMemo(
    () =>
      matchingLineupIds(
        items,
        {
          category: activeCategory,
          language: activeLanguage,
          fromHour: activeFromHour,
        },
        localHourOf,
        now ?? 0,
      ),
    [items, activeCategory, activeLanguage, activeFromHour, now],
  );

  const matchCount = matchingIds.length;
  const revealLimit = lineupRevealLimit(revealSteps);
  const canRevealMore = revealLimit < matchCount;

  // The reveal window is a PREFIX of the matches, so it spans both regimes:
  // whichever cards fall inside it are shown, server-rendered or deferred.
  const revealedIds = useMemo(
    () => new Set(matchingIds.slice(0, revealLimit)),
    [matchingIds, revealLimit],
  );

  // Only as much of the deferred tail as the window reaches — a filter whose
  // matches all sit late in the day still shows its first few cards without
  // opening the whole list.
  const deferredVisible = useMemo(
    () => deferredSlots.filter((slot) => revealedIds.has(slot.id)),
    [deferredSlots, revealedIds],
  );

  // Server-rendered cards only: the deferred ones are a React-controlled list
  // below, so mutating their `hidden` here would be two owners for one node.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container
      .querySelectorAll<HTMLElement>('li[data-home-id]:not([data-home-deferred])')
      .forEach((node) => {
        node.hidden = !revealedIds.has(node.dataset.homeId ?? '');
      });
  }, [revealedIds]);

  const select = (next: Partial<LineupSelection>) => {
    if (next.category !== undefined) setCategory(next.category);
    if (next.language !== undefined) setLanguage(next.language);
    if (next.fromHour !== undefined) setFromHour(next.fromHour);
    // No expansion bookkeeping: `expanded` follows from `active`.
  };

  return (
    <div ref={containerRef}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={categoryId}>
          {strings.categoryLabel}
        </label>
        <select
          id={categoryId}
          value={activeCategory}
          onChange={(event) => select({ category: event.target.value })}
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
          onChange={(event) => select({ language: event.target.value })}
          className={FILTER_SELECT_CLASS}
        >
          <option value="">{strings.allLanguages}</option>
          {languageOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {fillOption(strings.optionPattern, option.label, option.count)}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor={timeId}>
          {strings.timeLabel}
        </label>
        <select
          id={timeId}
          value={activeFromHour === null ? '' : String(activeFromHour)}
          onChange={(event) =>
            select({
              fromHour: event.target.value === '' ? null : Number(event.target.value),
            })
          }
          className={FILTER_SELECT_CLASS}
        >
          <option value="">{strings.allTimes}</option>
          {timeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {fillOption(strings.optionPattern, option.label, option.count)}
            </option>
          ))}
        </select>

        {active && (
          <>
            <span aria-live="polite" className="text-xs font-semibold text-text-muted">
              {strings.matchesByCount[matchCount] ?? String(matchCount)}
            </span>
            <button
              type="button"
              onClick={() => {
                setCategory('');
                setLanguage('');
                setFromHour(null);
              }}
              className="flex min-h-11 items-center gap-1 rounded-full border border-dashed border-border-default px-3 text-xs font-semibold text-text-muted transition-colors hover:border-accent-cyan/50 hover:text-accent-cyan"
            >
              <RotateCcw size={11} aria-hidden="true" />
              {strings.reset}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex min-h-11 items-center gap-1.5 rounded-full border border-dashed border-border-default px-3 text-xs font-semibold text-text-muted transition-colors hover:border-accent-pink/50 hover:text-accent-pink"
        >
          <Lock size={11} aria-hidden="true" />
          {strings.favoritesLabel}
        </button>
      </div>

      {/* ONE grid for both regimes. The server's cards arrive as an array of
          <li> and the deferred ones are appended after them, which keeps the
          whole list chronological (the head is the pool's first
          LINEUP_SSR_COUNT slots by start time) AND keeps every card in the
          same grid flow. Two sibling grids left a half-filled row wherever the
          first ended on an odd count — and clamping one of them to a peek
          height cut the first visible card in half whenever the matches all
          sat in the second. Hidden cards are display:none, so they leave the
          flow entirely and no gap appears. */}
      <ul id={listId} className={listClassName}>
        {ssrCards}
        {deferredVisible.map((slot) => (
          <li
            key={slot.id}
            data-home-id={slot.id}
            // Marks React's own nodes: the imperative `hidden` pass skips them.
            data-home-deferred=""
            className="relative"
          >
            <SlotCard slot={slot} language={locale} />
            <SlotBellButton
              ariaLabel={strings.bellAriaPattern.replace(
                '{name}',
                slot.streamer_name,
              )}
              strings={bellStrings}
              className="absolute right-3 top-3 z-10"
            />
          </li>
        ))}
      </ul>

      {/* Unreachable by construction: an option is only offered when it has a
          match in the pool the other dropdowns already narrowed, and the clamp
          in render drops a selection that stops being offered. Kept as the
          visible failure mode if that invariant is ever broken — an empty list
          with no explanation is the worse outcome. */}
      {matchCount === 0 && (
        <p className="rounded-xl border border-border-default bg-background-elevated p-6 text-center text-sm text-text-secondary">
          {strings.empty}
        </p>
      )}

      {/* One batch per click, and a separate way back — a single toggle would
          have to mean both "more" and "less" at once as soon as the list
          reveals in steps. The count is what the NEXT click adds, so the last
          batch says what is actually left. */}
      {(canRevealMore || revealSteps > 0) && (
        <div className="mt-3 flex items-center justify-center gap-4 text-sm font-semibold">
          {canRevealMore && (
            <button
              type="button"
              onClick={() => setRevealSteps((steps) => steps + 1)}
              aria-controls={listId}
              className="text-accent-cyan transition-colors hover:text-accent-cyan/80"
            >
              {strings.showMoreByCount[
                Math.min(LINEUP_REVEAL_STEP, matchCount - revealLimit)
              ] ?? strings.showAllLabel}
            </button>
          )}
          {revealSteps > 0 && (
            <button
              type="button"
              onClick={() => setRevealSteps(0)}
              aria-controls={listId}
              className="text-text-muted transition-colors hover:text-white"
            >
              {strings.showLessLabel}
            </button>
          )}
        </div>
      )}

      {sheetOpen && (
        <HomeUpsellSheet strings={upsellStrings} onClose={() => setSheetOpen(false)} />
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
