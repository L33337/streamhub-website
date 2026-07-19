import Link from 'next/link';
import type { TrendingGame } from '@/lib/server/trending';
import { GameBoxArt } from './GameCard';

/**
 * "Trending on Twitch" rail — shared by /games and the homepage. Server
 * component (no hooks); `catalogSlugByName` is a Map and must never be passed
 * across a client boundary (Maps don't serialize into client props).
 */
export function TrendingRail({
  trending,
  catalogSlugByName,
}: {
  trending: TrendingGame[];
  catalogSlugByName: Map<string, string>;
}) {
  if (trending.length === 0) return null;

  return (
    <section aria-label="Trending games on Twitch" className="mt-10">
      <h2 className="text-xl font-bold text-white">Trending on Twitch</h2>
      <p className="mt-1 text-xs text-text-muted">
        The biggest games on Twitch right now — not all of them are covered by
        our streamers yet.
      </p>
      <ul className="mt-3 flex gap-3 overflow-x-auto pb-2">
        {trending.map((t) => {
          const slug = catalogSlugByName.get(t.game_name);
          const card = (
            <div className="w-24 sm:w-28">
              <GameBoxArt boxArtUrl={t.box_art_url} name={t.game_name} sizes="112px" />
              <p
                className="mt-1 truncate text-xs font-medium text-text-primary"
                title={t.game_name}
              >
                {t.game_name}
              </p>
              <p className="text-[10px] text-text-muted">#{t.rank} on Twitch</p>
            </div>
          );
          return (
            <li key={t.rank} className="flex-shrink-0">
              {slug ? (
                // Internal link only when the game exists in OUR catalog —
                // never emit internal 404 links.
                <Link
                  href={`/game/${slug}`}
                  prefetch={false}
                  className="block rounded-lg transition-transform hover:scale-[1.02]"
                >
                  {card}
                </Link>
              ) : (
                card
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
