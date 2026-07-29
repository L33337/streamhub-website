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
import {
  getMinuteClockSnapshot,
  getServerMinuteClockSnapshot,
  subscribeMinuteClock,
} from '@/lib/home/minute-clock';
import {
  computeVisibleLineupIds,
  countLineupCategoryOptions,
  countLineupLanguageOptions,
  countLineupTimeOptions,
  isLineupItemExpired,
  localHourOf,
  matchesLineupFilters,
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
  /** Resolved server-side, e.g. "Show all 120 streams". */
  showAllLabel: string;
  showLessLabel: string;
}

/**
 * Category + language + start-time dropdowns and the collapse state over the
 * server-rendered "Today's lineup". Same philosophy as HomeLiveRailFilters and
 * CollapsibleBio: the cards stay fully server-rendered (SEO) and this wrapper
 * only toggles `hidden` on `li[data-home-id]` plus a purely visual clamp.
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
  children,
  moreChildren,
}: {
  items: LineupFilterItem[];
  strings: LineupFilterStrings;
  upsellStrings: UpsellSheetStrings;
  children: React.ReactNode;
  moreChildren: React.ReactNode | null;
}) {
  const [category, setCategory] = useState('');
  const [language, setLanguage] = useState('');
  const [fromHour, setFromHour] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
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
  const moreId = useId();

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

  // Built inside the memo so the three clamped values ARE the dependencies —
  // a `selection` object assembled in render would be a new reference every
  // pass and recompute on every unrelated state change.
  // `now ?? 0` is the pre-hydration case: epoch 0 expires nothing, and no
  // selection can exist yet, so every card stays visible — identical to the
  // markup the server sent.
  const visibleIds = useMemo(
    () =>
      computeVisibleLineupIds(
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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.querySelectorAll<HTMLElement>('li[data-home-id]').forEach((node) => {
      node.hidden = !visibleIds.has(node.dataset.homeId ?? '');
    });
  }, [visibleIds]);

  const select = (next: Partial<LineupSelection>) => {
    if (next.category !== undefined) setCategory(next.category);
    if (next.language !== undefined) setLanguage(next.language);
    if (next.fromHour !== undefined) setFromHour(next.fromHour);
    // A match may sit entirely in the collapsed region.
    const willBeActive =
      (next.category ?? activeCategory) !== '' ||
      (next.language ?? activeLanguage) !== '' ||
      (next.fromHour ?? activeFromHour) !== null;
    if (willBeActive) setExpanded(true);
  };

  const selectClass =
    'rounded-full border border-border-default bg-background-elevated px-3 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:border-accent-cyan/50 hover:text-white focus-visible:border-accent-cyan focus-visible:outline-none';

  const collapsed = moreChildren !== null && !expanded;
  const matchCount = visibleIds.size;

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
          onChange={(event) => select({ language: event.target.value })}
          className={selectClass}
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
          className={selectClass}
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
              className="flex items-center gap-1 rounded-full border border-dashed border-border-default px-3 py-1.5 text-xs font-semibold text-text-muted transition-colors hover:border-accent-cyan/50 hover:text-accent-cyan"
            >
              <RotateCcw size={11} aria-hidden="true" />
              {strings.reset}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex items-center gap-1.5 rounded-full border border-dashed border-border-default px-3 py-1.5 text-xs font-semibold text-text-muted transition-colors hover:border-accent-pink/50 hover:text-accent-pink"
        >
          <Lock size={11} aria-hidden="true" />
          {strings.favoritesLabel}
        </button>
      </div>

      {children}

      {/* Unreachable by construction: an option is only offered when it has a
          match in the pool the other dropdowns already narrowed, and the clamp
          above drops a selection that stops being offered. Kept as the visible
          failure mode if that invariant is ever broken — an empty list with no
          explanation is the worse outcome. */}
      {matchCount === 0 && (
        <p className="rounded-xl border border-border-default bg-background-elevated p-6 text-center text-sm text-text-secondary">
          {strings.empty}
        </p>
      )}

      {moreChildren !== null && (
        <>
          <div
            id={moreId}
            inert={collapsed}
            className={
              collapsed ? 'relative mt-3 max-h-24 overflow-hidden' : 'mt-3'
            }
          >
            {moreChildren}
            {collapsed && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background to-transparent"
              />
            )}
          </div>
          <div className="mt-2 text-center">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              aria-controls={moreId}
              className="text-sm font-semibold text-accent-cyan transition-colors hover:text-accent-cyan/80"
            >
              {expanded ? strings.showLessLabel : strings.showAllLabel}
            </button>
          </div>
        </>
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
