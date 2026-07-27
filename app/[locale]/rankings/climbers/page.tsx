import type { Metadata } from 'next';
import Link from 'next/link';
import { buildBreadcrumbJsonLd, jsonLdHtml, applyLocaleSeo } from '@/lib/seo';
import { isUiLang, type UiLang } from '@/lib/i18n-core';
import {
  formatGrowthPercent,
  formatRefreshedAt,
  formatSignedCompact,
  RANKING_PAGES,
} from '@/lib/rankings';
import {
  isClimbersIndexable,
  topClimber,
  type MetricMovers,
  type RankingClimber,
} from '@/lib/rankings-climbers';
import { loadClimbersData } from '@/lib/server/climbers';
import { rankingHref } from '@/lib/streamer-rankings';

// Weekly recap of leaderboard movement ("Biggest climbers this week") from
// the ~7d-old ranking snapshots (values.previous_rank). English body for all
// locales + en-only indexable — same convention as the leaderboard pages.
// No live badges on this page, so hourly regeneration is plenty (the data
// moves once per nightly snapshot anyway).
export const revalidate = 3600;

const SITE_URL = 'https://streamertimes.tv';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  const { movers } = await loadClimbersData();
  const best = topClimber(movers);
  const url = `${SITE_URL}/rankings/climbers`;
  const title = 'Biggest Climbers This Week — Streamer Rankings';
  const description = best
    ? `${best.climber.entry.streamer.name} climbed ${best.climber.delta} places in the ${best.movers.spec.h1.toLowerCase()} ranking this week. Weekly movers across the Streamer Times leaderboards: climbers, new top-100 entries and follower growth. Updated daily.`
    : 'Weekly movers across the Streamer Times leaderboards: who climbed the rankings, who entered the top 100, and who gained the most followers. Updated daily.';
  const meta: Metadata = {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'Streamer Times', type: 'website' },
  };
  // Thin-content gate (snapshot history warming up / API failure): render,
  // but stay out of the index until there is a real recap to show.
  if (!isClimbersIndexable(movers)) {
    meta.robots = { index: false, follow: true };
  }
  return applyLocaleSeo(meta, locale, '/rankings/climbers');
}

function streamerUrl(id: string): string {
  return `/streamer/${encodeURIComponent(id)}`;
}

