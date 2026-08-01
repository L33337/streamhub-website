import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@/components/web/icons/IconSprite';
import type { PublicStreamSlot, PublicStreamer } from '@/lib/server/partner-api';
import type { WikiFeedStats } from '@/lib/home/streamer-wiki';
import { truncateBio } from '@/lib/home/streamer-wiki';
import { pickDescription } from '@/lib/seo';
import { hubLexFor } from '@/lib/i18n-hub';
import { localeHref, type UiLang } from '@/lib/i18n-core';
import { formatCompactNumber } from '@/lib/format/number';
import { FeedSectionHeader } from '@/components/web/feed/FeedSectionHeader';
import { FavoriteButton } from '@/components/web/FavoriteButton';
import { InitialsAvatar } from '@/components/web/InitialsAvatar';
import { PlatformBadge } from '@/components/web/Badges';
import { NextStreamTime } from '@/components/web/NextStreamTime';

/**
 * "Streamer Wiki" — the page-bottom section (2026-07-31). Replaces the
 * `PopularStreamersFooter` pill list with the app's Discover cards
 * (src/components/DiscoverStreamerCard.tsx): avatar, platform badges, the
 * 28-day top category, a bio snippet, a stats line and a fact chip.
 *
 * Differences from the app card, all deliberate:
 * - The card links INTERNALLY to /streamer/<id>. This is the homepage's
 *   densest internal-link surface; the app's card opens the channel instead.
 * - The app's chip states a personalization reason ("like 3 of your
 *   favorites"). This page is anonymous and statically regenerated, so the
 *   chip carries a fact instead: live now, or the next known start.
 * - The category is always the 28-day top category, never the current live
 *   one. The chip already says whether they are live, so the category stays
 *   the stable encyclopedic fact the "wiki" framing promises.
 */

/** How many cards each breakpoint shows. All 9 stay in the HTML — see below. */
const VISIBLE_SM = 4;
const VISIBLE_MD = 6;
export const WIKI_CARD_COUNT = 9;

/**
 * Cards past a breakpoint's budget are hidden with CSS, not dropped from the
 * markup: crawlers (and the "Browse all streamers" crawl path) still see all
 * nine /streamer/ links at every viewport width.
 */
function visibilityClass(index: number): string {
  if (index >= VISIBLE_MD) return 'hidden xl:block';
  if (index >= VISIBLE_SM) return 'hidden md:block';
  return '';
}

