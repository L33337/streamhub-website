import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
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
import { formatCompactNumber, formatStatValue } from '@/lib/format/number';
import {
  COLLECTING_THRESHOLD,
  bestMedianCategory,
  followerStats,
  followersPerStreamHour,
  formatFollowerBand,
  isOnVacation,
  marketByCategory,
  marketDeltaPct,
  monthlyViewerDelta,
  rampMedians,
  sizeBenchmarkTopShare,
  usableCategoryRows,
  usableCells,
  usableMonthlyTrend,
} from '@/lib/streamer-insights';
import { buildRampView } from '@/lib/game-timing';
import { InsightsCharts } from '@/components/web/streamer/InsightsCharts';
import {
  FollowerGrowthChart,
  MonthlyTrendChart,
} from '@/components/web/streamer/InsightsTrendCharts';
import { RampBars } from '@/components/web/games/RampBars';
import { StreamerStatsBlock } from '@/components/web/StreamerStatsBlock';

// W2 rider (2026-09-05): nightly aggregates (04:50 UTC refresh) do not need
// 12 regenerations/h — measured 52k ISR write units per 2 days at TTL 300.
export const revalidate = 3600;

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
  if (!streamer) return { title: 'Streamer not found — Streamer Times' };
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

// 2026-08-01 redesign: tiers wear the page's delta pair (good/bad) with the
// viz violet as the neutral middle — the neon live/pink pair clashed and
// cyan is reserved for site chrome on this page.
const TIER_STYLE: Record<string, string> = {
  reliable: 'border-delta-up/40 text-delta-up',
  medium: 'border-viz-soft/40 text-viz-soft',
  unreliable: 'border-delta-down/40 text-delta-down',
  unknown: 'border-border-default text-text-muted',
};

