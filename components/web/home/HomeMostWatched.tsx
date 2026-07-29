import Link from 'next/link';
import Image from 'next/image';
import type { PublicGame, PublicRankingEntry } from '@/lib/server/partner-api';
import { hubLexFor } from '@/lib/i18n-hub';
import { localeHref, type UiLang } from '@/lib/i18n-core';
import { formatCompactNumber } from '@/lib/format/number';
import { GameBoxArt } from '@/components/web/games/GameCard';
import { FeedSectionHeader } from '@/components/web/feed/FeedSectionHeader';
import { InitialsAvatar } from '@/components/web/InitialsAvatar';

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

  return (
    <section aria-label={L.homeFeed.mostWatchedTitle}>
      <FeedSectionHeader
        title={L.homeFeed.mostWatchedTitle}
        actionLabel={L.rankings.seeFullRanking}
        actionHref={localeHref(locale, '/rankings/most-watched')}
      />
      <div className="grid gap-6 md:grid-cols-2">
        {streamers.length > 0 && (
          <div>
            <h3 className={colTitleClass}>{L.homeFeed.topStreamersCol}</h3>
            <ul className="grid gap-1.5">
              {streamers.map((entry, index) => (
                <li key={entry.streamer.id}>
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
                    {entry.streamer.avatar_url ? (
                      <Image
                        src={entry.streamer.avatar_url}
                        alt={entry.streamer.name}
                        width={28}
                        height={28}
                        unoptimized
                        className="h-7 w-7 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <InitialsAvatar name={entry.streamer.name} size={28} />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">
                      {entry.streamer.name}
                    </span>
                    {typeof entry.values.avg_view_count === 'number' && (
                      <span className="shrink-0 font-mono text-xs text-text-secondary">
                        {L.homeFeed.medianViewers(
                          formatCompactNumber(entry.values.avg_view_count, locale),
                        )}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        {games.length > 0 && (
          <div>
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
                    <span className="w-6 shrink-0 overflow-hidden rounded">
                      <GameBoxArt
                        boxArtUrl={game.box_art_url}
                        name={game.category}
                        sizes="24px"
                      />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">
                      {game.category}
                    </span>
                    {typeof game.hours_28d === 'number' && (
                      <span className="shrink-0 font-mono text-xs text-text-secondary">
                        {L.homeFeed.hoursStreamed(
                          formatCompactNumber(Math.round(game.hours_28d), locale),
                        )}
                      </span>
                    )}
                  </>
                );
                return (
                  <li key={game.category}>
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
