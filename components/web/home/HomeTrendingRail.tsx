import Link from 'next/link';
import type { PublicGame } from '@/lib/server/partner-api';
import type { TrendingGame } from '@/lib/server/trending';
import { localeHref, type UiLang } from '@/lib/i18n-core';
import { hubLexFor } from '@/lib/i18n-hub';
import { formatCompactNumber } from '@/lib/format/number';
import { GameBoxArt, TrendBadge } from '@/components/web/games/GameCard';
import { FeedSectionHeader } from '@/components/web/feed/FeedSectionHeader';
import { RailScroller } from '@/components/web/feed/RailScroller';

/**
 * "Trending on Twitch" rail, homepage edition (2026-07-27): the tiles carry
 * the /games catalog card's info block — top-streamer name links, 28d hours
 * and the week-over-week trend — while staying a horizontal rail. Trending
 * entries come from the Twitch-wide trending_games cache; stats/links exist
 * only for games in OUR catalog (gamesByName / catalogSlugByName), untracked
 * games degrade to the plain box-art tile. GameCard's link anatomy is kept:
 * stretched title link as the card-wide target, streamer-name links above it
 * on z-10 (nested anchors are invalid HTML).
 */
export function HomeTrendingRail({
  trending,
  gamesByName,
  catalogSlugByName,
  locale = 'en',
}: {
  trending: TrendingGame[];
  /** Category name → catalog row; server-side only (Maps don't serialize). */
  gamesByName: Map<string, PublicGame>;
  catalogSlugByName: Map<string, string>;
  locale?: UiLang;
}) {
  if (trending.length === 0) return null;
  const L = hubLexFor(locale);

  return (
    <section aria-label={L.trending.aria}>
      <FeedSectionHeader title={L.trending.heading} />
      <p className="-mt-2 mb-3 text-xs text-text-muted">{L.trending.subtitle}</p>
      <RailScroller contentClassName="pb-2">
        <ul className="flex gap-3">
          {trending.map((entry) => {
            const game = gamesByName.get(entry.game_name);
            const slug = catalogSlugByName.get(entry.game_name);
            const top = (game?.top_streamers ?? [])
              .filter((t) => t?.id && t?.name)
              .slice(0, 3);
            const hours = game?.hours_28d;

            return (
              <li key={entry.rank} className="w-40 shrink-0">
                <article className="group relative h-full rounded-xl border border-border-default bg-background-elevated p-2 transition-colors hover:border-accent-cyan/60 hover:bg-background-highlight">
                  <GameBoxArt
                    boxArtUrl={entry.box_art_url ?? game?.box_art_url}
                    name={entry.game_name}
                    sizes="160px"
                  />
                  <div className="mt-2 min-w-0">
                    <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent-cyan">
                      {slug ? (
                        // Internal link only when the game exists in OUR
                        // catalog — never emit internal 404 links.
                        <Link
                          href={localeHref(locale, `/game/${slug}`)}
                          prefetch={false}
                          title={entry.game_name}
                          className="block after:absolute after:inset-0 after:z-0 after:content-['']"
                        >
                          <span className="block truncate">{entry.game_name}</span>
                        </Link>
                      ) : (
                        <span className="block truncate" title={entry.game_name}>
                          {entry.game_name}
                        </span>
                      )}
                    </h3>
                    {top.length > 0 && (
                      <p
                        className="relative z-10 mt-0.5 line-clamp-2 text-[11px] leading-tight text-text-secondary"
                        title={top.map((t) => t.name).join(', ')}
                      >
                        {top.map((t, i) => (
                          <span key={t.id}>
                            {i > 0 && ', '}
                            <Link
                              href={localeHref(
                                locale,
                                `/streamer/${encodeURIComponent(t.id)}`,
                              )}
                              prefetch={false}
                              className="hover:text-accent-cyan hover:underline"
                            >
                              {t.name}
                            </Link>
                          </span>
                        ))}
                      </p>
                    )}
                    {(hours != null || game?.trend_delta_percent != null) && (
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-text-muted">
                        {hours != null && (
                          <span>
                            {L.homeFeed.hoursStreamed(
                              formatCompactNumber(Math.round(hours), locale),
                            )}
                          </span>
                        )}
                        {game?.trend_delta_percent != null && (
                          <TrendBadge delta={game.trend_delta_percent} />
                        )}
                      </p>
                    )}
                    <p className="mt-0.5 text-[10px] text-text-muted">
                      {L.trending.rankOnTwitch(entry.rank)}
                    </p>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </RailScroller>
    </section>
  );
}
