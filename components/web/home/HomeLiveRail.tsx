import Image from 'next/image';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import type { PublicStreamSlot } from '@/lib/server/partner-api';
import { hubLexFor } from '@/lib/i18n-hub';
import { localeHref, type UiLang } from '@/lib/i18n-core';
import { formatCompactNumber } from '@/lib/format/number';
import { FeedSectionHeader } from '@/components/web/feed/FeedSectionHeader';
import { RailScroller } from '@/components/web/feed/RailScroller';
import { FavoriteButton } from '@/components/web/FavoriteButton';
import { InitialsAvatar } from '@/components/web/InitialsAvatar';
import { PlatformBadge } from '@/components/web/Badges';

/**
 * "Live now" avatar rail (homepage rebuild 2026-07-27): top live slots by
 * viewer count, one per streamer (pickLiveRailSlots). Each card links to the
 * slot page; the heart is a FavoriteButton (implicit conversion hook I1 —
 * signed-out taps route to sign-in/app). Hidden entirely when nothing is live.
 */
export function HomeLiveRail({
  slots,
  totalLive,
  locale = 'en',
}: {
  slots: PublicStreamSlot[];
  /** Full live count for the header chip (the rail itself is capped). */
  totalLive: number;
  locale?: UiLang;
}) {
  if (slots.length === 0) return null;
  const L = hubLexFor(locale);

  return (
    <section aria-label={L.homeFeed.liveTitle}>
      <FeedSectionHeader
        title={L.homeFeed.liveTitle}
        count={totalLive > 0 ? totalLive : slots.length}
        live
        actionLabel={L.home.seeLiveNow}
        actionHref={localeHref(locale, '/live')}
      />
      <RailScroller contentClassName="pb-2">
        <ul className="flex gap-3">
          {slots.map((slot) => (
            <li key={slot.id} className="relative w-[180px] shrink-0">
              <Link
                href={localeHref(locale, `/schedule/${slot.id}`)}
                prefetch={false}
                className="block h-full rounded-xl border border-border-default bg-background-elevated p-3 transition-colors hover:border-accent-cyan/50"
              >
                <span className="relative inline-flex rounded-full border-2 border-live shadow-[0_0_10px_rgba(0,255,136,0.4)]">
                  {slot.avatar_url ? (
                    <Image
                      src={slot.avatar_url}
                      alt=""
                      width={40}
                      height={40}
                      unoptimized
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <InitialsAvatar name={slot.streamer_name} size={40} />
                  )}
                </span>
                <p className="mt-2 truncate text-sm font-bold text-white">
                  {slot.streamer_name}
                </p>
                {slot.category && (
                  <p className="truncate text-xs text-text-secondary">{slot.category}</p>
                )}
                <p className="mt-2 flex items-center gap-2 text-xs text-text-muted">
                  {slot.platforms.map((platform) => (
                    <PlatformBadge
                      key={platform}
                      platform={platform}
                      size="sm"
                      language={locale}
                    />
                  ))}
                  {typeof slot.viewer_count === 'number' && (
                    <span className="ml-auto flex items-center gap-1 font-semibold text-live">
                      <Eye size={12} aria-hidden="true" />
                      {formatCompactNumber(slot.viewer_count, locale)}
                    </span>
                  )}
                </p>
              </Link>
              <FavoriteButton
                streamerId={slot.streamer_id}
                streamerName={slot.streamer_name}
                size="sm"
                language={locale}
                className="absolute right-2 top-2 z-10"
              />
            </li>
          ))}
        </ul>
      </RailScroller>
    </section>
  );
}
