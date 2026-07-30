import Image from 'next/image';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import type { PublicStreamSlot } from '@/lib/server/partner-api';
import { hubLexFor } from '@/lib/i18n-hub';
import { localeHref, type UiLang } from '@/lib/i18n-core';
import { formatCompactNumber } from '@/lib/format/number';
import { languageDisplayName } from '@/lib/format/language';
import { liveRuntimeLexFor } from '@/lib/i18n/live-runtime';
import {
  buildLiveFilterItems,
  formatLiveRuntime,
  liveRuntime,
} from '@/lib/home/live-rail';
import { FeedSectionHeader } from '@/components/web/feed/FeedSectionHeader';
import { RailScroller } from '@/components/web/feed/RailScroller';
import { FavoriteButton } from '@/components/web/FavoriteButton';
import { InitialsAvatar } from '@/components/web/InitialsAvatar';
import { AlwaysOnBadge, LiveBadge, PlatformBadge } from '@/components/web/Badges';
import { HomeLiveRailFilters } from './HomeLiveRailFilters';

/**
 * "Most Watched right now" rail (section rebuild 2026-07-28, was "Live now").
 *
 * Wide cards with the platform's live preview image, ranked by current
 * viewers (pickBiggestLiveSlots — one slot per streamer, fresh viewer sample
 * required). Two dropdowns filter the rail by category and broadcast language;
 * the cards themselves stay server-rendered and the client island only toggles
 * `hidden`, so the section is complete for crawlers and without JavaScript.
 *
 * Every card carries a runtime line — how much longer the stream is expected
 * to run, from the slot's own AI duration estimate. Hidden entirely when
 * nothing is live.
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

  return (
    <section aria-label={L.homeFeed.liveTitle}>
      <FeedSectionHeader
        title={L.homeFeed.liveTitle}
        count={totalLive > 0 ? totalLive : slots.length}
        live
        actionLabel={L.home.seeLiveNow}
        actionHref={localeHref(locale, '/live')}
      />
      {/* Only when the rail really is a cut of a bigger set — with everything
          live on screen, "Top 4 by current viewers" states the obvious and
          makes the header's total look like a contradiction. */}
      {totalLive > slots.length && (
        <p className="mb-3 text-xs text-text-muted">
          {L.homeFeed.liveFilterNote(slots.length)}
        </p>
      )}

      <HomeLiveRailFilters
        items={items}
        locale={locale}
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
      >
        <RailScroller contentClassName="pb-2">
          <ul className="flex gap-3">
            {slots.map((slot, index) => (
              <LiveCard
                key={slot.id}
                slot={slot}
                locale={locale}
                now={now}
                runtimeNote={runtimeLex.estimateNote}
                runtimeText={formatLiveRuntime(liveRuntime(slot, now), runtimeLex)}
                priority={index === 0}
              />
            ))}
          </ul>
        </RailScroller>
      </HomeLiveRailFilters>
    </section>
  );
}

function LiveCard({
  slot,
  locale,
  now,
  runtimeText,
  runtimeNote,
  priority,
}: {
  slot: PublicStreamSlot;
  locale: UiLang;
  now: Date;
  runtimeText: string | null;
  runtimeNote: string;
  priority: boolean;
}) {
  const runtime = liveRuntime(slot, now);
  const startMs = Date.parse(slot.start_time);

  return (
    <li
      // Filter key for the client island; the metadata itself is passed as a
      // prop, so these attributes only have to identify the card.
      data-live-id={slot.id}
      className="relative w-[248px] shrink-0 sm:w-[268px]"
    >
      <Link
        href={localeHref(locale, `/schedule/${encodeURIComponent(slot.id)}`)}
        prefetch={false}
        className="flex h-full flex-col overflow-hidden rounded-xl border border-border-default bg-background-elevated transition-colors hover:border-accent-cyan/50"
      >
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
                <Eye size={10} aria-hidden="true" />
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
                  // The client island re-derives this every minute from these
                  // attributes — an ISR page can be served minutes stale, and
                  // an open tab ages arbitrarily.
                  data-live-runtime=""
                  data-live-start={Number.isFinite(startMs) ? startMs : undefined}
                  data-live-duration={slot.duration_minutes}
                  data-live-alwayson={slot.is_always_on ? '1' : '0'}
                  title={runtimeNote}
                  className="shrink-0 whitespace-nowrap text-xs font-semibold text-text-secondary"
                >
                  {runtimeText}
                </span>
              )
            )}
          </div>
        </div>
      </Link>
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
 * Preview images are missing on freshly created slots and on some YouTube
 * broadcasts. The avatar is a better stand-in than a grey box; without one,
 * the streamer's initial.
 */
function ThumbnailFallback({ slot }: { slot: PublicStreamSlot }) {
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
