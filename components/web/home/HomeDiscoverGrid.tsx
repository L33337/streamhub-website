import Image from 'next/image';
import Link from 'next/link';
import type { PublicStreamer } from '@/lib/server/partner-api';
import { hubLexFor } from '@/lib/i18n-hub';
import { localeHref, type UiLang } from '@/lib/i18n-core';
import { formatCompactNumber } from '@/lib/format/number';
import { FeedSectionHeader } from '@/components/web/feed/FeedSectionHeader';
import { FavoriteButton } from '@/components/web/FavoriteButton';
import { InitialsAvatar } from '@/components/web/InitialsAvatar';
import { LiveBadge } from '@/components/web/Badges';

/**
 * "Popular streamers" discover grid (homepage rebuild 2026-07-27): six cards
 * with follow hearts (implicit hook I1) and a search-and-add hint (I4) that
 * leads into the existing /search → add-streamer flow. The crawlable
 * PopularStreamersFooter pill list stays at the page bottom — this grid is
 * the visual, interactive counterpart.
 */
export function HomeDiscoverGrid({
  streamers,
  liveIds,
  locale = 'en',
}: {
  streamers: PublicStreamer[];
  liveIds: Set<string>;
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
        {cards.map((streamer) => (
          <li key={streamer.id} className="relative">
            <Link
              href={localeHref(locale, `/streamer/${streamer.id}`)}
              prefetch={false}
              className="flex h-full items-center gap-3 rounded-xl border border-border-default bg-background-elevated p-3 pr-14 transition-colors hover:border-accent-cyan/50"
            >
              {streamer.avatar_url ? (
                <Image
                  src={streamer.avatar_url}
                  alt=""
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
                  {liveIds.has(streamer.id) && (
                    <LiveBadge size="sm" language={locale} />
                  )}
                </span>
                {typeof streamer.follower_count === 'number' && (
                  <span className="block truncate text-xs text-text-muted">
                    {L.homeFeed.followers(
                      formatCompactNumber(streamer.follower_count, locale),
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
        ))}
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
