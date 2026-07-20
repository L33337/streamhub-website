import Link from 'next/link';
import type { PublicStreamer, PublicStreamerRankings } from '@/lib/server/partner-api';
import { formatCompactNumber } from '@/lib/format/number';
import { resolveUiLang } from '@/lib/i18n-core';
import { uiLexFor } from '@/lib/i18n-ui';
import {
  buildStreamerRankingRows,
  type StreamerRankingRow,
} from '@/lib/streamer-rankings';

interface Props {
  streamer: PublicStreamer;
  rankings: PublicStreamerRankings | null;
}

/**
 * "Rankings" block under Channel stats — where this streamer places across the
 * leaderboards, each row linking to the exact page and row of that leaderboard.
 *
 * Renders nothing when the streamer places nowhere meaningful (pool < 3) or the
 * rank lookup failed — same "no data, no section" rule as ChannelStats. The
 * ordering and filtering live in lib/streamer-rankings.ts; this file is markup.
 */
export function StreamerRankings({ streamer, rankings }: Props) {
  const lang = resolveUiLang(streamer.language);
  const L = uiLexFor(streamer.language).streamerRankings;
  const rows = buildStreamerRankingRows(rankings, { metric: L.metric });
  if (rows.length === 0) return null;

  const global = rows.filter((r) => !r.isGame);
  const games = rows.filter((r) => r.isGame);

  return (
    <section
      aria-labelledby="streamer-rankings-heading"
      className="mt-8 border-t border-divider pt-8"
    >
      <h2 id="streamer-rankings-heading" className="text-2xl font-bold text-white">
        {L.heading}
      </h2>
      <p className="mt-1 text-sm text-text-muted">{L.intro(streamer.name)}</p>

      {global.length > 0 && (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {global.map((row) => (
            <RankRow key={row.key} row={row} lang={lang} L={L} />
          ))}
        </ul>
      )}

      {games.length > 0 && (
        <>
          <h3 className="mt-6 text-xs uppercase tracking-wider text-text-muted">
            {L.byCategory}
          </h3>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {games.map((row) => (
              <RankRow key={row.key} row={row} lang={lang} L={L} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

type Lex = ReturnType<typeof uiLexFor>['streamerRankings'];

function RankRow({
  row,
  lang,
  L,
}: {
  row: StreamerRankingRow;
  lang: string;
  L: Lex;
}) {
  const total = formatCompactNumber(row.total, lang);
  const body = (
    <>
      <span className="text-lg font-bold tabular-nums text-accent-cyan">#{row.rank}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-text-primary">
          {row.label}
        </span>
        <span className="block text-xs text-text-muted">{L.ofTotal(total)}</span>
      </span>
      <Trend trend={row.trend} L={L} />
    </>
  );

  const className =
    'flex items-center gap-3 rounded-xl bg-background-elevated p-3 transition-colors';

  return (
    <li>
      {row.href ? (
        <Link
          href={row.href}
          aria-label={L.rowAria(row.rank, total, row.label)}
          className={`${className} hover:bg-background-elevated/70 hover:ring-1 hover:ring-accent-cyan/40`}
        >
          {body}
        </Link>
      ) : (
        // No linkable target (category without a public page) — still worth
        // stating the placement, just not as a dead link.
        <div className={className}>{body}</div>
      )}
    </li>
  );
}

/**
 * 7-day movement. Absent baselines render nothing at all (see rankTrend): past
 * the snapshot depth a missing baseline says nothing about direction, so a
 * "NEW" badge would be a claim we cannot back.
 */
function Trend({ trend, L }: { trend: StreamerRankingRow['trend']; L: Lex }) {
  if (trend.kind === 'none') return null;
  const up = trend.kind === 'up';
  return (
    <span
      className={`shrink-0 text-xs font-semibold tabular-nums ${
        up ? 'text-green-400' : 'text-red-400'
      }`}
    >
      <span aria-hidden="true">
        {up ? '▲' : '▼'}
        {trend.delta}
      </span>
      <span className="sr-only">
        {up ? L.trendUp(trend.delta) : L.trendDown(trend.delta)}
      </span>
    </span>
  );
}
