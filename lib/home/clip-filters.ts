// Pure view-model helpers for "Clips of the week" — the homepage's highlight
// rail (category + language dropdowns added 2026-07-31, mirroring the live
// rail's pair). No fetching and no clock: everything is derived from the
// arguments, so the whole section is unit-testable
// (lib/home/__tests__/clip-filters.test.ts).

import type { FeedClip } from '@/lib/feed/types';
import {
  countFilterOptions,
  normalizeLanguageCode,
  type CountedFilterOption,
} from './filter-options';

/**
 * Safety cap on the pool — and with it the filter scope. Production holds
 * ~7,600 visible clips in the 7-day window, so this is a genuine cut, not
 * headroom: the top 500 by views cover 147 streamers, 69 categories and all
 * 10 broadcast languages that appear at all (measured 2026-07-31). The
 * languages are complete from ~300 onwards; what the last 200 clips buy is
 * category depth — the long tail of games a visitor is most likely to miss.
 *
 * Unlike the live rail's cap this one is a PAYLOAD guard, not a DOM guard:
 * ClipCard is a client component, so every pooled clip crosses the boundary as
 * props whether or not it is rendered (~640 bytes/clip, thumbnails alone
 * averaging 169 characters).
 */
export const HOME_CLIPS_POOL_MAX = 500;

/**
 * The unfiltered cut: how many cards are in the rail before anyone touches a
 * dropdown. With any filter active the cut is gone and every match shows,
 * however deep it ranks — the live rail's contract, and the whole point of
 * pooling 300 clips.
 */
export const CLIPS_DEFAULT_VISIBLE = 24;

/**
 * One card's filterable metadata. Built where the clips, the streamer
 * languages and the viewer's locale are all known (the server component) and
 * handed to the island, which owns the selection.
 */
export interface ClipFilterItem {
  /** The clip's id — the key the visible set is expressed in. */
  id: string;
  /** Raw category name; '' when the clip has none. */
  category: string;
  /** Normalized language code; '' when unknown. */
  language: string;
  /** Language name in the VIEWER's locale, for the dropdown option. */
  languageLabel: string;
}

export type { CountedFilterOption };

/**
 * Cards passing the current selection. An empty selection matches everything;
 * clips without a category, and clips whose streamer has no broadcaster
 * language, are only reachable that way — which is why neither dimension
 * offers an "unknown" option.
 */
export function matchesClipFilters(
  item: ClipFilterItem,
  category: string,
  language: string,
): boolean {
  return (
    (category === '' || item.category === category) &&
    (language === '' || item.language === language)
  );
}

/**
 * The rail's dropdown options for one dimension. Thin binding over the shared
 * counter (lib/home/filter-options.ts), so the blank-skipping stays in one
 * place for all three homepage sections.
 *
 * **Categories are sorted ALPHABETICALLY here**, unlike the live rail and the
 * lineup, which keep the shared counter's count-desc order. A 500-clip pool
 * offers ~69 categories (prod, 2026-07-31) and a popularity-ordered list that
 * long is unscannable: you cannot look a game up in it, you can only read it
 * top to bottom. The live rail's list is short enough that its most-first
 * order still reads as a ranking — if that ever changes, move this sort into
 * `countFilterOptions` rather than growing a second copy.
 *
 * Languages keep count-desc: ten entries, and "which languages is there much
 * to watch in" is a useful thing for the order itself to say.
 */
export function countClipFilterOptions(
  items: ClipFilterItem[],
  dimension: 'category' | 'language',
): CountedFilterOption[] {
  if (dimension === 'language') {
    return countFilterOptions(
      items,
      (item) => item.language,
      (item) => item.languageLabel,
    );
  }
  return countFilterOptions(
    items,
    (item) => item.category,
    (item) => item.category,
  ).sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Which clips the rail should show.
 *
 * With no selection it is the resting cut: the first `defaultVisible` items,
 * which works because the item order IS the clip order (the round-robin
 * ranking from lib/server/home-clips.ts). With ANY filter active every match
 * shows, uncapped — a Polish clip at rank 240 is exactly the case the
 * pre-2026-07-31 rail, a flat top 12, could not reach.
 */
export function computeVisibleClipIds(
  items: ClipFilterItem[],
  category: string,
  language: string,
  defaultVisible: number,
): Set<string> {
  if (category === '' && language === '') {
    return new Set(items.slice(0, defaultVisible).map((item) => item.id));
  }
  return new Set(
    items
      .filter((item) => matchesClipFilters(item, category, language))
      .map((item) => item.id),
  );
}

/**
 * Turns the rail's clips into the island's filter metadata.
 *
 * Language lives on the STREAMER, not on the clip (Twitch reports no language
 * per clip), so it arrives as a streamer_id → code map from the same query
 * that fetched the clips. `languageName` resolves a code to the viewer's
 * locale (D6: a dropdown of language names is chrome) and is injected rather
 * than imported, so this module needs no Intl setup and the tests stay
 * independent of CLDR data.
 *
 * Order is load-bearing: it mirrors the clips, and computeVisibleClipIds
 * slices its resting cut off the front.
 */
export function buildClipFilterItems(
  clips: FeedClip[],
  languageByStreamer: Record<string, string>,
  languageName: (code: string) => string,
): ClipFilterItem[] {
  return clips.map((clip) => {
    const language = normalizeLanguageCode(languageByStreamer[clip.streamerId]) ?? '';
    return {
      id: clip.id,
      category: clip.category?.trim() ?? '',
      language,
      languageLabel: language ? languageName(language) : '',
    };
  });
}
