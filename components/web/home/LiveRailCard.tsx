import Image from 'next/image';
import Link from 'next/link';
import { localeHref, type UiLang } from '@/lib/i18n-core';
import { formatCompactNumber } from '@/lib/format/number';
import type { LiveRuntimeLex } from '@/lib/i18n/live-runtime';
import {
  formatLiveRuntime,
  liveRuntimeFrom,
  liveWatchUrl,
} from '@/lib/home/live-rail';
import type { LiveCardSlot } from '@/lib/home/slot-payload';
import { slotLexFor } from '@/lib/i18n-slot';
import { FavoriteButton } from '@/components/web/FavoriteButton';
import { InitialsAvatar } from '@/components/web/InitialsAvatar';
import { AlwaysOnBadge, LiveBadge, PlatformBadge } from '@/components/web/Badges';
import { Icon } from '@/components/web/icons/IconSprite';

/**
 * One card of the "Most Watched right now" rail.
 *
 * Deliberately carries NO `'use client'`: the rail renders its first
 * `LIVE_RAIL_SSR_COUNT` cards on the server (crawlable, no JS needed) and its
 * island renders the deferred tail from slot DATA once a filter is active — so
 * this module has to compile into both graphs. Everything it touches is
 * client-safe (pure formatters, `next/image`, and components that are already
 * client or already pure). Same arrangement as `SlotCard`.
 *
 * `runtimeLex` is passed rather than looked up because it holds FUNCTIONS,
 * which cannot cross a server→client boundary. Each side builds its own with
 * `liveRuntimeLexFor(locale)`; neither instance is ever serialized, because the
 * boundary sits at the island, not here.
 */
