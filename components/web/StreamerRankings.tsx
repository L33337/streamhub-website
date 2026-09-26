import Link from 'next/link';
import type { PublicStreamer, PublicStreamerRankings } from '@/lib/server/partner-api';
import { formatCompactNumber } from '@/lib/format/number';
import { localeHref, resolveUiLang, type UiLang } from '@/lib/i18n-core';
import { uiLexFor } from '@/lib/i18n-ui';
import {
  buildStreamerRankingRows,
  type StreamerRankingRow,
} from '@/lib/streamer-rankings';

interface Props {
  streamer: PublicStreamer;
  rankings: PublicStreamerRankings | null;
  // M22 (D6): UI strings follow the viewer's locale; defaults to the
  // streamer's language for pre-M22 call sites.
  uiLanguage?: string | null;
}

/**
 * "Rankings" block — where this streamer places across the leaderboards, each
 * placement linking to the exact page and row of that leaderboard.
 *
 * Compact since the streamer-page UX round (2026-09-26): placements up to
 * #100 (the first leaderboard page) render as one chip row, best first; the
 * full card list sits behind "All rankings (N)". The old block was up to eight
 * full-width cards (613 px on a phone for "#656 of 988 Most followed"), placed
 * before the typical streaming times the page exists for.
 *
 * Renders nothing when the streamer places nowhere meaningful (pool < 3) or the
 * rank lookup failed — same "no data, no section" rule as ChannelStats. The
 * ordering and filtering live in lib/streamer-rankings.ts; this file is markup.
 */
export function StreamerRankings({ streamer, rankings, uiLanguage }: Props) {
  const ui = uiLanguage ?? streamer.language;
  const lang = resolveUiLang(ui);
  const L = uiLexFor(ui).streamerRankings;
  const rows = buildStreamerRankingRows(rankings, { metric: L.metric });
  if (rows.length === 0) return null;

  const top = rows.filter((r) => r.rank <= CHIP_RANK_CEILING).sort((a, b) => a.rank - b.rank);
  const global = rows.filter((r) => !r.isGame);
  const games = rows.filter((r) => r.isGame);

  return (
    <section
      aria-labelledby="streamer-rankings-heading"
      className="mt-10 border-t border-divider pt-8"
    >
      <h2 id="streamer-rankings-heading" className="text-2xl font-bold text-white">
        {L.heading}
      </h2>
      <p className="mt-1 text-sm text-text-muted">{L.intro(streamer.name)}</p>

      {top.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {top.map((row) => (
            <RankChip key={row.key} row={row} lang={lang} L={L} />
          ))}
        </ul>
      )}

      <details className="group mt-4">
        <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1 text-sm font-semibold text-accent-cyan hover:text-text-primary [&::-webkit-details-marker]:hidden">
          {L.allRankings(rows.length)}
          <span aria-hidden="true" className="transition-transform group-open:rotate-180">
            ▾
          </span>
        </summary>
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
      </details>
    </section>
  );
}

/** Placements shown as chips: the first page of every leaderboard. */
const CHIP_RANK_CEILING = 100;

function RankChip({ row, lang, L }: { row: StreamerRankingRow; lang: UiLang; L: Lex }) {
  // The accessible name is the visible text plus an sr-only "of N" — no
  // aria-label override (WCAG 2.5.3).
  const body = (
    <>
      <span className="font-bold tabular-nums text-accent-cyan">#{row.rank}</span>
      <span className="text-text-secondary">{row.label}</span>
      <span className="sr-only">{L.ofTotal(formatCompactNumber(row.total, lang))}</span>
      <Trend trend={row.trend} L={L} />
    </>
  );
  const chip =
    'inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border-default bg-background-elevated px-3 py-1 text-sm';
  return (
    <li>
      {row.href ? (
        <Link
          href={localeHref(lang, row.href)}
          className={`${chip} transition-colors hover:border-accent-cyan/60`}
        >
          {body}
        </Link>
      ) : (
        <span className={chip}>{body}</span>
      )}
    </li>
  );
}

type Lex = ReturnType<typeof uiLexFor>['streamerRankings'];

function RankRow({
  row,
  lang,
  L,
}: {
  row: StreamerRankingRow;
  lang: UiLang;
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
          href={localeHref(lang, row.href)}
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
