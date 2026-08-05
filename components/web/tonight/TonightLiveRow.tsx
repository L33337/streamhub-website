import Image from 'next/image';
import Link from 'next/link';
import { sizedAvatarUrl } from '@/lib/format/image-size';
import { formatCompactNumber } from '@/lib/format/number';
import { localeHref, type UiLang } from '@/lib/i18n-core';
import type { TonightLiveRowSlot } from '@/lib/tonight/logic';
import { AlwaysOnBadge, LiveBadge, PlatformBadge } from '@/components/web/Badges';
import { InitialsAvatar } from '@/components/web/InitialsAvatar';

/**
 * One row of tonight's "already live" opener.
 *
 * Deliberately NOT marked `'use client'` (the `LiveRailCard` precedent): the
 * server renders the head of the pool and the island renders whatever a filter
 * reveals from the tail, so this component has to compile into BOTH graphs.
 *
 * Rows link INWARD to /streamer/[id], unlike the homepage rail which links out
 * to the platform. This page is a listings page — the streamer page is where
 * the rest of the evening's context lives.
 */
export function TonightLiveRow({
  slot,
  locale,
  deferred = false,
  hidden = false,
}: {
  slot: TonightLiveRowSlot;
  locale: UiLang;
  /**
   * Marks a node React owns. The island's imperative `hidden` pass skips these
   * — two owners for one node is how the homepage's two visibility regimes
   * fought each other.
   */
  deferred?: boolean;
  /** Server-side initial visibility, so the first paint is already final. */
  hidden?: boolean;
}) {
  return (
    <li
      data-tonight-live-id={slot.id}
      {...(deferred ? { 'data-tonight-live-deferred': '' } : {})}
      hidden={hidden || undefined}
      className="min-w-0"
    >
      <Link
        href={localeHref(locale, `/streamer/${encodeURIComponent(slot.streamer_id)}`)}
        className="group flex items-center gap-3 rounded-xl border border-border-default bg-background-elevated p-3 transition-colors hover:border-accent-cyan/60 hover:bg-background-highlight"
      >
        {slot.avatar_url ? (
          <Image
            src={sizedAvatarUrl(slot.avatar_url, 40)}
            alt={slot.streamer_name}
            width={40}
            height={40}
            unoptimized
            className="shrink-0 rounded-full border border-border-default"
          />
        ) : (
          <InitialsAvatar name={slot.streamer_name} size={40} className="shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-semibold text-text-primary group-hover:text-accent-cyan">
              {slot.streamer_name}
            </span>
            <LiveBadge language={locale} />
            {slot.is_always_on && <AlwaysOnBadge />}
          </div>
          <p className="mt-0.5 truncate text-xs text-text-secondary" title={slot.title}>
            {slot.title}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {slot.platforms.map((p) => (
              <PlatformBadge key={p} platform={p} size="sm" />
            ))}
            {/* The API guarantees this is non-null only on a fresh (<25 min)
                sample, which is exactly what the pool required to enter. */}
            {slot.viewer_count != null && (
              <span className="text-[10px] font-semibold text-text-muted">
                {formatCompactNumber(slot.viewer_count)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}
