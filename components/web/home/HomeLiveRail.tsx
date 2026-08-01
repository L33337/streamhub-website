import type { PublicStreamSlot } from '@/lib/server/partner-api';
import { hubLexFor } from '@/lib/i18n-hub';
import { localeHref, type UiLang } from '@/lib/i18n-core';
import { languageDisplayName } from '@/lib/format/language';
import { liveRuntimeLexFor } from '@/lib/i18n/live-runtime';
import {
  buildLiveFilterItems,
  splitLiveSlots,
  LIVE_RAIL_DEFAULT_VISIBLE,
} from '@/lib/home/live-rail';
import { toLiveCardSlot } from '@/lib/home/slot-payload';
import { FeedSectionHeader } from '@/components/web/feed/FeedSectionHeader';
import { HomeLiveRailFilters } from './HomeLiveRailFilters';
import { LiveRailCard } from './LiveRailCard';

/**
 * "Most Watched right now" rail (section rebuild 2026-07-28, was "Live now").
 *
 * Wide cards with the platform's live preview image, ranked by current
 * viewers (pickBiggestLiveSlots — one slot per streamer, fresh viewer sample
 * required). Two dropdowns filter by category and broadcast language.
 *
 * `slots` is the WHOLE live sweep, and every one of them is reachable through
 * the filters — but the pool is SPLIT (2026-08-01): only the first
 * `LIVE_RAIL_SSR_COUNT` cards are server-rendered HTML, which is exactly the
 * unfiltered cut. The rest travel to the island as compact slot DATA
 * (`toLiveCardSlot`) and are rendered there once a filter is active, which is
 * the only state that can reveal them. Filter metadata covers the whole sweep
 * either way, so the dropdown counts stay honest from the first paint. Without
 * JavaScript the served markup IS the top cut — the honest degradation for a
 * filter nobody can operate, and unchanged from before the split.
 *
 * Every card carries a runtime line — how much longer the stream is expected
 * to run, from the slot's own AI duration estimate. Hidden entirely when
 * nothing is live.
 *
 * Cards link OUT (liveWatchUrl), unlike every other slot card on the site:
 * these streams are running right now, so the click belongs to the stream, not
 * to our slot page.
 */
export function HomeLiveRail({
  slots,
  totalLive,
  locale = 'en',
  now = new Date(),
}: {
  slots: PublicStreamSlot[];
  /** Full live count for the header chip (the rail itself is capped). */
  totalLive: number;
  locale?: UiLang;
  /** Injected so the rendered runtime lines are testable. */
  now?: Date;
}) {
  if (slots.length === 0) return null;
  const L = hubLexFor(locale);
  const runtimeLex = liveRuntimeLexFor(locale);

  // Language names follow the VIEWER's locale (chrome, not content — CLAUDE.md
  // D6), so a German visitor picks "Japanisch", not "Japanese".
  const items = buildLiveFilterItems(
    slots,
    (code) => languageDisplayName(code, locale) ?? code.toUpperCase(),
  );

  // ssr = what becomes HTML, deferred = what the island renders on demand.
  const { ssr: ssrSlots, deferred: deferredSlots } = splitLiveSlots(slots);
  const nowMs = now.getTime();

  // Handed over as an ARRAY of <li>, not as a finished list: the island puts
  // them in the SAME <ul> as the cards it renders itself, so the whole rail is
  // one horizontal flex row and the ranking reads continuously across both
  // regimes.
  const ssrCards = ssrSlots.map((slot, index) => (
    <LiveRailCard
      key={slot.id}
      slot={toLiveCardSlot(slot)}
      locale={locale}
      nowMs={nowMs}
      runtimeLex={runtimeLex}
      priority={index === 0}
      // The head IS the unfiltered cut, so nothing in it starts hidden. Kept
      // explicit because the two constants are allowed to diverge upwards.
      defaultHidden={index >= LIVE_RAIL_DEFAULT_VISIBLE}
    />
  ));

  return (
    <section aria-label={L.homeFeed.liveTitle}>
      <FeedSectionHeader
        title={L.homeFeed.liveTitle}
        count={totalLive > 0 ? totalLive : slots.length}
        live
        actionLabel={L.home.seeLiveNow}
        actionHref={localeHref(locale, '/live')}
      />
      {/* The scope note ("Top 30 by current viewers — filters search all N")
          was dropped for compactness: the dropdown options carry their own
          pool-wide counts and the header links to /live, so the section still
          says what it covers without a third line of chrome above the cards.
          `liveFilterNote` stays translated for re-use. */}

      <HomeLiveRailFilters
        items={items}
        locale={locale}
        ssrCards={ssrCards}
        deferredSlots={deferredSlots.map(toLiveCardSlot)}
        strings={{
          categoryLabel: L.homeFeed.liveFilterCategory,
          languageLabel: L.homeFeed.liveFilterLanguage,
          allCategories: L.homeFeed.liveFilterAllCategories,
          allLanguages: L.homeFeed.liveFilterAllLanguages,
          // 0..pool, so the island can index straight by its match count.
          matchesByCount: Array.from({ length: slots.length + 1 }, (_, count) =>
            L.homeFeed.liveFilterMatches(count),
          ),
          reset: L.homeFeed.liveFilterReset,
          empty: L.homeFeed.liveFilterEmpty,
          optionPattern: L.homeFeed.liveFilterOption('{label}', '{count}'),
        }}
      />
    </section>
  );
}
