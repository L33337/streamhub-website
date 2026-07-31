import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getPartnerApi } from '@/lib/server/partner-api';
import { applyLocaleSeo, buildBreadcrumbJsonLd, jsonLdHtml } from '@/lib/seo';
import { isUiLang, type UiLang } from '@/lib/i18n-core';
import {
  buildBestGameRows,
  isBestGamesIndexable,
  type BestGameRow,
} from '@/lib/best-games';
import { BestGamesTable } from '@/components/web/games/BestGamesTable';
import { BestSlotChips } from '@/components/web/games/BestSlotChips';
import { GameBoxArt } from '@/components/web/games/GameCard';

export const revalidate = 300;

const SITE_URL = 'https://streamertimes.tv';
const ITEMLIST_LIMIT = 20;

interface Props {
  params: Promise<{ locale: string }>;
}

// Failure-isolated loader (never throw during prerender — build-abort rule).
// The two calls degrade independently: without the catalog the rows render
// unlinked; without the ranking the page shows its warming state + noindex.
const loadBestGames = cache(async (): Promise<BestGameRow[]> => {
  const api = getPartnerApi();
  let hubCategories = new Set<string>();
  try {
    const games = await api.listGames({ limit: 500 });
    hubCategories = new Set(games.data.map((g) => g.category));
  } catch {
    // Rows render unlinked — still useful.
  }
  try {
    const resp = await api.listBestGamesToStream();
    return buildBestGameRows(resp.data, hubCategories);
  } catch {
    return [];
  }
});

export async function generateStaticParams() {
  // ISR-K1: SSG mode (build output `●`), locale variants on demand.
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  const rows = await loadBestGames();
  const url = `${SITE_URL}/best-games-to-stream`;
  // Top names are nightly-stable — safe for metadata (no churn).
  const topNames = rows.slice(0, 3).map((r) => r.category);
  const lead =
    topNames.length > 0
      ? `${topNames.join(', ')} lead right now. `
      : '';
  const meta: Metadata = {
    title: 'Best Games to Stream Right Now — Viewers vs Competition',
    description: `${lead}Categories ranked by viewers per live channel from hourly samples of tracked Twitch channels — find the games where an audience is easiest to reach. Updated daily.`,
    alternates: { canonical: url },
    openGraph: {
      title: 'Best games to stream right now',
      description: `${lead}Categories ranked by viewers per live channel, updated daily.`,
      url,
      siteName: 'Streamer Times',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Best games to stream right now',
      description: `${lead}Categories ranked by viewers per live channel, updated daily.`,
    },
  };
  if (!isBestGamesIndexable(rows.length)) {
    meta.robots = { index: false, follow: true };
  }
  return applyLocaleSeo(meta, locale, '/best-games-to-stream');
}

export default async function BestGamesToStreamPage() {
  const rows = await loadBestGames();
  const top3 = rows.slice(0, 3);
  const tableRows = rows;

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'Home', url: SITE_URL },
    { name: 'Best games to stream' },
  ]);
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Best games to stream right now',
    itemListElement: rows.slice(0, ITEMLIST_LIMIT).map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: r.category,
      ...(r.hasHub ? { url: `${SITE_URL}/game/${r.slug}` } : {}),
    })),
  };

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(breadcrumb) }}
      />
      {rows.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdHtml(itemList) }}
        />
      )}

      <p className="text-sm text-text-muted">
        <Link href="/games" className="hover:text-accent-cyan">
          Games
        </Link>{' '}
        / Best games to stream
      </p>

      <h1 className="mt-3 text-pretty text-3xl font-bold text-white md:text-4xl">
        Best games to stream right now
      </h1>
      <p className="mt-3 max-w-2xl text-text-secondary">
        Which games have viewers to spare? This ranking divides average
        concurrent viewers by the number of channels live at the same time —
        the higher the number, the easier it is for a new stream to be found.
        Based on the Twitch channels we track, updated daily.
      </p>

      {rows.length === 0 ? (
        <section
          aria-labelledby="warming-heading"
          className="mt-10 rounded-xl border border-border-default bg-background-elevated p-6"
        >
          <h2 id="warming-heading" className="text-lg font-bold text-white">
            This ranking is warming up
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-text-secondary">
            We are still collecting hourly viewer samples across categories.
            Data accrues automatically — check back in a few days.
          </p>
          <p className="mt-4 text-sm">
            <Link href="/games" className="text-accent-cyan hover:text-text-primary">
              ← Browse all games
            </Link>
          </p>
        </section>
      ) : (
        <>
          {top3.length === 3 && (
            <section aria-labelledby="top3-heading" className="mt-8">
              <h2 id="top3-heading" className="sr-only">
                Top 3 opportunities
              </h2>
              <ol className="grid gap-3 sm:grid-cols-3">
                {top3.map((row, i) => (
                  <li
                    key={row.category}
                    className="rounded-xl border border-border-default bg-background-elevated p-4"
                  >
                    <div className="flex items-start gap-3">
                      {row.boxArtUrl && (
                        <div className="w-14 flex-shrink-0">
                          <GameBoxArt
                            boxArtUrl={row.boxArtUrl}
                            name={row.category}
                            sizes="56px"
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-accent-cyan">#{i + 1}</p>
                        {row.hasHub ? (
                          <Link
                            href={`/game/${row.slug}`}
                            prefetch={false}
                            className="mt-0.5 block truncate font-semibold text-text-primary hover:text-accent-cyan"
                          >
                            {row.category}
                          </Link>
                        ) : (
                          <p className="mt-0.5 truncate font-semibold text-text-primary">
                            {row.category}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-text-secondary">
                          <span className="font-semibold text-accent-cyan">
                            {Math.round(row.score * 10) / 10}
                          </span>{' '}
                          viewers per live channel
                          {row.isTrending && (
                            <span className="ml-2 font-semibold text-accent-pink">
                              ▲ Trending
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    {row.bestSlot && (
                      <div className="mt-3">
                        <BestSlotChips slots={[row.bestSlot]} />
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section aria-labelledby="ranking-heading" className="mt-8">
            <h2 id="ranking-heading" className="text-xl font-bold text-white">
              All categories ranked
            </h2>
            <div className="mt-4">
              <BestGamesTable rows={tableRows} />
            </div>
          </section>

          <section aria-labelledby="methodology-heading" className="mt-10">
            <h2
              id="methodology-heading"
              className="text-sm font-semibold uppercase tracking-wider text-text-muted"
            >
              How this is measured
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-text-secondary">
              Hourly concurrent-viewer samples of tracked Twitch channels over
              the last 28 days, aggregated nightly. Only categories with at
              least 5 tracked channels are ranked. “Viewers / channel” divides
              average concurrent viewers by average concurrently live tracked
              channels. Numbers describe the channels we track, not all of
              Twitch, and skew toward established streamers — treat the
              ranking as a compass, not a guarantee.
            </p>
          </section>
        </>
      )}

      <p className="mt-12 border-t border-divider pt-6 text-sm text-text-secondary">
        <Link href="/games" className="text-accent-cyan hover:text-text-primary">
          ← All games &amp; categories
        </Link>
        {'  ·  '}
        <Link href="/rankings" className="text-accent-cyan hover:text-text-primary">
          Streamer rankings
        </Link>
      </p>
    </main>
  );
}
