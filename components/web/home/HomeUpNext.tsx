import type { PublicStreamSlot } from '@/lib/server/partner-api';
import { hubLexFor } from '@/lib/i18n-hub';
import { localeHref, type UiLang } from '@/lib/i18n-core';
import { FeedSectionHeader } from '@/components/web/feed/FeedSectionHeader';
import { SlotCard } from '@/components/web/SlotCard';
import { HomeUpNextFilters } from './HomeUpNextFilters';
import { SlotBellButton } from './SlotBellButton';

const MAX_CATEGORY_CHIPS = 6;

/**
 * "Today's lineup" (homepage rebuild 2026-07-27): the next 24 h of upcoming
 * slots incl. AI predictions as SlotCards (confidence badge + reasoning teaser
 * come with the card). Client chips filter by category via hidden-attribute
 * toggling (list stays server-rendered); each card carries a reminder bell
 * (implicit hook I2) as an absolute sibling of the card link.
 */
export function HomeUpNext({
  slots,
  locale = 'en',
}: {
  slots: PublicStreamSlot[];
  locale?: UiLang;
}) {
  const L = hubLexFor(locale);

  // Chip list: categories by slot count, most common first.
  const counts = new Map<string, number>();
  for (const slot of slots) {
    if (!slot.category) continue;
    counts.set(slot.category, (counts.get(slot.category) ?? 0) + 1);
  }
  const categories = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_CATEGORY_CHIPS)
    .map(([category]) => category);

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
          categories={categories}
          allLabel={L.homeFeed.chipAll}
          favoritesLabel={L.homeFeed.chipFavorites}
          upsellStrings={favoritesStrings}
        >
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {slots.map((slot) => (
              <li key={slot.id} data-home-cat={slot.category ?? ''} className="relative">
                <SlotCard slot={slot} language={locale} />
                <SlotBellButton
                  ariaLabel={L.homeFeed.bellAria(slot.streamer_name)}
                  strings={bellStrings}
                  className="absolute right-3 top-3 z-10"
                />
              </li>
            ))}
          </ul>
        </HomeUpNextFilters>
      )}
    </section>
  );
}
