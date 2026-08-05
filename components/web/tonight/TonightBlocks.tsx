'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { RotateCcw } from 'lucide-react';
import type { UiLang } from '@/lib/i18n-core';
import type { LineupCardSlot } from '@/lib/home/slot-payload';
import { SlotCard } from '@/components/web/SlotCard';
import { FILTER_SELECT_CLASS } from '@/components/web/home/filter-controls';
import {
  getMinuteClockSnapshot,
  getServerMinuteClockSnapshot,
  subscribeMinuteClock,
} from '@/lib/home/minute-clock';
import {
  countTonightCategoryOptions,
  countTonightLanguageOptions,
  formatClockReading,
  isTonightItemExpired,
  matchesTonightFilters,
  matchingTonightIdsByBlock,
  tonightRevealLimit,
  TONIGHT_REVEAL_STEP,
  type TonightFilterItem,
} from '@/lib/tonight/logic';

export interface TonightBlockView {
  /** Anchor id, also the `blockId` of this block's filter items. */
  id: string;
  startMs: number;
  isNight: boolean;
  /**
   * Heading as the SERVER rendered it — the reference zone's clock reading,
   * already wrapped by the lexicon ("From 8:00 PM"). Kept as the pre-hydration
   * snapshot and as the fallback for a viewer whose zone matches.
   */
  headingSsr: string;
  /** Server-rendered `<li>` cards, placed in the same `<ul>` as the deferred ones. */
  ssrCards: ReactNode[];
  /** The rest of the block's pool, pruned to what SlotCard reads. */
  deferredSlots: LineupCardSlot[];
}

export interface TonightStrings {
  categoryLabel: string;
  languageLabel: string;
  allCategories: string;
  allLanguages: string;
  /** Localized "{label} ({count})" shape; only the two parts vary. */
  optionPattern: string;
  /**
   * Pre-rendered match counter per count, indexed by it. Rendered server-side
   * for the whole 0..pool range so every language keeps its own plural
   * agreement — a `{count}` template would force English "1 streams" and break
   * the Slavic categories.
   */
  matchesByCount: string[];
  /** Same reasoning: the per-block count chip, indexed by count. */
  blockCountByNumber: string[];
  reset: string;
  empty: string;
  /** `blockFrom` rendered with a `{time}` token, filled in after hydration. */
  blockFromPattern: string;
  /** Heading of the night block — a word, so no relabeling. */
  blockNight: string;
  /** Pre-rendered "show N more" per batch size, indexed by it (0..step). */
  showMoreByCount: string[];
  showLess: string;
  jumpAria: string;
}

/**
 * The time-block listing of /tonight: the four evening blocks, their cards, the
 * category/language filters and the jump nav.
 *
 * **Why this is a client component that still ships full HTML.** It renders on
 * the server like any other component; the client parts only take over after
 * hydration. That is what lets it own two things a server component could not:
 *
 * 1. **Local relabeling.** Blocks are ABSOLUTE instant ranges (lib/tonight/logic.ts);
 *    their headings are only a clock READING of the boundary. The server renders
 *    the locale's reference zone (deterministic, ISR-safe — one prerendered page
 *    serves every timezone), and after hydration each heading is re-formatted in
 *    the viewer's own zone. No card ever moves between blocks, so there is no
 *    reflow and no hydration mismatch beyond the label itself.
 * 2. **Expiry + filters**, exactly as "Today's lineup" does (HomeUpNextFilters).
 *
 * The pool is SPLIT per block: `ssrCards` are HTML whose visibility this
 * component toggles imperatively, `deferredSlots` are DATA rendered here on
 * demand. The two regimes must not fight — the imperative pass deliberately
 * skips `[data-tonight-deferred]`, because React owns those nodes.
 */
