import Link from 'next/link';
import Image from 'next/image';
import type { PublicGame, PublicRankingEntry } from '@/lib/server/partner-api';
import { hubLexFor } from '@/lib/i18n-hub';
import { localeHref, type UiLang } from '@/lib/i18n-core';
import { formatCompactNumber } from '@/lib/format/number';
import { GameBoxArt } from '@/components/web/games/GameCard';
import { FeedSectionHeader } from '@/components/web/feed/FeedSectionHeader';
import { InitialsAvatar } from '@/components/web/InitialsAvatar';
import { sizedAvatarUrl } from '@/lib/format/image-size';

/**
 * "Most watched" duo (homepage rebuild 2026-07-27): top-5 streamers by median
 * live viewers (most-watched ranking) next to top-5 categories by 28d streamed
 * hours. The value lines carry their windows honestly (median / 28 days) —
 * the two lists use different metrics on purpose.
 */
export function HomeMostWatched({
  streamerEntries,
  categories,
  gameHubSlugByName,
  locale = 'en',
}: {
  streamerEntries: PublicRankingEntry[];
  categories: PublicGame[];
  /** Category name → /game/<slug> for internal links (404 avoidance). */
  gameHubSlugByName: Map<string, string>;
  locale?: UiLang;
}) {
  const streamers = streamerEntries.slice(0, 5);
  const games = categories.slice(0, 5);
  if (streamers.length === 0 && games.length === 0) return null;
  const L = hubLexFor(locale);

  const colTitleClass =
    'mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted';
  const rowClass =
    'flex items-center gap-3 rounded-lg border border-border-default bg-background-elevated px-3 py-2 transition-colors hover:border-accent-cyan/50';
  // The two columns sit side by side from `md`, so their rows must be the same
  // height — and nothing in the layout enforces that, because the row height is
  // driven by whichever ICON is taller. Box art is a 285/380 portrait: 24px wide
  // renders 32px tall, while the avatar is a 28px circle, so the streamer rows
  // came out 4px shorter than the category rows next to them (measured 46 vs 50
  // in prod). Both icons therefore live in a slot of one fixed height, and the
  // avatar (still 28px, incl. the InitialsAvatar fallback) is centred in it —
  // only the SLOT grows. Below `sm` the name/value stack makes the text taller
  // than either icon, so both columns are text-driven and equal there anyway.
  const iconSlotClass = 'flex h-8 shrink-0 items-center justify-center';
  // Name and value share one line only where the value fits beside it. On a
  // phone they stack: several locales spell the metric out ("214,9 тыс.
  // зрителей (медиана)" is 209px) — wider than the whole row on a 320px
  // screen, which used to push the DOCUMENT sideways because the value was
  // shrink-0. Stacked, each line owns the full column and truncates at worst.
  const valueStackClass =
    'flex min-w-0 flex-1 flex-col sm:flex-row sm:items-baseline sm:justify-between sm:gap-2';
  const valueClass =
    'truncate font-mono text-[11px] text-text-secondary sm:shrink-0 sm:text-xs';

  return (
    <section aria-label={L.homeFeed.mostWatchedTitle}>
      <FeedSectionHeader
        title={L.homeFeed.mostWatchedTitle}
        actionLabel={L.rankings.seeFullRanking}
        actionHref={localeHref(locale, '/rankings/most-watched')}
      />
      {/* min-w-0 on the columns AND on every <li>, not decoration: a grid item
          defaults to min-width:auto, so an auto track can never size below its
          content's minimum. Both levels are grids here, so both had to be
          released — otherwise one long localized value line ("214,9 mil
          espectadores (mediana)") widens the whole DOCUMENT on a 320px phone.
          Release only the outer one and the row overflows its column instead;
          the page still scrolls sideways. */}
      <div className="grid gap-6 md:grid-cols-2">
        {streamers.length > 0 && (
          <div className="min-w-0">
            <h3 className={colTitleClass}>{L.homeFeed.topStreamersCol}</h3>
            <ul className="grid gap-1.5">
              {streamers.map((entry, index) => (
                <li key={entry.streamer.id} className="min-w-0">
                  <Link
                    href={localeHref(locale, `/streamer/${entry.streamer.id}`)}
                    prefetch={false}
                    className={rowClass}
                  >
                    <span
                      className={`w-5 shrink-0 font-mono text-xs ${index === 0 ? 'text-accent-cyan' : 'text-text-muted'}`}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className={`${iconSlotClass} w-7`}>
                      {entry.streamer.avatar_url ? (
                        <Image
                          src={sizedAvatarUrl(entry.streamer.avatar_url, 28)}
                          alt={entry.streamer.name}
                          width={28}
                          height={28}
                          unoptimized
                          className="h-7 w-7 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <InitialsAvatar name={entry.streamer.name} size={28} />
                      )}
                    </span>
                    <span className={valueStackClass}>
                      <span className="truncate text-sm font-bold text-white">
                        {entry.streamer.name}
                      </span>
                      {typeof entry.values.avg_view_count === 'number' && (
                        <span className={valueClass}>
                          {L.homeFeed.medianViewers(
                            formatCompactNumber(entry.values.avg_view_count, locale),
                          )}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        {games.length > 0 && (
          <div className="min-w-0">
            <h3 className={colTitleClass}>{L.homeFeed.topCategoriesCol}</h3>
            <ul className="grid gap-1.5">
              {games.map((game, index) => {
                const slug = gameHubSlugByName.get(game.category);
                const row = (
                  <>
                    <span
                      className={`w-5 shrink-0 font-mono text-xs ${index === 0 ? 'text-accent-cyan' : 'text-text-muted'}`}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className={`${iconSlotClass} w-6 overflow-hidden rounded`}>
                      <GameBoxArt
                        boxArtUrl={game.box_art_url}
                        name={game.category}
                        sizes="24px"
                      />
                    </span>
                    <span className={valueStackClass}>
                      <span className="truncate text-sm font-bold text-white">
                        {game.category}
                      </span>
                      {typeof game.hours_28d === 'number' && (
                        <span className={valueClass}>
                          {L.homeFeed.hoursStreamed(
                            formatCompactNumber(Math.round(game.hours_28d), locale),
                          )}
                        </span>
                      )}
                    </span>
                  </>
                );
                return (
                  <li key={game.category} className="min-w-0">
                    {slug ? (
                      <Link
                        href={localeHref(locale, `/game/${slug}`)}
                        prefetch={false}
                        className={rowClass}
                      >
                        {row}
                      </Link>
                    ) : (
                      <div className={rowClass}>{row}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
