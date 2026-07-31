'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import type { FeedClip } from '@/lib/feed/types';
import {
  computeVisibleClipIds,
  countClipFilterOptions,
  matchesClipFilters,
  CLIPS_DEFAULT_VISIBLE,
  type ClipFilterItem,
} from '@/lib/home/clip-filters';
import { ClipCard } from '@/components/web/feed/ClipCard';
import { ClipLightbox } from '@/components/web/feed/ClipLightbox';
import { RailScroller } from '@/components/web/feed/RailScroller';
import { FILTER_SELECT_CLASS } from './filter-controls';

export interface ClipFilterStrings {
  categoryLabel: string;
  languageLabel: string;
  allCategories: string;
  allLanguages: string;
  /**
   * Pre-rendered match counter per count, indexed by it (`matchesByCount[3]`
   * = "3 clips"). Rendered server-side for the whole 0..pool range so every
   * language keeps its own plural agreement.
   */
  matchesByCount: string[];
  reset: string;
  empty: string;
  /** Localized "{label} ({count})" shape; only the two parts vary. */
  optionPattern: string;
}

/**
 * Category + language dropdowns over "Clips of the week", plus the rail and
 * the lightbox.
 *
 * Same contract as HomeLiveRailFilters: unfiltered the rail is its resting cut
 * (the first CLIPS_DEFAULT_VISIBLE clips of the round-robin order), and ANY
 * selection drops the cut and shows every match in the pool, however deep it
 * ranks. That is what a 300-clip pool buys — a Polish clip at rank 240 is
 * reachable, where the old flat top 12 offered three languages in total.
 *
 * Unlike the live rail this needs NO imperative `hidden` pass and no
 * server/deferred split: ClipCard is a client component, so the cards are
 * React's either way and the visible set is a plain derivation. The resting
 * state is what renders on the server, so the served HTML is exactly the
 * unfiltered rail and hydration has nothing to correct. And unlike the lineup
 * there is no clock in it — clip timestamps never enter the filters, so the
 * timezone trap that forced lib/home/minute-clock.ts does not apply here.
 *
 * A JS-less browser keeps the resting cut with inert dropdowns — the honest
 * degradation for a filter nobody can operate.
 */
export function HomeClipsRailClient({
  clips,
  names,
  items,
  strings,
}: {
  clips: FeedClip[];
  names: Record<string, string>;
  items: ClipFilterItem[];
  strings: ClipFilterStrings;
}) {
  const [category, setCategory] = useState('');
  const [language, setLanguage] = useState('');
  const [activeClip, setActiveClip] = useState<FeedClip | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const categoryId = useId();
  const languageId = useId();

  // Options for one dropdown are counted over the pool narrowed by the OTHER
  // dropdown — never by itself, or picking a value would collapse its own list
  // to a single entry. Cross-filtering also makes a zero-result combination
  // unreachable through the UI.
  const categoryOptions = useMemo(
    () =>
      countClipFilterOptions(
        items.filter((item) => matchesClipFilters(item, '', language)),
        'category',
      ),
    [items, language],
  );
  const languageOptions = useMemo(
    () =>
      countClipFilterOptions(
        items.filter((item) => matchesClipFilters(item, category, '')),
        'language',
      ),
    [items, category],
  );

  // Belt and braces: a selection that stops being offered (a stale one carried
  // across an ISR regeneration) would strand the visitor on an empty rail with
  // only Reset as a way out. Clamping in render instead of a self-healing
  // effect keeps it a pure derivation (`react-hooks/set-state-in-effect`).
  const activeCategory = isOffered(categoryOptions, category) ? category : '';
  const activeLanguage = isOffered(languageOptions, language) ? language : '';
  const active = activeCategory !== '' || activeLanguage !== '';

  const visibleIds = useMemo(
    () =>
      computeVisibleClipIds(
        items,
        activeCategory,
        activeLanguage,
        CLIPS_DEFAULT_VISIBLE,
      ),
    [items, activeCategory, activeLanguage],
  );

  // Pool order is load-bearing (round-robin by streamer), so the visible list
  // is filtered OUT of the clips rather than mapped out of the id set. It
  // doubles as the lightbox playlist: prev/next must walk what the visitor can
  // actually see, and the "3 / 12" counter has to agree with the rail.
  const visibleClips = useMemo(
    () => clips.filter((clip) => visibleIds.has(clip.id)),
    [clips, visibleIds],
  );

  // Going from 141 cards back to 24 leaves the horizontal scroller parked
  // wherever the previous set ended — often past the end of the new one, i.e.
  // on empty space.
  useEffect(() => {
    containerRef.current
      ?.querySelectorAll<HTMLElement>('[data-rail-scroll]')
      .forEach((node) => {
        node.scrollLeft = 0;
      });
  }, [visibleIds]);

  // A filter can drop the clip that is currently playing out of the rail. The
  // lightbox stays open on purpose (closing a video someone is watching
  // because a dropdown moved is worse), but it must not keep a playlist the
  // rail no longer shows — an empty/foreign playlist would make prev/next jump
  // somewhere the visitor never saw.
  const playlist = useMemo(
    () =>
      activeClip && visibleIds.has(activeClip.id) ? visibleClips : undefined,
    [activeClip, visibleClips, visibleIds],
  );

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
              {strings.matchesByCount[visibleClips.length] ??
                String(visibleClips.length)}
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

      <RailScroller contentClassName="pb-2">
        <ul className="flex gap-3">
          {visibleClips.map((clip) => (
            <li key={clip.id}>
              <ClipCard
                clip={clip}
                streamerName={names[clip.streamerId]}
                onOpen={(event) => {
                  event.preventDefault();
                  setActiveClip(clip);
                }}
              />
            </li>
          ))}
        </ul>
      </RailScroller>

      {/* Unreachable by construction: an option is only offered when it has a
          match in the pool the other dropdown already narrowed, and the clamp
          above drops a selection that stops being offered. Kept as the visible
          failure mode if that invariant is ever broken — an empty rail with no
          explanation is the worse outcome. */}
      {visibleClips.length === 0 && (
        <p className="rounded-xl border border-border-default bg-background-elevated p-6 text-center text-sm text-text-secondary">
          {strings.empty}
        </p>
      )}

      {activeClip && (
        <ClipLightbox
          key={activeClip.id}
          clip={activeClip}
          streamerName={names[activeClip.streamerId]}
          onClose={() => setActiveClip(null)}
          playlist={playlist}
          onNavigate={setActiveClip}
        />
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
