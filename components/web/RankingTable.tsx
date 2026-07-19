import Image from 'next/image';
import Link from 'next/link';
import type { PublicRankingEntry } from '@/lib/server/partner-api';
import type { RankingColumn } from '@/lib/rankings';
import { PlatformBadge } from '@/components/web/Badges';
import { InitialsAvatar } from '@/components/web/InitialsAvatar';

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
}

// Medal accents for ranks 1-3 (gold/silver/bronze, tuned for the dark theme).
const MEDAL_CLASSES: Record<number, string> = {
  1: 'text-[#FFC94D]',
  2: 'text-[#C7CEDD]',
  3: 'text-[#C9885A]',
};

/**
 * Generic leaderboard table for the /rankings pages — same markup family as
 * the "Most followed {game} streamers" table on the game hub
 * (app/game/[slug]/page.tsx), generalized over column definitions from
 * lib/rankings.ts. Server component; deliberately no live badges (the pages
 * revalidate hourly, a live badge would be stale for up to an hour).
 */
export function RankingTable({ caption, columns, entries, rowAnchorPrefix }: Props) {
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
                <td
                  className={`px-3 py-2 font-bold tabular-nums ${medal ?? 'text-text-muted'}`}
                >
                  {entry.rank}
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
                        {streamer.platforms.map((p) => (
                          <PlatformBadge key={p} platform={p} size="sm" />
                        ))}
                        {streamer.language && (
                          <span className="text-[10px] uppercase tracking-wider text-text-muted">
                            {streamer.language}
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
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
