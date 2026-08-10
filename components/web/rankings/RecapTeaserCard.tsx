// Compact teaser card for one recap edition (2026-08-09): the pair of these
// replaces the static intro paragraph atop /rankings, and the archive page
// lists them full-width. Server component — all strings arrive resolved; the
// only client part is the visual's image-fallback island.
//
// Sized up on 2026-08-10 (the stats strip below the cards was removed, which
// reclaimed the vertical room): ~8rem visual on phones, ~12rem from `sm`, a
// three-line teaser clamp. Still clamped — the cards must never push the first
// leaderboard below the fold (the whole point of the hub), and on a 320px
// phone they stack with a narrower visual.

import Link from 'next/link';
import type { PublicRecapListItem } from '@/lib/server/partner-api';
import { RecapCardVisual } from './RecapCardVisual';

export function RecapTeaserCard({
  item,
  kicker,
  periodLabel,
  readMore,
  href,
}: {
  item: PublicRecapListItem;
  kicker: string;
  periodLabel: string;
  readMore: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex gap-3 rounded-xl border border-border-default bg-background-elevated p-3 transition-colors hover:border-accent-cyan/60 sm:gap-5 sm:p-5"
    >
      <div className="w-32 shrink-0 self-center sm:w-48">
        <RecapCardVisual
          thumbnailUrl={item.hero.clip?.thumbnail_url ?? null}
          thumbnailAlt={item.hero.clip?.title ?? ''}
          streamers={item.hero.streamers.map((s) => ({
            id: s.id,
            name: s.name,
            avatarUrl: s.avatar_url,
          }))}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold uppercase tracking-wider text-accent-cyan">
          {kicker}
          <span className="font-normal normal-case tracking-normal text-text-muted">
            {' '}
            · {periodLabel}
          </span>
        </p>
        <h3 className="mt-1 line-clamp-2 text-base font-bold text-text-primary group-hover:text-accent-cyan sm:text-lg">
          {item.title}
        </h3>
        <p className="mt-1.5 line-clamp-3 text-xs text-text-secondary sm:text-sm">
          {item.teaser}
        </p>
        <p className="mt-2 text-xs font-medium text-accent-cyan sm:text-sm">{readMore} →</p>
      </div>
    </Link>
  );
}