export function TonightBlocks({
  blocks,
  items,
  strings,
  locale,
  referenceOffsetMinutes,
  windowStartMs,
  listClassName,
}: {
  blocks: TonightBlockView[];
  /** Filter metadata for the WHOLE pool, so counts are honest from first paint. */
  items: TonightFilterItem[];
  strings: TonightStrings;
  locale: UiLang;
  /** Reference-zone UTC offset at `windowStartMs`, in minutes. */
  referenceOffsetMinutes: number;
  /** Instant the two offsets are compared at — the evening's 18:00. */
  windowStartMs: number;
  listClassName: string;
}) {
  const [category, setCategory] = useState('');
  const [language, setLanguage] = useState('');
  /** Reveal clicks per block id — the only thing that opens a block. */
  const [revealSteps, setRevealSteps] = useState<Record<string, number>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const categoryId = useId();
  const languageId = useId();

  // Feeds the render output (expiry), so it comes from the store whose SERVER
  // snapshot is null — see lib/home/minute-clock.ts. `null` = pre-hydration:
  // hide nothing, which is exactly what the server can promise.
  const now = useSyncExternalStore(
    subscribeMinuteClock,
    getMinuteClockSnapshot,
    getServerMinuteClockSnapshot,
  );

  // Whether the viewer's own clock agrees with the reference zone. When it
  // does — every German visitor on /de — the headings are left exactly as the
  // server wrote them, so the common case has no swap at all.
  //
  // Both offsets are read AT THE WINDOW START, not at "now": the two differ
  // across a DST boundary, and comparing an offset taken now against a
  // reference offset taken then would report a shift that does not exist.
  // Passing the instant also keeps the snapshot pure (react-hooks/purity).
  const viewerOffset = useSyncExternalStore(
    subscribeMinuteClock,
    () => -new Date(windowStartMs).getTimezoneOffset(),
    () => referenceOffsetMinutes,
  );
  const shifted = viewerOffset !== referenceOffsetMinutes;

  const live = useMemo(
    () => (now === null ? items : items.filter((item) => !isTonightItemExpired(item, now))),
    [items, now],
  );

  // Options for one dropdown are counted over the pool the OTHER one narrowed
  // — never by itself, or picking a value would collapse its own list to a
  // single entry.
  const categoryOptions = useMemo(
    () =>
      countTonightCategoryOptions(
        live.filter((item) => matchesTonightFilters(item, { category: '', language })),
      ),
    [live, language],
  );
  const languageOptions = useMemo(
    () =>
      countTonightLanguageOptions(
        live.filter((item) => matchesTonightFilters(item, { category, language: '' })),
      ),
    [live, category],
  );

  // Belt and braces: cross-filtered options make an unselectable combination
  // unreachable through the UI, but a selection that stops being offered (a
  // card expired) would strand the visitor on an empty list with only Reset as
  // a way out. Clamping in render keeps it a pure derivation
  // (`react-hooks/set-state-in-effect`).
  const activeCategory = isOffered(categoryOptions, category) ? category : '';
  const activeLanguage = isOffered(languageOptions, language) ? language : '';
  const active = activeCategory !== '' || activeLanguage !== '';

  const matchesByBlock = useMemo(
    () =>
      matchingTonightIdsByBlock(
        items,
        { category: activeCategory, language: activeLanguage },
        now ?? 0,
      ),
    [items, activeCategory, activeLanguage, now],
  );

  const totalMatches = useMemo(
    () => [...matchesByBlock.values()].reduce((sum, ids) => sum + ids.length, 0),
    [matchesByBlock],
  );

  /** Ids currently revealed, across every block. */
  const revealedIds = useMemo(() => {
    const revealed = new Set<string>();
    for (const [blockId, ids] of matchesByBlock) {
      const limit = tonightRevealLimit(revealSteps[blockId] ?? 0);
      for (const id of ids.slice(0, limit)) revealed.add(id);
    }
    return revealed;
  }, [matchesByBlock, revealSteps]);

  // Server-rendered cards only: the deferred ones are a React-controlled list,
  // so mutating their `hidden` here would be two owners for one node.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container
      .querySelectorAll<HTMLElement>('li[data-tonight-id]:not([data-tonight-deferred])')
      .forEach((node) => {
        node.hidden = !revealedIds.has(node.dataset.tonightId ?? '');
      });
  }, [revealedIds]);

  const visibleBlocks = blocks.filter((block) => (matchesByBlock.get(block.id)?.length ?? 0) > 0);

  const headingOf = (block: TonightBlockView): string => {
    if (block.isNight) return strings.blockNight;
    if (!shifted) return block.headingSsr;
    const reading = formatClockReading(block.startMs, locale);
    return reading ? strings.blockFromPattern.replace('{time}', reading) : block.headingSsr;
  };

  return (
    <div ref={containerRef}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
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
              {strings.matchesByCount[totalMatches] ?? String(totalMatches)}
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

      {visibleBlocks.length > 1 && (
        <nav
          aria-label={strings.jumpAria}
          className="mb-6 flex flex-wrap gap-2 border-y border-divider py-2"
        >
          {visibleBlocks.map((block) => (
            <a
              key={block.id}
              href={`#${block.id}`}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border-default bg-background-elevated px-3 text-xs font-semibold text-text-secondary transition-colors hover:border-accent-cyan/60 hover:text-white"
            >
              {headingOf(block)}
              <span className="text-text-muted">
                {matchesByBlock.get(block.id)?.length ?? 0}
              </span>
            </a>
          ))}
        </nav>
      )}

      {blocks.map((block) => {
        const matches = matchesByBlock.get(block.id) ?? [];
        const revealLimit = tonightRevealLimit(revealSteps[block.id] ?? 0);
        const canRevealMore = revealLimit < matches.length;
        const steps = revealSteps[block.id] ?? 0;
        // Only as much of the deferred tail as this block's window reaches.
        const deferredVisible = block.deferredSlots.filter((slot) =>
          revealedIds.has(slot.id),
        );
        return (
          <section
            key={block.id}
            id={block.id}
            // A block a filter emptied leaves the page entirely — an empty
            // "From 10 PM" heading reads as a loading bug.
            hidden={matches.length === 0 || undefined}
            aria-label={headingOf(block)}
            className="mt-10 scroll-mt-32"
          >
            <h2 className="text-xl font-bold text-white">
              {headingOf(block)}
              <span className="ml-2 text-sm font-normal text-text-muted">
                {strings.blockCountByNumber[matches.length] ?? String(matches.length)}
              </span>
            </h2>
            {/* ONE grid per block for both regimes: the server's cards arrive
                as an array of <li> and the deferred ones are appended, so the
                whole block stays chronological AND shares one grid flow. Two
                sibling grids laid out independently and left a half-filled row
                wherever the first ended on an odd count (homepage, 2026-07-30). */}
            <ul className={listClassName}>
              {block.ssrCards}
              {deferredVisible.map((slot) => (
                <li
                  key={slot.id}
                  data-tonight-id={slot.id}
                  // Marks React's own nodes: the imperative pass skips them.
                  data-tonight-deferred=""
                  className="min-w-0"
                >
                  <SlotCard slot={slot} language={locale} />
                </li>
              ))}
            </ul>
            {(canRevealMore || steps > 0) && (
              <div className="mt-3 flex items-center justify-center gap-4 text-sm font-semibold">
                {canRevealMore && (
                  <button
                    type="button"
                    onClick={() =>
                      setRevealSteps((prev) => ({
                        ...prev,
                        [block.id]: (prev[block.id] ?? 0) + 1,
                      }))
                    }
                    className="text-accent-cyan transition-colors hover:text-accent-cyan/80"
                  >
                    {strings.showMoreByCount[
                      Math.min(TONIGHT_REVEAL_STEP, matches.length - revealLimit)
                    ] ?? strings.showMoreByCount[TONIGHT_REVEAL_STEP]}
                  </button>
                )}
                {steps > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setRevealSteps((prev) => ({ ...prev, [block.id]: 0 }))
                    }
                    className="text-text-muted transition-colors hover:text-white"
                  >
                    {strings.showLess}
                  </button>
                )}
              </div>
            )}
          </section>
        );
      })}

      {totalMatches === 0 && (
        <p className="mt-6 rounded-xl border border-border-default bg-background-elevated p-6 text-center text-sm text-text-secondary">
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
