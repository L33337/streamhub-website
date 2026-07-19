import Image from 'next/image';
import Link from 'next/link';
import type { PublicRankingEntry, PublicStreamSlot } from '@/lib/server/partner-api';
import { rankTrend, type RankingColumn } from '@/lib/rankings';
import { LiveBadge, PlatformBadge } from '@/components/web/Badges';
import { InitialsAvatar } from '@/components/web/InitialsAvatar';
import { NextStreamTime } from '@/components/web/NextStreamTime';
import { languageDisplayName } from '@/lib/format/language';

interface Props {
  /** sr-only table caption, e.g. "Streamers ranked by follower count". */
  caption: string;
  /** Metric value columns (rendered right-aligned after the streamer cell). */
  columns: RankingColumn[];
  entries: PublicRankingEntry[];
  /**
   * When set, each row gets id="{prefix}-{rank}" so positions are deep-linkable
   * (e.g. /rankings/most-followed#rank-42). Leave unset on pages that render
   * several tables (the hub) — the ids would collide.
   */
  rowAnchorPrefix?: string;
  /**
   * Ids of streamers that are live right now (getLiveStreamerIdSet). When
   * provided, live rows get a LIVE badge next to the name. Callers must run
   * on a page whose revalidate keeps the set reasonably fresh (≤300 s — the
   * /streamers convention); omit on pages that only revalidate hourly.
   */
  liveIds?: Set<string>;
  /**
   * Earliest upcoming slot per streamer id (lib/server/next-streams.ts). When
   * provided, a "Next stream" column is appended: announced or predicted (~)
   * start in the viewer's local time, "24/7" for always-on channels, "—" when
   * nothing is scheduled within the fetch window.
   */
  nextSlots?: Map<string, PublicStreamSlot>;
  /**
   * category → /rankings/game/ slug for every game with a hub page. When
   * provided, a "Main game" column is appended from each entry's
   * `top_category`; categories without a hub page render as plain text (the
   * game-ranking route 404s for categories outside the games list).
   */
  mainGameSlugs?: Map<string, string>;
}

// Medal accents for ranks 1-3 (gold/silver/bronze, tuned for the dark theme).
const MEDAL_CLASSES: Record<number, string> = {
  1: 'text-[#FFC94D]',
  2: 'text-[#C7CEDD]',
  3: 'text-[#C9885A]',
};

/**
 * ▲2 / ▼1 / "new" next to the rank — week-over-week movement from the API's
 * `values.previous_rank`. Renders nothing while the backend's snapshot
 * history warms up or when the rank is unchanged.
 */
function TrendIndicator({ entry }: { entry: PublicRankingEntry }) {
  const trend = rankTrend(entry);
  if (trend.kind === 'none') return null;
  if (trend.kind === 'new') {
    return (
      <span
        className="text-[9px] font-bold uppercase tracking-wider text-accent-cyan"
        title="Not in this ranking a week ago"
      >
        new
      </span>
    );
  }
  const up = trend.kind === 'up';
  return (
    <span
      className={`text-[10px] font-semibold tabular-nums ${up ? 'text-live' : 'text-accent-pink'}`}
      title={`${up ? 'Up' : 'Down'} ${trend.delta} since last week`}
    >
      {up ? '▲' : '▼'}
      {trend.delta}
    </span>
  );
}

/** Value of the "Main game" column for one row (see Props.mainGameSlugs). */
function MainGameCell({
  topCategory,
  slugs,
}: {
  topCategory: PublicRankingEntry['top_category'];
  slugs: Map<string, string>;
}) {
  if (!topCategory) return <>—</>;
  const title = `${topCategory.share_percent}% of their categorized streams`;
  const slug = slugs.get(topCategory.category);
  if (!slug) {
    return <span title={title}>{topCategory.category}</span>;
  }
  return (
    <Link
      href={`/rankings/game/${slug}`}
      title={title}
      className="text-text-secondary underline decoration-border-default underline-offset-4 transition-colors hover:text-accent-cyan hover:decoration-accent-cyan/60"
    >
      {topCategory.category}
    </Link>
  );
}