function ClimberTable({ movers }: { movers: MetricMovers }) {
  const { spec, climbers } = movers;
  const primary = spec.columns.find((c) => c.primary) ?? spec.columns[0];
  return (
    <div className="overflow-x-auto rounded-xl bg-background-elevated p-1 gradient-border">
      <table className="w-full text-sm">
        <caption className="sr-only">{`Biggest climbers this week — ${spec.h1.toLowerCase()}`}</caption>
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
            <th scope="col" className="px-3 py-2 font-semibold">
              Now
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              Streamer
            </th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">
              Change
            </th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">
              A week ago
            </th>
            {primary && (
              <th scope="col" className="px-3 py-2 text-right font-semibold">
                {primary.header}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {climbers.map(({ entry, delta, previousRank }) => (
            <tr key={entry.streamer.id} className="border-t border-divider">
              <td className="px-3 py-2">
                <Link
                  href={rankingHref(spec.metric, entry.rank)}
                  className="font-bold tabular-nums text-text-muted hover:text-accent-cyan"
                  title={`Rank ${entry.rank} in ${spec.h1.toLowerCase()}`}
                >
                  #{entry.rank}
                </Link>
              </td>
              <th scope="row" className="px-3 py-2 text-left font-medium">
                <Link
                  href={streamerUrl(entry.streamer.id)}
                  className="font-semibold text-text-primary hover:text-accent-cyan"
                >
                  {entry.streamer.name}
                </Link>
              </th>
              <td className="px-3 py-2 text-right">
                <span className="font-semibold tabular-nums text-live">▲{delta}</span>
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-text-muted">
                #{previousRank}
              </td>
              {primary && (
                <td className="px-3 py-2 text-right tabular-nums text-text-secondary">
                  {primary.format(entry)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NewcomerLine({ movers }: { movers: MetricMovers }) {
  if (movers.newcomers.length === 0) return null;
  return (
    <p className="mt-3 text-sm text-text-secondary">
      <span className="font-semibold text-text-primary">New in the top 100:</span>{' '}
      {movers.newcomers.map((e, i) => (
        <span key={e.streamer.id}>
          {i > 0 && ' · '}
          <Link
            href={streamerUrl(e.streamer.id)}
            className="text-accent-cyan hover:text-text-primary"
          >
            {e.streamer.name}
          </Link>{' '}
          <span className="tabular-nums text-text-muted">(#{e.rank})</span>
        </span>
      ))}
    </p>
  );
}

export default async function ClimbersPage() {
  const { movers, growth } = await loadClimbersData();
  const sections = movers.filter((m) => m.climbers.length > 0 || m.newcomers.length > 0);
  const refreshedLabel = formatRefreshedAt(
    movers
      .map((m) => m.refreshedAt)
      .filter((v): v is string => v !== null)
      .sort()
      .at(-1) ?? null,
  );

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'Home', url: SITE_URL },
    { name: 'Rankings', url: `${SITE_URL}/rankings` },
    { name: 'Climbers this week' },
  ]);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(breadcrumb) }}
      />

      <p className="text-sm text-text-muted">
        <Link href="/rankings" className="hover:text-accent-cyan">
          Rankings
        </Link>{' '}
        / Climbers this week
      </p>
      <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">
        Biggest climbers this week
      </h1>

      <nav aria-label="Ranking categories" className="mt-4 flex flex-wrap gap-2">
        <span
          aria-current="page"
          className="inline-block rounded-full border border-accent-cyan/60 bg-background-elevated px-4 py-1.5 text-sm font-semibold text-accent-cyan"
        >
          Climbers this week
        </span>
        {RANKING_PAGES.map((p) => (
          <Link
            key={p.slug}
            href={`/rankings/${p.slug}`}
            className="inline-block rounded-full border border-border-default bg-background-elevated px-4 py-1.5 text-sm text-text-primary transition-colors hover:border-accent-cyan/60 hover:text-accent-cyan"
          >
            {p.navLabel}
          </Link>
        ))}
      </nav>

      {sections.length > 0 ? (
        <>
          <p className="mt-4 max-w-2xl text-text-secondary">
            Who moved up across the Streamer Times leaderboards — current ranks
            compared with our ranking snapshot from about a week ago.
            {refreshedLabel && (
              <span className="text-text-muted"> Data refreshed {refreshedLabel}.</span>
            )}
          </p>

          {sections.map((m) => (
            <section key={m.spec.slug} aria-labelledby={`${m.spec.slug}-climbers`} className="mt-10">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id={`${m.spec.slug}-climbers`} className="text-xl font-bold text-white">
                  {m.spec.h1}
                </h2>
                <Link
                  href={`/rankings/${m.spec.slug}`}
                  className="text-sm text-accent-cyan hover:text-text-primary"
                >
                  Full ranking →
                </Link>
              </div>
              {m.climbers.length > 0 ? (
                <div className="mt-4">
                  <ClimberTable movers={m} />
                </div>
              ) : (
                <p className="mt-3 text-sm text-text-secondary">
                  No one climbed this leaderboard over the last week.
                </p>
              )}
              <NewcomerLine movers={m} />
            </section>
          ))}
        </>
      ) : (
        <p className="mt-4 max-w-2xl text-text-secondary">
          This recap is warming up — it needs about a week of ranking snapshots
          before there is movement to show. Check back soon.
        </p>
      )}

      {growth && (
        <section aria-labelledby="growth-spotlight" className="mt-10">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="growth-spotlight" className="text-xl font-bold text-white">
              Growth spotlight
            </h2>
            <Link
              href="/rankings/fastest-growing"
              className="text-sm text-accent-cyan hover:text-text-primary"
            >
              Full ranking →
            </Link>
          </div>
          <p className="mt-1 text-sm text-text-muted">
            The biggest follower and subscriber gains of the last 7 days.
          </p>
          <ol className="mt-4 space-y-2">
            {growth.entries.map((e) => (
              <li key={e.streamer.id} className="text-sm text-text-secondary">
                <span className="font-bold tabular-nums text-text-muted">#{e.rank}</span>{' '}
                <Link
                  href={streamerUrl(e.streamer.id)}
                  className="font-semibold text-text-primary hover:text-accent-cyan"
                >
                  {e.streamer.name}
                </Link>{' '}
                <span className="font-semibold tabular-nums text-live">
                  {formatSignedCompact(e.values.follower_gain_7d)}
                </span>{' '}
                <span className="tabular-nums text-text-muted">
                  ({formatGrowthPercent(e.values.follower_growth_percent_7d)})
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section aria-labelledby="climbers-faq-heading" className="mt-12 max-w-2xl">
        <h2 id="climbers-faq-heading" className="text-xl font-bold text-white">
          About this recap
        </h2>
        <dl className="mt-4 space-y-5">
          <div>
            <dt className="font-semibold text-text-primary">How are climbers measured?</dt>
            <dd className="mt-1 text-sm text-text-secondary">
              We snapshot every leaderboard daily and compare each streamer&apos;s
              current rank with their rank in the snapshot from at least 7 days
              ago. A climber moved up; &quot;new in the top 100&quot; means the streamer
              was not in that week-old top-100 snapshot.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-text-primary">How often does this update?</dt>
            <dd className="mt-1 text-sm text-text-secondary">
              Daily, together with the leaderboards — so the &quot;week&quot; is a rolling
              7-day window, not a calendar week.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-text-primary">
              Why is a leaderboard missing here?
            </dt>
            <dd className="mt-1 text-sm text-text-secondary">
              A leaderboard drops out of the recap while nobody moved up on it.
              The punctuality ranking is excluded on purpose — it moves too
              slowly for a weekly recap — and the fastest-growing board appears
              as the growth spotlight instead, since it already measures a
              7-day gain.
            </dd>
          </div>
        </dl>
      </section>

      <p className="mt-12 border-t border-divider pt-6 text-sm text-text-secondary">
        <Link href="/rankings" className="text-accent-cyan hover:text-text-primary">
          ← All rankings
        </Link>
        {RANKING_PAGES.map((p) => (
          <span key={p.slug}>
            {'  ·  '}
            <Link
              href={`/rankings/${p.slug}`}
              className="text-accent-cyan hover:text-text-primary"
            >
              {p.navLabel}
            </Link>
          </span>
        ))}
      </p>
    </main>
  );
}
