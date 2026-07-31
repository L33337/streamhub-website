import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getPartnerApi,
  type PublicStreamer,
  type PublicStreamerStats,
  type StreamerInsights,
} from '@/lib/server/partner-api';
import { applyLocaleSeo } from '@/lib/seo';
import { isUiLang, type UiLang } from '@/lib/i18n-core';
import { gameSlug } from '@/lib/game-slug';
import { formatCompactNumber } from '@/lib/format/number';
import {
  COLLECTING_THRESHOLD,
  formatFollowerBand,
  isOnVacation,
  rampMedians,
  sizeBenchmarkTopShare,
  usableCategoryRows,
  usableCells,
} from '@/lib/streamer-insights';
import { buildRampView } from '@/lib/game-timing';
import { InsightsCharts } from '@/components/web/streamer/InsightsCharts';
import { RampBars } from '@/components/web/games/RampBars';
import { StreamerStatsBlock } from '@/components/web/StreamerStatsBlock';

export const revalidate = 300;

const SITE_URL = 'https://streamertimes.tv';

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

interface InsightsPageData {
  streamer: PublicStreamer | null;
  insights: StreamerInsights | null;
  stats: PublicStreamerStats | null;
  /** Category ramp of the main category (overlay), null when unavailable. */
  categoryRamp: (number | null)[] | null;
  /** Hub catalog for safe game links (never emit internal 404 links). */
  hubCategories: Set<string>;
}

// All best-effort except the streamer lookup (404 gate) — never throw during
// prerender (build-abort rule).
const loadInsightsPage = cache(async (slug: string): Promise<InsightsPageData> => {
  const api = getPartnerApi();
  const [streamer, insights, stats, catalog] = await Promise.all([
    api.getStreamer(slug).catch(() => null),
    api.getStreamerInsights(slug), // best-effort inside the client
    api.getStreamerStats(slug), // best-effort inside the client
    api
      .listGames({ limit: 500 })
      .then((r) => new Set(r.data.map((g) => g.category)))
      .catch(() => new Set<string>()),
  ]);

  // Category ramp overlay for the "how long" section — best-effort second hop.
  let categoryRamp: (number | null)[] | null = null;
  if (streamer && insights?.main_category && catalog.has(insights.main_category)) {
    try {
      const rows = await api.listGames({
        category: insights.main_category,
        include: 'timing',
        limit: 1,
        revalidate: 3600,
      });
      const curve = rows.data[0]?.timing?.ramp_curve;
      if (Array.isArray(curve) && curve.length === 12) categoryRamp = curve;
    } catch {
      categoryRamp = null;
    }
  }

  return { streamer, insights, stats, categoryRamp, hubCategories: catalog };
});

export async function generateStaticParams() {
  // ISR-K1: SSG mode; variants render on demand.
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  const { streamer } = await loadInsightsPage(slug);
  if (!streamer) return { title: 'Streamer not found — StreamerTimes' };
  const meta: Metadata = {
    title: `${streamer.name} — Streaming Insights`,
    description: `When does ${streamer.name} pull the most viewers? Median viewers by weekday and hour, category performance, consistency and size benchmark.`,
    alternates: { canonical: `${SITE_URL}/streamer/${encodeURIComponent(slug)}/insights` },
    // v1: fully noindex for ALL locales regardless of data volume (decided
    // 2026-07-31) — not in the sitemap either; reachable via the teaser on
    // the streamer page. Indexing is a possible later step after GSC review
    // of the /best-time pages. applyLocaleSeo keeps the noindex and adds the
    // per-locale canonical.
    robots: { index: false, follow: true },
  };
  return applyLocaleSeo(meta, locale, `/streamer/${encodeURIComponent(slug)}/insights`);
}

const TIER_STYLE: Record<string, string> = {
  reliable: 'border-live/40 text-live',
  medium: 'border-accent-cyan/40 text-accent-cyan',
  unreliable: 'border-accent-pink/40 text-accent-pink',
  unknown: 'border-border-default text-text-muted',
};

