import Image from 'next/image';
import Link from 'next/link';
import type { PublicRankingEntry, PublicStreamSlot } from '@/lib/server/partner-api';
import { LiveBadge, PlatformBadge } from '@/components/web/Badges';
import { InitialsAvatar } from '@/components/web/InitialsAvatar';
import { NextStreamTime } from '@/components/web/NextStreamTime';
import { languageDisplayName } from '@/lib/format/language';

/**
 * Hero card for the current #1 of a /rankings leaderboard page — rendered
 * between the intro copy and the full table (which still lists rank 1, so
 * deep links and the ItemList JSON-LD stay complete). Purely additive
 * decoration: the caller derives value/label from the spec's primary column.
 */
export function RankingSpotlight({
  entry,
  metricValue,
  metricLabel,
  isLive,
  nextSlot,
  mainGameSlugs,
}: {
  entry: PublicRankingEntry;
  /** Formatted primary metric, e.g. "24.4M". */
  metricValue: string;
  /** Header of the primary metric column, e.g. "Followers". */
  metricLabel: string;
  isLive: boolean;
  nextSlot?: PublicStreamSlot;
  /**
   * category → /rankings/game/ slug (same map as RankingTable). The main-game
   * line links only for categories with a hub page — the route 404s outside
   * the games list — and renders plain text otherwise.
   */
  mainGameSlugs?: Map<string, string>;
}) {
  const { streamer } = entry;
  const topCategory = entry.top_category;
  const mainGameSlug = topCategory ? mainGameSlugs?.get(topCategory.category) : undefined;
  return (
    <section
      aria-label={`Number one: ${streamer.name}`}
      className="mt-6 rounded-xl bg-background-elevated p-4 gradient-border sm:p-5"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <span
          aria-hidden
          className="text-2xl font-black tabular-nums text-[#FFC94D]"
        >
          #1
        </span>
        <Link
          href={`/streamer/${encodeURIComponent(streamer.id)}`}
          className="group flex min-w-0 items-center gap-3"
        >
          {streamer.avatar_url ? (
            <Image
              src={streamer.avatar_url}
              alt=""
              width={64}
              height={64}
              unoptimized
              className="shrink-0 rounded-full border border-border-default"
            />
          ) : (
            <InitialsAvatar name={streamer.name} size={64} className="shrink-0" />
          )}
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-lg font-bold text-text-primary group-hover:text-accent-cyan sm:text-xl">
              {streamer.name}
            </span>
            <span className="mt-1 flex flex-wrap items-center gap-1.5">
              {isLive && <LiveBadge size="sm" />}
              {streamer.platforms.map((p) => (
                <PlatformBadge key={p} platform={p} size="sm" />
              ))}
              {streamer.language && (
                <span className="text-[10px] tracking-wider text-text-muted">
                  {languageDisplayName(streamer.language)}
                </span>
              )}
            </span>
          </span>
        </Link>
        <span className="ml-auto text-right">
          <span className="block text-2xl font-bold tabular-nums text-accent-cyan">
            {metricValue}
          </span>
          <span className="block text-xs uppercase tracking-wider text-text-muted">
            {metricLabel}
          </span>
          {topCategory && (
            <span
              className="mt-1 block text-xs text-text-secondary"
              title={`${topCategory.share_percent}% of their categorized streams`}
            >
              Main game:{' '}
              {mainGameSlug ? (
                <Link
                  href={`/rankings/game/${mainGameSlug}`}
                  className="underline decoration-border-default underline-offset-4 transition-colors hover:text-accent-cyan hover:decoration-accent-cyan/60"
                >
                  {topCategory.category}
                </Link>
              ) : (
                topCategory.category
              )}
            </span>
          )}
          {!streamer.is_always_on && nextSlot && (
            <span className="mt-1 block text-xs text-text-secondary">
              Next stream:{' '}
              <NextStreamTime
                startTime={nextSlot.start_time}
                isPredicted={nextSlot.is_predicted}
              />
              {nextSlot.slot_kind !== 'cancelled' && nextSlot.category && (
                <span className="text-text-muted"> · {nextSlot.category}</span>
              )}
            </span>
          )}
        </span>
      </div>
    </section>
  );
}