/** Value of the "Next stream" column for one row (see Props.nextSlots). */
function NextStreamCell({
  streamer,
  slot,
}: {
  streamer: PublicRankingEntry['streamer'];
  slot: PublicStreamSlot | undefined;
}) {
  if (streamer.is_always_on) {
    return <span title="Always-on channel — live around the clock">24/7</span>;
  }
  if (!slot) return <>—</>;
  return <NextStreamTime startTime={slot.start_time} isPredicted={slot.is_predicted} />;
}

/**
 * Generic leaderboard table for the /rankings pages — same markup family as
 * the "Most followed {game} streamers" table on the game hub
 * (app/game/[slug]/page.tsx), generalized over column definitions from
 * lib/rankings.ts. Server component. Live badges render only when the caller
 * passes `liveIds` (which implies it lowered its revalidate accordingly).
 */
export function RankingTable({
  caption,
  columns,
  entries,
  rowAnchorPrefix,
  liveIds,
  nextSlots,
  mainGameSlugs,
}: Props) {
  return (
    <div className="overflow-x-auto rounded-xl bg-background-elevated p-1 gradient-border">
      <table className="w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
            <th scope="col" className="px-3 py-2 font-semibold">
              #
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              Streamer
            </th>
            {columns.map((col) => (
              <th key={col.key} scope="col" className="px-3 py-2 text-right font-semibold">
                {col.header}
              </th>
            ))}
            {mainGameSlugs && (
              <th scope="col" className="px-3 py-2 text-right font-semibold">
                Main game
              </th>
            )}
            {nextSlots && (
              <th scope="col" className="px-3 py-2 text-right font-semibold">
                Next stream
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const { streamer } = entry;
            const medal = MEDAL_CLASSES[entry.rank];
            return (
              <tr
                key={streamer.id}
                id={rowAnchorPrefix ? `${rowAnchorPrefix}-${entry.rank}` : undefined}
                // scroll-mt clears the sticky site header when jumping to a row anchor
                className="scroll-mt-20 border-t border-divider"
              >
                <td className="px-3 py-2">
                  <span className="flex items-baseline gap-1.5">
                    <span
                      className={`font-bold tabular-nums ${medal ?? 'text-text-muted'}`}
                    >
                      {entry.rank}
                    </span>
                    <TrendIndicator entry={entry} />
                  </span>
                </td>
                <th scope="row" className="px-3 py-2 text-left font-medium">
                  <Link
                    href={`/streamer/${encodeURIComponent(streamer.id)}`}
                    className="group flex items-center gap-3"
                  >
                    {streamer.avatar_url ? (
                      <Image
                        src={streamer.avatar_url}
                        alt=""
                        width={36}
                        height={36}
                        unoptimized
                        className="shrink-0 rounded-full border border-border-default"
                      />
                    ) : (
                      <InitialsAvatar name={streamer.name} size={36} className="shrink-0" />
                    )}
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-semibold text-text-primary group-hover:text-accent-cyan">
                        {streamer.name}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5">
                        {liveIds?.has(streamer.id) && <LiveBadge size="sm" />}
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
                </th>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={
                      col.primary
                        ? 'px-3 py-2 text-right font-semibold tabular-nums text-accent-cyan'
                        : 'px-3 py-2 text-right tabular-nums text-text-secondary'
                    }
                  >
                    {col.format(entry)}
                  </td>
                ))}
                {mainGameSlugs && (
                  <td className="max-w-40 truncate px-3 py-2 text-right text-text-secondary">
                    <MainGameCell topCategory={entry.top_category} slugs={mainGameSlugs} />
                  </td>
                )}
                {nextSlots && (
                  <td className="whitespace-nowrap px-3 py-2 text-right text-text-secondary">
                    <NextStreamCell streamer={streamer} slot={nextSlots.get(streamer.id)} />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