export default async function StreamerInsightsPage({ params }: Props) {
  const { locale: rawLocale, slug } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  const { streamer, insights, stats, categoryRamp, hubCategories } =
    await loadInsightsPage(slug);
  if (!streamer) notFound();

  const collecting = (insights?.sample_count ?? 0) < COLLECTING_THRESHOLD;
  const weekdayCells = usableCells(insights?.weekday_viewers ?? null, 7);
  const hourCells = usableCells(insights?.hour_viewers ?? null, 24);
  const categoryRows = usableCategoryRows(insights?.category_viewers);
  const streamerRamp = rampMedians(insights?.ramp_curve);
  const ramp = buildRampView(streamerRamp);
  const games = insights?.games_to_try ?? [];
  const rel = insights?.schedule_reliability ?? null;
  const relUsable = rel && (rel.sample ?? 0) >= 5 && rel.time_tier && rel.time_tier !== 'unknown';
  const topShare = sizeBenchmarkTopShare(insights?.ccv_percentile_in_size_band);
  const band = formatFollowerBand(insights?.follower_band);
  const vacation = isOnVacation(insights?.vacation_until);

  const gameLink = (category: string): string | null => {
    const s = gameSlug(category);
    return s && hubCategories.has(category) ? s : null;
  };

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <p className="text-sm text-text-muted">
        <Link href="/streamers" className="hover:text-accent-cyan">
          Streamers
        </Link>{' '}
        /{' '}
        <Link
          href={`/streamer/${encodeURIComponent(slug)}`}
          className="hover:text-accent-cyan"
        >
          {streamer.name}
        </Link>{' '}
        / Insights
      </p>

      <h1 className="mt-3 text-pretty text-3xl font-bold text-white md:text-4xl">
        {`${streamer.name} — streaming insights`}
      </h1>
      <p className="mt-3 max-w-2xl text-text-secondary">
        When does {streamer.name} pull the most viewers — and where is room to
        grow? Based on hourly concurrent-viewer samples over the last{' '}
        {insights?.window_days ?? 56} days.
      </p>

      {vacation && insights?.vacation_until && (
        <p className="mt-4 rounded-lg border border-accent-cyan/30 bg-background-elevated px-4 py-3 text-sm text-text-secondary">
          {streamer.name} has announced a break until{' '}
          <span className="font-semibold text-text-primary">
            {new Date(insights.vacation_until).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
            })}
          </span>
          {' — '}recent numbers may not reflect their usual rhythm.
        </p>
      )}

      {collecting ? (
        <>
          <section
            aria-labelledby="collecting-heading"
            className="mt-8 rounded-xl border border-border-default bg-background-elevated p-6"
          >
            <h2 id="collecting-heading" className="text-lg font-bold text-white">
              Viewer data is still being collected
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-text-secondary">
              We sample concurrent viewers once per hour while {streamer.name}{' '}
              is live. After a week or two of streams there is enough data for
              median-viewer charts, category performance and benchmarks —
              check back soon. Their typical streaming times below come from
              the broadcast history and are available already.
            </p>
          </section>
          {stats && (
            <section aria-label="Typical streaming times" className="mt-8">
              <StreamerStatsBlock streamer={streamer} stats={stats} uiLanguage={locale} />
            </section>
          )}
        </>
      ) : (
        <>
          {(weekdayCells || hourCells) && (
            <section aria-labelledby="best-slots-heading" className="mt-8">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <h2 id="best-slots-heading" className="text-xl font-bold text-white">
                  When their viewers show up
                </h2>
                {insights?.overall_median != null && (
                  <p className="text-sm text-text-muted">
                    Overall median:{' '}
                    <span className="font-semibold text-text-primary">
                      {formatCompactNumber(insights.overall_median, 'en')}
                    </span>{' '}
                    concurrent viewers
                  </p>
                )}
              </div>
              <div className="mt-4">
                <InsightsCharts
                  weekdayCells={weekdayCells}
                  hourCells={hourCells}
                  streamerTimezone={insights?.timezone ?? null}
                />
              </div>
            </section>
          )}

          {ramp && streamerRamp && (
            <section aria-labelledby="ramp-heading" className="mt-10">
              <h2 id="ramp-heading" className="text-xl font-bold text-white">
                How long should {streamer.name} stream?
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-text-secondary">
                Median viewers by hour into the stream
                {ramp.peakHour !== null && (
                  <>
                    {' — '}
                    <span className="font-semibold text-text-primary">
                      their audience typically peaks in hour {ramp.peakHour}
                    </span>
                  </>
                )}
                {categoryRamp && insights?.main_category && (
                  <>, compared with the {insights.main_category} average</>
                )}
                .
              </p>
              <div className="mt-4 max-w-2xl">
                <RampBars
                  primary={streamerRamp}
                  primaryLabel={streamer.name}
                  secondary={categoryRamp}
                  secondaryLabel={insights?.main_category ?? 'Category'}
                />
              </div>
            </section>
          )}

          {categoryRows.length > 0 && (
            <section aria-labelledby="category-perf-heading" className="mt-10">
              <h2 id="category-perf-heading" className="text-xl font-bold text-white">
                Category performance
              </h2>
              <div className="mt-4 overflow-x-auto rounded-xl bg-background-elevated p-1 gradient-border">
                <table className="w-full min-w-[480px] text-sm">
                  <caption className="sr-only">
                    Median concurrent viewers per category, last{' '}
                    {insights?.window_days ?? 56} days
                  </caption>
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                      <th scope="col" className="px-3 py-2 font-semibold">
                        Category
                      </th>
                      <th scope="col" className="px-3 py-2 text-right font-semibold">
                        Median viewers
                      </th>
                      <th scope="col" className="px-3 py-2 text-right font-semibold">
                        Hours observed
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryRows.map((row) => {
                      const s = gameLink(row.category);
                      return (
                        <tr key={row.category} className="border-t border-divider">
                          <th scope="row" className="px-3 py-2 text-left font-medium">
                            {s ? (
                              <Link
                                href={`/game/${s}/best-time`}
                                prefetch={false}
                                className="text-text-primary hover:text-accent-cyan"
                              >
                                {row.category}
                              </Link>
                            ) : (
                              <span className="text-text-primary">{row.category}</span>
                            )}
                          </th>
                          <td className="px-3 py-2 text-right font-semibold tabular-nums text-accent-cyan">
                            {row.median !== null ? Math.round(row.median) : '—'}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-text-secondary">
                            {row.hours}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {games.length > 0 && (
            <section aria-labelledby="games-to-try-heading" className="mt-10">
              <h2 id="games-to-try-heading" className="text-xl font-bold text-white">
                Games to try
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-text-secondary">
                Categories that {insights?.main_category ?? 'their main game'}{' '}
                streamers also play, ranked by viewers per live channel.
              </p>
              <ul className="mt-3 flex flex-wrap gap-2" aria-label="Games to try">
                {games.map((g) => {
                  const s = gameLink(g.category);
                  const inner = (
                    <>
                      <span className="font-semibold">{g.category}</span>
                      <span className="ml-2 text-xs text-text-muted">
                        ~{Math.round(g.overall_score * 10) / 10} viewers/channel
                      </span>
                      {g.is_trending === true && (
                        <span className="ml-2 text-xs font-semibold text-accent-pink">
                          ▲ Trending
                        </span>
                      )}
                    </>
                  );
                  return (
                    <li key={g.category}>
                      {s ? (
                        <Link
                          href={`/game/${s}/best-time`}
                          prefetch={false}
                          className="inline-block rounded-full border border-border-default bg-background-elevated px-4 py-1.5 text-sm text-text-primary transition-colors hover:border-accent-cyan/60 hover:text-accent-cyan"
                        >
                          {inner}
                        </Link>
                      ) : (
                        <span className="inline-block rounded-full border border-border-default bg-background-elevated px-4 py-1.5 text-sm text-text-primary">
                          {inner}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {(relUsable || topShare !== null || insights?.consistency_percentile != null) && (
            <section aria-labelledby="consistency-heading" className="mt-10">
              <h2 id="consistency-heading" className="text-xl font-bold text-white">
                Consistency &amp; benchmark
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {relUsable && rel && (
                  <div className="rounded-xl border border-border-default bg-background-elevated p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                      Schedule reliability
                    </p>
                    <p className="mt-2">
                      <span
                        className={`inline-block rounded-full border bg-background px-2.5 py-1 text-xs font-semibold capitalize ${
                          TIER_STYLE[rel.time_tier ?? 'unknown'] ?? TIER_STYLE.unknown
                        }`}
                      >
                        {rel.time_tier}
                      </span>
                    </p>
                    <ul className="mt-3 space-y-1 text-sm text-text-secondary">
                      {rel.time_hit_rate != null && (
                        <li>
                          Sticks to announced times{' '}
                          <span className="font-semibold text-text-primary">
                            {Math.round(rel.time_hit_rate * 100)}%
                          </span>{' '}
                          of the time ({rel.sample} announced streams scored)
                        </li>
                      )}
                      {rel.median_start_deviation_minutes != null && (
                        <li>
                          Typically starts{' '}
                          <span className="font-semibold text-text-primary">
                            {Math.abs(rel.median_start_deviation_minutes)} min{' '}
                            {rel.median_start_deviation_minutes >= 0 ? 'late' : 'early'}
                          </span>
                        </li>
                      )}
                      {rel.no_show_count != null && rel.no_show_count > 0 && (
                        <li>{rel.no_show_count} announced streams didn&apos;t happen</li>
                      )}
                      {insights?.consistency_percentile != null &&
                        insights.main_category && (
                          <li>
                            More punctual than{' '}
                            <span className="font-semibold text-text-primary">
                              {insights.consistency_percentile}%
                            </span>{' '}
                            of {insights.main_category} streamers
                          </li>
                        )}
                    </ul>
                  </div>
                )}
                {topShare !== null && band && (
                  <div className="rounded-xl border border-border-default bg-background-elevated p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                      Size benchmark
                    </p>
                    <p className="mt-2 text-2xl font-bold text-accent-cyan">
                      Top {topShare}%
                    </p>
                    <p className="mt-1 text-sm text-text-secondary">
                      of channels with {band} by median concurrent viewers.
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          <section aria-labelledby="methodology-heading" className="mt-10">
            <h2
              id="methodology-heading"
              className="text-sm font-semibold uppercase tracking-wider text-text-muted"
            >
              How this is measured
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-text-secondary">
              Concurrent viewers are sampled once per hour while the channel is
              live on Twitch ({insights?.sample_count ?? 0} samples in the last{' '}
              {insights?.window_days ?? 56} days). Medians describe observed
              hours only — a quiet cell means “not observed”, not “nobody
              watched”. Peaks between samples are missed, so true peaks run
              higher than shown.
            </p>
          </section>
        </>
      )}

      <p className="mt-12 border-t border-divider pt-6 text-sm text-text-secondary">
        <Link
          href={`/streamer/${encodeURIComponent(slug)}`}
          className="text-accent-cyan hover:text-text-primary"
        >
          ← {streamer.name}&apos;s schedule
        </Link>
        {'  ·  '}
        <Link href="/best-games-to-stream" className="text-accent-cyan hover:text-text-primary">
          Best games to stream
        </Link>
      </p>
    </main>
  );
}