export function LiveRailCard({
  slot,
  locale,
  nowMs,
  runtimeLex,
  priority = false,
  defaultHidden = false,
  deferred = false,
}: {
  slot: LiveCardSlot;
  locale: UiLang;
  /** Injected so the server render and the island's minute tick agree. */
  nowMs: number;
  runtimeLex: LiveRuntimeLex;
  /** Eager image — only ever the rail's first card (LCP candidate on phones). */
  priority?: boolean;
  /** Ranked past the unfiltered cut: rendered for the filters, not for now. */
  defaultHidden?: boolean;
  /**
   * Marks a card React owns. Deferred cards are re-rendered by the island on
   * every minute tick, so they must be excluded from BOTH imperative passes —
   * the `hidden` toggle and the runtime-text rewrite. The `data-live-deferred`
   * attribute drives the first; omitting `data-live-runtime` drives the second.
   */
  deferred?: boolean;
}) {
  const startMs = Date.parse(slot.start_time);
  const runtime = liveRuntimeFrom(
    startMs,
    slot.duration_minutes,
    slot.is_always_on,
    nowMs,
  );
  const runtimeText = formatLiveRuntime(runtime, runtimeLex);
  const watchUrl = liveWatchUrl(slot);
  const cardClass =
    'flex h-full flex-col overflow-hidden rounded-xl border border-border-default bg-background-elevated transition-colors hover:border-accent-cyan/50';

  return (
    <li
      // Filter key for the client island; the metadata itself is passed as a
      // prop, so these attributes only have to identify the card.
      data-live-id={slot.id}
      data-live-deferred={deferred ? '' : undefined}
      // The island recomputes the same set on mount (computeVisibleLiveIds
      // over an unfiltered selection is exactly this prefix), so there is
      // nothing to flip and no flash of cards.
      hidden={defaultHidden || undefined}
      className="relative w-[248px] shrink-0 sm:w-[268px]"
    >
      <CardShell watchUrl={watchUrl} slotId={slot.id} locale={locale} className={cardClass}>
        <div className="relative aspect-video w-full overflow-hidden bg-background-highlight">
          {slot.thumbnail_url ? (
            <Image
              src={slot.thumbnail_url}
              // Language-neutral by construction: the stream's own title (or
              // the streamer name) rather than an English chrome phrase, which
              // would leak onto all 11 non-English locales.
              alt={slot.title?.trim() || slot.streamer_name}
              fill
              unoptimized
              // Only the first card is eager: it is the one that can become
              // the LCP element on a phone, the rest sit off-screen in the
              // horizontal scroller and must not compete for bandwidth.
              priority={priority}
              sizes="268px"
              className="object-cover"
            />
          ) : (
            <ThumbnailFallback slot={slot} />
          )}
          <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1">
            <LiveBadge language={locale} size="sm" />
            {typeof slot.viewer_count === 'number' && (
              <span className="flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                <Icon name="eye" size={10} />
                {formatCompactNumber(slot.viewer_count, locale)}
              </span>
            )}
          </div>
          <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1">
            {slot.platforms.map((platform) => (
              <PlatformBadge
                key={platform}
                platform={platform}
                size="sm"
                language={locale}
              />
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="relative inline-flex shrink-0 rounded-full border-2 border-live">
              {slot.avatar_url ? (
                <Image
                  src={slot.avatar_url}
                  // Deliberately empty: secondary to the thumbnail above, and
                  // the streamer name follows as visible text — a repeat here
                  // only makes screen readers say it twice.
                  alt=""
                  width={28}
                  height={28}
                  unoptimized
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <InitialsAvatar name={slot.streamer_name} size={28} />
              )}
            </span>
            <p className="min-w-0 flex-1 truncate text-sm font-bold text-white">
              {slot.streamer_name}
            </p>
          </div>

          <p className="truncate text-xs text-text-secondary" title={slot.title}>
            {slot.title}
          </p>

          {/* Wraps rather than squeezing: the overrun label ("Running longer
              than expected") is long in every language and would otherwise
              truncate the category down to two characters. The 45% floor is
              what forces the wrap instead of a shrink. */}
          <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 pt-1">
            <span className="min-w-[45%] flex-1 truncate text-xs text-text-muted">
              {slot.category}
            </span>
            {runtime.kind === 'alwaysOn' ? (
              <AlwaysOnBadge />
            ) : (
              runtimeText && (
                <span
                  // Server-rendered cards are refreshed IMPERATIVELY by the
                  // island every minute (an ISR page is served stale and a tab
                  // ages arbitrarily). Deferred cards get no such attributes:
                  // React re-renders them from `nowMs` on the same tick, and a
                  // second writer on a React-owned text node is exactly the
                  // collision the lineup's `data-home-deferred` marker exists
                  // to prevent.
                  data-live-runtime={deferred ? undefined : ''}
                  data-live-start={
                    deferred || !Number.isFinite(startMs) ? undefined : startMs
                  }
                  data-live-duration={deferred ? undefined : slot.duration_minutes}
                  data-live-alwayson={
                    deferred ? undefined : slot.is_always_on ? '1' : '0'
                  }
                  title={runtimeLex.estimateNote}
                  className="shrink-0 whitespace-nowrap text-xs font-semibold text-text-secondary"
                >
                  {runtimeText}
                </span>
              )
            )}
          </div>
        </div>
      </CardShell>
      <FavoriteButton
        streamerId={slot.streamer_id}
        streamerName={slot.streamer_name}
        size="sm"
        language={locale}
        className="absolute right-2 top-2 z-10"
      />
    </li>
  );
}

/**
 * The card's single click target. Normally the platform's live page in a new
 * tab (site-wide convention for outbound watch links — WatchPill,
 * WatchButtons); the internal slot page only as the fallback for a live slot
 * whose channel id we don't have, where an external link isn't buildable.
 */
function CardShell({
  watchUrl,
  slotId,
  locale,
  className,
  children,
}: {
  watchUrl: string | null;
  slotId: string;
  locale: UiLang;
  className: string;
  children: React.ReactNode;
}) {
  if (!watchUrl) {
    return (
      <Link
        href={localeHref(locale, `/schedule/${encodeURIComponent(slotId)}`)}
        prefetch={false}
        className={className}
      >
        {children}
      </Link>
    );
  }
  return (
    <a href={watchUrl} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      {/* Appended to the link's accessible name, which is otherwise the whole
          card — a screen reader user gets no other warning that the click
          leaves the site. `sr-only` is absolutely positioned, so the card's
          flex layout is untouched. */}
      <span className="sr-only">{slotLexFor(locale).opensInNewTab}</span>
    </a>
  );
}

/**
 * Preview images are missing on freshly created slots and on some YouTube
 * broadcasts. The avatar is a better stand-in than a grey box; without one,
 * the streamer's initial.
 */
function ThumbnailFallback({ slot }: { slot: LiveCardSlot }) {
  if (slot.avatar_url) {
    return (
      <Image
        src={slot.avatar_url}
        // Stands in as the card's primary visual here, so it carries the name.
        alt={slot.streamer_name}
        fill
        unoptimized
        sizes="268px"
        className="object-cover opacity-60 blur-[1px]"
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent-purple/40 to-accent-cyan/30 text-3xl font-bold text-white"
    >
      {(slot.streamer_name?.trim()?.[0] ?? '?').toUpperCase()}
    </div>
  );
}
