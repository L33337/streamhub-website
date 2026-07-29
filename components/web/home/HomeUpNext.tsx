import type { PublicStreamSlot } from '@/lib/server/partner-api';
import { hubLexFor } from '@/lib/i18n-hub';
import { localeHref, type UiLang } from '@/lib/i18n-core';
import { languageDisplayName } from '@/lib/format/language';
import {
  buildLineupFilterItems,
  formatLineupHour,
  splitLineupSlots,
  LINEUP_TIME_HOURS,
} from '@/lib/home/lineup-filters';
import { FeedSectionHeader } from '@/components/web/feed/FeedSectionHeader';
import { SlotCard } from '@/components/web/SlotCard';
import { HomeUpNextFilters } from './HomeUpNextFilters';
import { SlotBellButton } from './SlotBellButton';

/** Cards fully visible while collapsed; the next row peeks under a fade. */
const VISIBLE_COUNT = 4;

/**
 * "Today's lineup" (homepage rebuild 2026-07-27): the next 24 h of FEATURED
 * streamers' upcoming slots incl. AI predictions as SlotCards (confidence
 * badge + reasoning teaser come with the card). Four cards show fully, the
 * rest sits in a clamped peek zone behind a show-all toggle (CollapsibleBio
 * pattern). Each card carries a reminder bell (implicit hook I2) as an
 * absolute sibling of the card link.
 *
 * Filtering (2026-07-30) mirrors the live rail: three dropdowns — category,
 * broadcast language, start time. It replaced a row of category chips that
 * could only ever offer six categories and no other dimension.
 *
 * **The pool is SPLIT.** Only the first LINEUP_SSR_COUNT slots render as HTML
 * (the island toggles their `hidden` like the rail does); the rest of the 24 h
 * window travels to the client as slot DATA and is rendered on demand — when
 * a filter is active or the list is expanded. Filter metadata covers the WHOLE
 * pool either way, so the dropdown counts are honest from the first paint.
 * Rendering all ~370 predictions up front measured 12,859 DOM elements and
 * 213 ms TBT (2026-07-30) against 6,783 / 72 ms at a 120 cap — the split buys
 * full coverage at neither price.
 *
 * The time dimension is the reason the filter metadata carries raw epoch ms
 * instead of a pre-computed bucket: "from 8 PM" means 8 PM where the VISITOR
 * is, and one prerendered page serves every timezone on earth. So the server
 * ships the timestamps plus the localized hour labels, and the island resolves
 * both the buckets and their counts at mount.
 */
export function HomeUpNext({
  slots,
  locale = 'en',
}: {
  slots: PublicStreamSlot[];
  locale?: UiLang;
}) {
  const L = hubLexFor(locale);

  // Language names follow the VIEWER's locale (chrome, not content — CLAUDE.md
  // D6), so a German visitor picks "Japanisch", not "Japanese".
  const items = buildLineupFilterItems(
    slots,
    (code) => languageDisplayName(code, locale) ?? code.toUpperCase(),
  );

  const bellStrings = {
    title: L.homeFeed.upsell.bellTitle,
    body: L.homeFeed.upsell.bellBody,
    appCta: L.homeFeed.upsell.appCta,
    loginCta: L.homeFeed.upsell.loginCta,
    close: L.homeFeed.upsell.close,
  };
  const favoritesStrings = {
    title: L.homeFeed.upsell.favoritesTitle,
    body: L.homeFeed.upsell.favoritesBody,
    appCta: L.homeFeed.upsell.appCta,
    loginCta: L.homeFeed.upsell.loginCta,
    close: L.homeFeed.upsell.close,
  };

  const renderSlot = (slot: PublicStreamSlot) => (
    <li
      key={slot.id}
      // Filter key for the island; the metadata itself travels as a prop, so
      // the attribute only has to identify the card.
      data-home-id={slot.id}
      className="relative"
    >
      <SlotCard slot={slot} language={locale} />
      <SlotBellButton
        ariaLabel={L.homeFeed.bellAria(slot.streamer_name)}
        strings={bellStrings}
        className="absolute right-3 top-3 z-10"
      />
    </li>
  );

  const listClass = 'grid grid-cols-1 gap-3 md:grid-cols-2';
  // ssr = what becomes HTML, deferred = what the island renders on demand.
  const { ssr: ssrSlots, deferred: deferredSlots } = splitLineupSlots(slots);
  const firstSlots = ssrSlots.slice(0, VISIBLE_COUNT);
  const restSlots = ssrSlots.slice(VISIBLE_COUNT);

  return (
    <section aria-label={L.homeFeed.upNextTitle}>
      <FeedSectionHeader
        title={L.homeFeed.upNextTitle}
        count={slots.length > 0 ? slots.length : undefined}
        actionLabel={L.homeFeed.upNextLink}
        actionHref={localeHref(locale, '/live')}
      />
      {slots.length === 0 ? (
        <div className="rounded-xl border border-border-default bg-background-elevated p-8 text-center text-sm text-text-secondary">
          {L.upcoming.empty}
        </div>
      ) : (
        <HomeUpNextFilters
          items={items}
          strings={{
            categoryLabel: L.homeFeed.liveFilterCategory,
            languageLabel: L.homeFeed.liveFilterLanguage,
            timeLabel: L.homeFeed.lineupFilterTime,
            allCategories: L.homeFeed.liveFilterAllCategories,
            allLanguages: L.homeFeed.liveFilterAllLanguages,
            allTimes: L.homeFeed.lineupFilterAllTimes,
            // Hour labels are locale-formatted server-side ("8:00 PM" / "20:00")
            // and wrapped by the lexicon; the counts are filled in on the
            // client, where the timezone is known.
            timeOptionLabels: Object.fromEntries(
              LINEUP_TIME_HOURS.map((hour) => [
                String(hour),
                L.homeFeed.lineupFilterFrom(formatLineupHour(hour, locale)),
              ]),
            ),
            // 0..pool, so the island can index straight by its match count and
            // every language keeps its own plural agreement.
            matchesByCount: Array.from({ length: slots.length + 1 }, (_, count) =>
              L.homeFeed.lineupFilterMatches(count),
            ),
            reset: L.homeFeed.liveFilterReset,
            empty: L.homeFeed.lineupFilterEmpty,
            optionPattern: L.homeFeed.liveFilterOption('{label}', '{count}'),
            favoritesLabel: L.homeFeed.chipFavorites,
            showAllLabel: L.homeFeed.lineupShowAll(slots.length),
            showLessLabel: L.homeFeed.lineupShowLess,
            // Same `{name}` template trick as the option pattern: a lexicon
            // FUNCTION cannot cross the server/client boundary, and the island
            // needs one aria-label per card it renders itself.
            bellAriaPattern: L.homeFeed.bellAria('{name}'),
          }}
          upsellStrings={favoritesStrings}
          bellStrings={bellStrings}
          deferredSlots={deferredSlots}
          deferredListClassName={listClass}
          locale={locale}
          moreChildren={
            restSlots.length > 0 ? (
              <ul className={listClass}>{restSlots.map(renderSlot)}</ul>
            ) : null
          }
        >
          <ul className={listClass}>{firstSlots.map(renderSlot)}</ul>
        </HomeUpNextFilters>
      )}
    </section>
  );
}
