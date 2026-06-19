import Link from 'next/link';
import {
  getPartnerApi,
  PartnerApiError,
  type PublicStreamSlot,
} from '@/lib/server/partner-api';
import { gameSlug } from '@/lib/game-slug';

/**
 * "Games" section on a streamer page: links the games this streamer plays to
 * their /game/[slug] hub. This is the reciprocal half of the game↔streamer
 * internal-linking graph — it's what makes the hub pages genuine site
 * navigation (and lifts both pages' crawlability) rather than search-only
 * landing pages.
 *
 * Only categories that actually have a hub page (>= 3 streamers, per /v1/games)
 * are linked, so we never emit a link to a 404. Renders nothing otherwise.
 * Async server component; degrades to null on any Partner API error.
 */
export async function StreamerGames({ slots }: { slots: PublicStreamSlot[] }) {
  const counts = new Map<string, number>();
  for (const s of slots) {
    const c = s.category?.trim();
    if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  if (counts.size === 0) return null;

  let valid: Set<string>;
  try {
    const games = await getPartnerApi().listGames({ limit: 500, revalidate: 3600 });
    valid = new Set(games.data.map((g) => g.category));
  } catch (err) {
    if (!(err instanceof PartnerApiError)) throw err;
    return null;
  }

  const top = [...counts.entries()]
    .filter(([cat]) => valid.has(cat))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([cat]) => cat);
  if (top.length === 0) return null;

  return (
    <section className="mt-12 border-t border-divider pt-8" aria-labelledby="games-heading">
      <h2
        id="games-heading"
        className="text-sm font-bold uppercase tracking-widest text-text-muted"
      >
        Games
      </h2>
      <nav aria-label="Games this streamer plays" className="mt-4 flex flex-wrap gap-2">
        {top.map((cat) => (
          <Link
            key={cat}
            href={`/game/${gameSlug(cat)}`}
            className="inline-flex items-center rounded-full border border-border-default bg-background-elevated px-3 py-1.5 text-sm text-text-secondary transition-colors hover:border-accent-cyan/60 hover:text-text-primary"
          >
            {cat}
          </Link>
        ))}
      </nav>
    </section>
  );
}
