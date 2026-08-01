import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@/components/web/icons/IconSprite';
import type { PublicStreamSlot } from '@/lib/server/partner-api';
import type { FeaturedStreamer } from '@/lib/server/home-featured';
import { hubLexFor } from '@/lib/i18n-hub';
import { localeHref, type UiLang } from '@/lib/i18n-core';
import { formatCompactNumber } from '@/lib/format/number';
import { FeedSectionHeader } from '@/components/web/feed/FeedSectionHeader';
import { FavoriteButton } from '@/components/web/FavoriteButton';
import { InitialsAvatar } from '@/components/web/InitialsAvatar';
import { LiveBadge } from '@/components/web/Badges';
import { NextStreamTime } from '@/components/web/NextStreamTime';
import { sizedAvatarUrl } from '@/lib/format/image-size';

/**
 * "Popular streamers" discover grid (homepage rebuild 2026-07-27; feedback
 * round: random FEATURED streamers instead of the static popular top — the
 * six cards rotate with every ISR regeneration). Each card carries the
 * streamer's next stream (time via NextStreamTime: UTC on the server,
 * browser-local after hydration, "~" = AI-predicted) and its category.
 * Follow hearts are implicit hook I1; the search-and-add hint (I4) leads
 * into the existing /search → add-streamer flow. The crawlable
 * PopularStreamersFooter pill list stays at the page bottom.
 */
export function HomeDiscoverGrid({
  streamers,
  nextSlots,
  liveIds,
  liveCategories,
  locale = 'en',
}: {
  streamers: FeaturedStreamer[];
  /** streamer id → earliest upcoming slot (category-agnostic, 7d window). */
  nextSlots: Map<string, PublicStreamSlot>;
  liveIds: Set<string>;
  /** streamer id → what a currently-live streamer is playing right now. */
  liveCategories?: Map<string, string | null>;
  locale?: UiLang;
}) {
  const cards = streamers.slice(0, 6);
  if (cards.length === 0) return null;
  const L = hubLexFor(locale);

  return (
    <section aria-label={L.popular.heading}>
      <FeedSectionHeader
        title={L.popular.heading}
        actionLabel={L.popular.viewAll}
        actionHref={localeHref(locale, '/streamers')}
      />
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((streamer) => {
          const nextSlot = nextSlots.get(streamer.id);
          const isLive = liveIds.has(streamer.id);
          // A card with a LIVE badge used to carry a FUTURE prediction under it
          // ("LIVE … ~ Sat 11:04 PM · Just Chatting"), which reads as a
          // contradiction. While they are live the useful fact is what they are
          // playing right now; the prediction line returns once they are off.
          const liveCategory = isLive ? (liveCategories?.get(streamer.id) ?? null) : null;
          const showNext = !isLive && nextSlot && nextSlot.slot_kind !== 'cancelled';
          return (
            <li key={streamer.id} className="relative">
              <Link
                href={localeHref(locale, `/streamer/${streamer.id}`)}
                prefetch={false}
                className="flex h-full items-center gap-3 rounded-xl border border-border-default bg-background-elevated p-3 pr-14 transition-colors hover:border-accent-cyan/50"
              >
                {streamer.avatar_url ? (
                  <Image
                    src={sizedAvatarUrl(streamer.avatar_url, 40)}
                    alt={streamer.name}
                    width={40}
                    height={40}
                    unoptimized
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <InitialsAvatar name={streamer.name} size={40} />
                )}
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-bold text-white">
                      {streamer.name}
                    </span>
                    {isLive && <LiveBadge size="sm" language={locale} />}
                  </span>
                  {typeof streamer.follower_count === 'number' && (
                    <span className="block truncate text-xs text-text-muted">
                      {L.homeFeed.followers(
                        formatCompactNumber(streamer.follower_count, locale),
                      )}
                    </span>
                  )}
                  {liveCategory && (
                    <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-text-secondary">
                      <span
                        aria-hidden="true"
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-live"
                      />
                      <span className="truncate">{liveCategory}</span>
                    </span>
                  )}
                  {showNext && (
                    <span className="mt-0.5 flex min-w-0 items-center gap-1.5 truncate text-xs text-text-secondary">
                      <Icon
                        name="calendar-clock"
                        size={11}
                        className="shrink-0 text-accent-cyan"
                      />
                      <NextStreamTime
                        startTime={nextSlot.start_time}
                        isPredicted={nextSlot.is_predicted}
                      />
                      {nextSlot.category && (
                        <span className="truncate text-text-muted">
                          · {nextSlot.category}
                        </span>
                      )}
                    </span>
                  )}
                </span>
              </Link>
              <FavoriteButton
                streamerId={streamer.id}
                streamerName={streamer.name}
                size="sm"
                language={locale}
                className="absolute right-3 top-1/2 z-10 -translate-y-1/2"
              />
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-sm">
        <Link
          href={localeHref(locale, '/search')}
          className="text-accent-cyan hover:text-text-primary"
        >
          {L.homeFeed.missingStreamer}
        </Link>
      </p>
    </section>
  );
}