// Shared tile-label style: violet mono kicker over a white value — the
// HomeQuickFacts pattern (colored kicker carries identity, white number
// carries the reading).
const KICKER = 'font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-viz-soft';

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
  const bestCategory = bestMedianCategory(categoryRows);

  // 2026-08-01 expansion: viewer trend, follower growth, rhythm, market.
  const trendMonths = usableMonthlyTrend(
    insights?.monthly_trend ?? null,
    insights?.tracked_since ?? null,
  );
  const viewerDelta = monthlyViewerDelta(trendMonths);
  const followers = followerStats(insights?.follower_trend);
  const perHour = followersPerStreamHour(
    followers?.gain30 ?? null,
    insights?.observed_hours_30d,
  );
  const market = marketByCategory(insights?.category_market);
  const hasRhythm =
    stats?.has_stats === true &&
    (stats.streams_per_week != null || stats.hours_streamed != null);
  const preTracking = (trendMonths ?? []).some((m) => m.isPreTracking);

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

      {/* Identity header: without the avatar the page reads like a detached
          report — the streamer page look anchors it (and the way back). */}
      <div className="mt-3 flex items-center gap-4">
        {streamer.avatar_url && (
          <Image
            src={streamer.avatar_url}
            // Identity image of the page, not decoration next to a repeated
            // name — the <h1> below reads "<name> — streaming insights".
            alt={`${streamer.name} avatar`}
            width={80}
            height={80}
            className="h-14 w-14 shrink-0 rounded-full border-2 border-viz-soft/40 sm:h-20 sm:w-20"
          />
        )}
        <div className="min-w-0">
          <h1 className="text-pretty text-3xl font-bold text-white md:text-4xl">
            {`${streamer.name} — streaming insights`}
          </h1>
          {(streamer.follower_count != null || insights?.main_category) && (
            <p className="mt-1 text-sm text-text-muted">
              {streamer.follower_count != null &&
                `${formatCompactNumber(streamer.follower_count)} followers`}
              {streamer.follower_count != null && insights?.main_category && ' · '}
              {insights?.main_category && `mostly streams ${insights.main_category}`}
            </p>
          )}
        </div>
      </div>
      <p className="mt-3 max-w-2xl text-text-secondary">
        When does {streamer.name} pull the most viewers — and where is room to
        grow? Based on hourly concurrent-viewer samples over the last{' '}
        {insights?.window_days ?? 56} days.
      </p>

      {vacation && insights?.vacation_until && (
        <p className="mt-4 rounded-lg border border-viz-soft/30 bg-background-elevated px-4 py-3 text-sm text-text-secondary">
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

          {trendMonths && (
            <section aria-labelledby="viewer-trend-heading" className="mt-10">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <h2 id="viewer-trend-heading" className="text-xl font-bold text-white">
                  Viewer trend by month
                </h2>
                {viewerDelta && (
                  <p className="text-sm text-text-muted">
                    {viewerDelta.latest.label}{' '}
                    <span
                      className={`font-semibold ${
                        viewerDelta.pct > 0
                          ? 'text-delta-up'
                          : viewerDelta.pct < 0
                            ? 'text-delta-down'
                            : 'text-text-secondary'
                      }`}
                    >
                      {viewerDelta.pct > 0 ? '+' : ''}
                      {viewerDelta.pct}%
                    </span>{' '}
                    vs {viewerDelta.previous.label}
                  </p>
                )}
              </div>
              <p className="mt-1 max-w-2xl text-sm text-text-secondary">
                Median and sampled peak concurrent viewers per calendar month —
                growing, flat or cooling at a glance.
              </p>
              <div className="mt-4 max-w-2xl">
                <MonthlyTrendChart
                  trend={insights?.monthly_trend ?? null}
                  trackedSince={insights?.tracked_since ?? null}
                />
              </div>
              {preTracking && insights?.tracked_since && (
                <p className="mt-2 max-w-2xl text-xs text-text-muted">
                  Tracking started{' '}
                  {new Date(insights.tracked_since).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                  {' — '}earlier months only show what the onboarding backfill
                  could recover.
                </p>
              )}
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

          {followers && (
            <section aria-labelledby="follower-growth-heading" className="mt-10">
              <h2 id="follower-growth-heading" className="text-xl font-bold text-white">
                Follower growth
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-text-secondary">
                Daily follower counts. Twitch shares subscriber and
                unique-viewer numbers only with the broadcaster, so follower
                growth — and followers gained per streamed hour — is the
                closest honest read on how well streams convert viewers into
                an audience.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {followers.gain7 !== null && (
                  <div className="rounded-xl border border-border-default bg-background-elevated p-4">
                    <p className={KICKER}>
                      Last 7 days
                    </p>
                    <p
                      className={`mt-2 text-2xl font-bold ${
                        followers.gain7 > 0
                          ? 'text-delta-up'
                          : followers.gain7 < 0
                            ? 'text-delta-down'
                            : 'text-text-secondary'
                      }`}
                    >
                      {followers.gain7 > 0 ? '+' : ''}
                      {formatCompactNumber(followers.gain7)}
                    </p>
                    <p className="mt-1 text-sm text-text-secondary">followers</p>
                  </div>
                )}
                {followers.gain30 !== null && (
                  <div className="rounded-xl border border-border-default bg-background-elevated p-4">
                    <p className={KICKER}>
                      Last 30 days
                    </p>
                    <p
                      className={`mt-2 text-2xl font-bold ${
                        followers.gain30 > 0
                          ? 'text-delta-up'
                          : followers.gain30 < 0
                            ? 'text-delta-down'
                            : 'text-text-secondary'
                      }`}
                    >
                      {followers.gain30 > 0 ? '+' : ''}
                      {formatCompactNumber(followers.gain30)}
                    </p>
                    <p className="mt-1 text-sm text-text-secondary">followers</p>
                  </div>
                )}
                {perHour !== null && (
                  <div className="rounded-xl border border-border-default bg-background-elevated p-4">
                    <p className={KICKER}>
                      Per streamed hour
                    </p>
                    <p className="mt-2 text-2xl font-bold text-white">
                      ≈{formatStatValue(perHour)}
                    </p>
                    <p className="mt-1 text-sm text-text-secondary">
                      new followers (last 30 days)
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-4 max-w-2xl">
                <FollowerGrowthChart points={followers.points} />
              </div>
              {followers.spanDays < 60 && (
                <p className="mt-2 max-w-2xl text-xs text-text-muted">
                  We started recording daily follower counts in July 2026 — this
                  chart covers {followers.spanDays} days so far and grows over
                  time.
                </p>
              )}
            </section>
          )}

          {hasRhythm && stats && (
            <section aria-labelledby="rhythm-heading" className="mt-10">
              <h2 id="rhythm-heading" className="text-xl font-bold text-white">
                Streaming rhythm
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-text-secondary">
                How often and how long {streamer.name} goes live, from the last{' '}
                {stats.window_days} days of broadcasts
                {stats.typical_start && stats.typical_end && (
                  <>
                    {' — '}typically{' '}
                    <span className="font-semibold text-text-primary">
                      {stats.typical_start}–{stats.typical_end}
                    </span>{' '}
                    ({stats.timezone})
                  </>
                )}
                .
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {stats.streams_per_week != null && (
                  <div className="rounded-xl border border-border-default bg-background-elevated p-4">
                    <p className={KICKER}>
                      Streams per week
                    </p>
                    <p className="mt-2 text-2xl font-bold text-white">
                      {formatStatValue(stats.streams_per_week)}
                    </p>
                  </div>
                )}
                {stats.active_days_per_week != null && (
                  <div className="rounded-xl border border-border-default bg-background-elevated p-4">
                    <p className={KICKER}>
                      Active days per week
                    </p>
                    <p className="mt-2 text-2xl font-bold text-white">
                      {formatStatValue(stats.active_days_per_week)}
                    </p>
                  </div>
                )}
                {stats.typical_duration_minutes != null && (
                  <div className="rounded-xl border border-border-default bg-background-elevated p-4">
                    <p className={KICKER}>
                      Typical stream
                    </p>
                    <p className="mt-2 text-2xl font-bold text-white">
                      {formatStatValue(stats.typical_duration_minutes / 60)} h
                    </p>
                  </div>
                )}
                {stats.hours_streamed != null && (
                  <div className="rounded-xl border border-border-default bg-background-elevated p-4">
                    <p className={KICKER}>
                      Hours in {stats.window_days} days
                    </p>
                    <p className="mt-2 text-2xl font-bold text-white">
                      {formatStatValue(stats.hours_streamed)}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          {categoryRows.length > 0 && (
            <section aria-labelledby="category-perf-heading" className="mt-10">
              <h2 id="category-perf-heading" className="text-xl font-bold text-white">
                Category performance
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Sorted by hours observed — the categories {streamer.name} actually
                lives in come first.
              </p>
              {/* No min-width / no h-scroll: on phones the hours column moves
                  into a subtext line under the category name instead of
                  living off-screen behind an invisible horizontal scroll. */}
              <div className="mt-4 rounded-xl bg-background-elevated p-1 gradient-border">
                <table className="w-full text-sm">
                  <caption className="sr-only">
                    Median concurrent viewers per category, last{' '}
                    {insights?.window_days ?? 56} days, sorted by hours observed
                  </caption>
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                      <th scope="col" className="px-3 py-2 font-semibold">
                        Category
                      </th>
                      <th scope="col" className="px-3 py-2 text-right font-semibold">
                        Median viewers
                      </th>
                      {market.size > 0 && (
                        <th
                          scope="col"
                          className="hidden px-3 py-2 text-right font-semibold sm:table-cell"
                        >
                          Vs. typical channel
                        </th>
                      )}
                      <th
                        scope="col"
                        className="hidden px-3 py-2 text-right font-semibold sm:table-cell"
                      >
                        Hours observed
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryRows.map((row) => {
                      const s = gameLink(row.category);
                      const isBest = row.category === bestCategory;
                      const m = market.get(row.category);
                      const delta = marketDeltaPct(row.median, m);
                      const deltaText =
                        delta !== null ? `${delta > 0 ? '+' : ''}${delta}%` : null;
                      const deltaClass =
                        delta !== null && delta > 0
                          ? 'text-delta-up'
                          : delta !== null && delta < 0
                            ? 'text-delta-down'
                            : 'text-text-secondary';
                      return (
                        <tr key={row.category} className="border-t border-divider">
                          <th scope="row" className="px-3 py-2 text-left font-medium">
                            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
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
                              {isBest && (
                                <span className="rounded-full border border-viz-soft/40 px-1.5 py-0.5 text-[10px] font-semibold text-viz-soft">
                                  Highest median
                                </span>
                              )}
                              {m?.is_trending === true && (
                                <span className="text-[10px] font-semibold text-accent-pink">
                                  ▲ Trending
                                </span>
                              )}
                            </span>
                            <span className="mt-0.5 block text-[11px] font-normal text-text-muted sm:hidden">
                              {`${row.hours} h observed`}
                              {deltaText && (
                                <>
                                  {' · '}
                                  <span className={deltaClass}>{deltaText}</span> vs
                                  typical channel
                                </>
                              )}
                            </span>
                          </th>
                          <td className="px-3 py-2 text-right font-semibold tabular-nums text-text-primary">
                            {row.median !== null ? formatStatValue(row.median) : '—'}
                          </td>
                          {market.size > 0 && (
                            <td
                              className={`hidden px-3 py-2 text-right font-semibold tabular-nums sm:table-cell ${deltaClass}`}
                            >
                              {deltaText ?? '—'}
                            </td>
                          )}
                          <td className="hidden px-3 py-2 text-right tabular-nums text-text-secondary sm:table-cell">
                            {row.hours}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {market.size > 0 && (
                <p className="mt-2 max-w-2xl text-xs text-text-muted">
                  “Vs. typical channel” compares {streamer.name}&apos;s median
                  with the category&apos;s average viewers per live tracked
                  channel over 28 days. Big channels pull that average up, so
                  small streamers land below 0% in most categories — compare
                  across rows, not against zero.
                </p>
              )}
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
                        {`~${formatStatValue(g.overall_score)} viewers/channel`}
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
                {/* Whichever half is missing renders an explanatory placeholder
                    instead of an empty grid slot — the section title promises
                    both, and "how do I unlock this?" beats a silent gap. */}
                {relUsable && rel && (
                  <div className="rounded-xl border border-border-default bg-background-elevated p-4">
                    <p className={KICKER}>
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
                {!relUsable && (
                  <div className="rounded-xl border border-dashed border-border-default bg-background-elevated p-4">
                    <p className={KICKER}>
                      Schedule reliability
                    </p>
                    <p className="mt-2 text-sm text-text-secondary">
                      Not enough scored schedule announcements yet. Once 5
                      announced streams have been evaluated against what
                      actually happened, punctuality stats appear here
                      automatically.
                    </p>
                  </div>
                )}
                {topShare !== null && band ? (
                  <div className="rounded-xl border border-border-default bg-background-elevated p-4">
                    <p className={KICKER}>
                      Size benchmark
                    </p>
                    {/* The page's one hero number — the only value allowed to
                        wear the bright viz accent. */}
                    <p className="mt-2 text-2xl font-bold text-viz-bright">
                      Top {topShare}%
                    </p>
                    <p className="mt-1 text-sm text-text-secondary">
                      of channels with {band} by median concurrent viewers.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border-default bg-background-elevated p-4">
                    <p className={KICKER}>
                      Size benchmark
                    </p>
                    <p className="mt-2 text-sm text-text-secondary">
                      Needs enough similar-sized tracked channels for a fair
                      comparison — this fills in automatically as coverage
                      grows.
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