export function HomeStreamerWiki({
  streamers,
  statsById,
  nextSlots,
  liveIds,
  locale = 'en',
}: {
  /** Already picked + ordered by pickWikiStreamers. */
  streamers: PublicStreamer[];
  /** null when the stats fetch failed — cards then render without those lines. */
  statsById: Map<string, WikiFeedStats> | null;
  /** streamer id → earliest upcoming slot (category-agnostic, 7d window). */
  nextSlots: Map<string, PublicStreamSlot>;
  liveIds: Set<string>;
  locale?: UiLang;
}) {
  if (streamers.length === 0) return null;
  const L = hubLexFor(locale);

  return (
    // pt-2, not pt-8: FeedSectionHeader brings its own mt-8, and stacking the
    // two left a ~110px hole between the divider and the heading.
    <section className="mt-20 border-t border-divider pt-2" aria-label={L.streamerWiki.heading}>
      <FeedSectionHeader
        title={L.streamerWiki.heading}
        actionLabel={L.streamerWiki.viewAll}
        actionHref={localeHref(locale, '/streamers')}
      />
      <p className="-mt-2 mb-4 text-sm text-text-muted">{L.streamerWiki.subline}</p>

      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {streamers.slice(0, WIKI_CARD_COUNT).map((streamer, index) => {
          const stats = statsById?.get(streamer.id);
          const statsLine = [
            typeof streamer.follower_count === 'number'
              ? L.streamerWiki.followers(formatCompactNumber(streamer.follower_count, locale))
              : null,
            typeof stats?.streams28d === 'number' && stats.streams28d > 0
              ? L.streamerWiki.streams28d(stats.streams28d)
              : null,
          ]
            .filter(Boolean)
            .join(' · ');
          const description = pickDescription(streamer, locale);
          const isLive = liveIds.has(streamer.id);
          const nextSlot = nextSlots.get(streamer.id);
          // A cancelled slot is the streamer announcing there is NO stream —
          // rendering it as "Next: …" would invert its meaning.
          const showNext = !isLive && nextSlot && nextSlot.slot_kind !== 'cancelled';

          return (
            <li key={streamer.id} className={`relative ${visibilityClass(index)}`}>
              <Link
                href={localeHref(locale, `/streamer/${encodeURIComponent(streamer.id)}`)}
                prefetch={false}
                className="flex h-full flex-col rounded-xl border border-border-default bg-background-elevated p-4 transition-colors hover:border-accent-cyan/60 hover:bg-background-highlight"
              >
                <span className="flex items-center gap-3 pr-10">
                  {streamer.avatar_url ? (
                    <Image
                      src={streamer.avatar_url}
                      alt=""
                      width={48}
                      height={48}
                      unoptimized
                      className="h-12 w-12 shrink-0 rounded-full border border-border-default object-cover"
                    />
                  ) : (
                    <InitialsAvatar name={streamer.name} size={48} className="shrink-0" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold text-text-primary">
                      {streamer.name}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                      {streamer.platforms.map((platform) => (
                        <PlatformBadge key={platform} platform={platform} size="sm" />
                      ))}
                      {stats?.topCategory && (
                        <span className="truncate text-[11px] text-text-muted">
                          {stats.topCategory}
                        </span>
                      )}
                    </span>
                  </span>
                </span>

                {description && (
                  <span
                    lang={description.lang}
                    dir={description.dir}
                    className="mt-2 block text-xs leading-relaxed text-text-secondary"
                  >
                    {truncateBio(description.text)}
                  </span>
                )}

                {/* Either half can be missing on its own — follower_count is
                    null whenever the platform hides it — so the line is
                    assembled from the parts that exist rather than dropped
                    wholesale. */}
                {statsLine && (
                  <span className="mt-2 block truncate text-[11px] text-text-muted">
                    {statsLine}
                  </span>
                )}

                {/* mt-auto pins the chip row to the card floor, so a short bio
                    doesn't leave the chip floating mid-card next to a
                    neighbour's. The pt-3 on the wrapper is the FLOOR of that
                    gap: in the tallest card of a row `mt-auto` resolves to 0
                    and the chip ended up glued to the follower line above it.
                    It has to be padding on a wrapper, not a second margin —
                    margin-top is already spoken for by the auto. */}
                <span className="mt-auto flex pt-3">
                {isLive ? (
                  <span className="inline-flex max-w-full items-center gap-1.5 self-start rounded-full border border-live/40 bg-background-highlight px-2.5 py-1">
                    <span
                      aria-hidden="true"
                      className="relative inline-flex h-2 w-2 shrink-0"
                    >
                      <span className="absolute inline-flex h-full w-full rounded-full bg-live opacity-60 motion-safe:animate-ping" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-live" />
                    </span>
                    <span className="truncate text-[11px] font-semibold text-live">
                      {L.streamerWiki.liveNow}
                    </span>
                  </span>
                ) : showNext ? (
                  <span className="inline-flex max-w-full items-center gap-1.5 self-start rounded-full border border-accent-cyan/40 bg-background-highlight px-2.5 py-1">
                    <Icon
                      name="calendar-clock"
                      size={12}
                      className="shrink-0 text-accent-cyan"
                    />
                    <span className="truncate text-[11px] font-semibold text-accent-cyan">
                      {`${L.streamerWiki.nextPrefix}: `}
                      {/* The time itself stays English in every locale — the
                          client snapshot (nextStreamLabel) is hardcoded en-US.
                          Pre-existing and site-wide (same on the Discover grid
                          above and on /rankings); localizing only the server
                          snapshot would flip the language on hydration. */}
                      <NextStreamTime
                        startTime={nextSlot.start_time}
                        isPredicted={nextSlot.is_predicted}
                      />
                    </span>
                  </span>
                ) : null}
                </span>
              </Link>

              <FavoriteButton
                streamerId={streamer.id}
                streamerName={streamer.name}
                size="sm"
                language={locale}
                className="absolute right-3 top-4 z-10"
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
