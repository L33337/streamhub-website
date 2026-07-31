import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPartnerApi, type GameTiming, type PublicGame } from '@/lib/server/partner-api';
import { applyLocaleSeo, buildBreadcrumbJsonLd, jsonLdHtml } from '@/lib/seo';
import { isUiLang, type UiLang } from '@/lib/i18n-core';
import { findGameBySlug } from '@/lib/game-slug';
import {
  MIN_INDEXABLE_TIMING_STREAMERS,
  TIMING_DAY_NAMES,
  buildRampView,
  isUsableTimingSeries,
} from '@/lib/game-timing';
import { BestTimeHeatmap } from '@/components/web/games/BestTimeHeatmap';
import { BestSlotChips } from '@/components/web/games/BestSlotChips';
import { RampBars } from '@/components/web/games/RampBars';
import { GameBoxArt } from '@/components/web/games/GameCard';

export const revalidate = 300;

const SITE_URL = 'https://streamertimes.tv';

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

interface BestTimePageData {
  category: string | null;
  game: PublicGame | null;
  timing: GameTiming | null;
  /** Passes the tracked-streamers gate AND has usable heatmap series. */
  usable: boolean;
}

// Same failure-isolation rule as the game hub loader: NEVER throw during
// prerender (a thrown error aborts the whole production build); ISR self-heals
// degraded pages within minutes.
const loadBestTime = cache(async (slug: string): Promise<BestTimePageData> => {
  const api = getPartnerApi();
  const empty: BestTimePageData = { category: null, game: null, timing: null, usable: false };

  let game: PublicGame | null;
  try {
    const games = await api.listGames({ limit: 500 });
    game = findGameBySlug(games.data, slug);
  } catch {
    return empty;
  }
  if (!game) return empty;

  let timing: GameTiming | null = null;
  try {
    const rows = await api.listGames({
      category: game.category,
      include: 'timing',
      limit: 1,
      revalidate: 3600,
    });
    timing = rows.data[0]?.timing ?? null;
  } catch {
    timing = null; // older API / blip → warming state
  }

  const usable =
    !!timing &&
    (timing.tracked_streamers ?? 0) >= MIN_INDEXABLE_TIMING_STREAMERS &&
    isUsableTimingSeries(timing.viewers_histogram) &&
    isUsableTimingSeries(timing.streamers_histogram);

  return { category: game.category, game, timing, usable };
});

export async function generateStaticParams() {
  // ISR-K1: the export itself puts the route in SSG mode (build output `●`);
  // variants render on demand. No prebuild — the parent hub already prebuilds
  // its slugs, and doubling that for a subpage would double the build.
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  const { category, timing, usable } = await loadBestTime(slug);
  if (!category) return { title: 'Game not found — StreamerTimes' };
  const url = `${SITE_URL}/game/${slug}/best-time`;

  // Metadata must be timezone-neutral AND slow-moving: the top slot comes
  // from the nightly aggregate (UTC label, changes rarely) — never live
  // numbers here.
  const top = usable ? timing?.best_slots?.[0] : null;
  const slotSentence = top
    ? ` Data says ${TIMING_DAY_NAMES[top.dow]} around ${String(top.hour).padStart(2, '0')}:00 UTC works best right now.`
    : '';
  const meta: Metadata = {
    title: `Best Time to Stream ${category} — Viewers vs Competition`,
    description: `When should you stream ${category}? Weekly heatmap of viewer demand vs live-channel competition from hourly samples of tracked Twitch channels.${slotSentence}`,
    alternates: { canonical: url },
    openGraph: {
      title: `Best time to stream ${category}`,
      description: `Weekly viewer-demand vs competition heatmap for ${category}, from tracked Twitch channels.`,
      url,
      siteName: 'Streamer Times',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Best time to stream ${category}`,
      description: `Weekly viewer-demand vs competition heatmap for ${category}, from tracked Twitch channels.`,
    },
  };
  // Thin gate: below the tracked-streamers threshold (or while the nightly
  // aggregate warms up) the page renders its warming state and stays out of
  // the index. Flips automatically once data matures.
  if (!usable) {
    meta.robots = { index: false, follow: true };
  }
  // en-only indexable (game-page convention); other locales noindex+follow.
  return applyLocaleSeo(meta, locale, `/game/${slug}/best-time`);
}

export default async function BestTimePage({ params }: Props) {
  const { slug } = await params;
  const { category, game, timing, usable } = await loadBestTime(slug);
  if (!category || !game) notFound();

  const bestSlots = (usable ? timing?.best_slots : null) ?? [];
  const ramp = usable ? buildRampView(timing?.ramp_curve) : null;
  const tracked = timing?.tracked_streamers ?? 0;
  const isTrending = timing?.is_trending === true;

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'Home', url: SITE_URL },
    { name: 'Games', url: `${SITE_URL}/games` },
    { name: category, url: `${SITE_URL}/game/${slug}` },
    { name: 'Best time to stream' },
  ]);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(breadcrumb) }}
      />

      <p className="text-sm text-text-muted">
        <Link href="/games" className="hover:text-accent-cyan">
          Games
        </Link>{' '}
        /{' '}
        <Link href={`/game/${slug}`} className="hover:text-accent-cyan">
          {category}
        </Link>{' '}
        / Best time to stream
      </p>

      <div className="mt-3 flex items-start gap-4 sm:gap-6">
        {game.box_art_url && (
          <div className="hidden w-24 flex-shrink-0 sm:block">
            <GameBoxArt
              boxArtUrl={game.box_art_url}
              name={category}
              sizes="96px"
              priority
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-pretty text-3xl font-bold text-white md:text-4xl">
            {`Best time to stream ${category}`}
          </h1>
          {isTrending && (
            <p className="mt-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-accent-pink/40 bg-background-elevated px-2.5 py-1 text-xs font-semibold text-accent-pink">
                ▲ Trending on Twitch this week
              </span>
            </p>
          )}
          <p className="mt-3 max-w-2xl text-text-secondary">
            When do {category} viewers outnumber {category} streamers? The heatmap
            below compares hourly viewer demand with live-channel competition —
            the brightest cells are the windows where a new stream has the best
            chance of being found.
          </p>
        </div>
      </div>

      {usable && timing ? (
        <>
          {bestSlots.length > 0 && (
            <section aria-labelledby="top-slots-heading" className="mt-8">
              <h2 id="top-slots-heading" className="text-xl font-bold text-white">
                Top windows this month
              </h2>
              <div className="mt-3">
                <BestSlotChips slots={bestSlots} />
              </div>
            </section>
          )}

          <section aria-labelledby="heatmap-heading" className="mt-8">
            <h2 id="heatmap-heading" className="text-xl font-bold text-white">
              Weekly opportunity heatmap
            </h2>
            <BestTimeHeatmap
              category={category}
              viewersHistogram={timing.viewers_histogram as (number | null)[]}
              streamersHistogram={timing.streamers_histogram as (number | null)[]}
              daysHistogram={
                isUsableTimingSeries(timing.days_histogram)
                  ? timing.days_histogram
                  : null
              }
            />
          </section>

          {ramp && (
            <section aria-labelledby="ramp-heading" className="mt-10">
              <h2 id="ramp-heading" className="text-xl font-bold text-white">
                How long do {category} streams take to peak?
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-text-secondary">
                Median concurrent viewers by hour into the stream across tracked{' '}
                {category} channels
                {ramp.peakHour !== null && (
                  <>
                    {' — '}
                    <span className="font-semibold text-text-primary">
                      viewership typically peaks in hour {ramp.peakHour}
                    </span>
                  </>
                )}
                . Streams shorter than that often end before their audience
                arrives.
              </p>
              <div className="mt-4 max-w-2xl">
                <RampBars primary={ramp.cells} primaryLabel={category} />
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
              Based on hourly concurrent-viewer samples of{' '}
              <span className="font-semibold text-text-primary">
                {tracked} tracked {category} channel{tracked === 1 ? '' : 's'}
              </span>{' '}
              on Twitch over the last 28 days
              {timing.sample_count != null && (
                <> ({timing.sample_count.toLocaleString('en-US')} samples)</>
              )}
              . Cells observed on fewer than 2 distinct days show as “no data” —
              a sampling gap is not the same as an empty timeslot. Numbers
              describe the channels we track, not all of Twitch, and skew
              toward established streamers.
            </p>
          </section>
        </>
      ) : (
        <section
          aria-labelledby="warming-heading"
          className="mt-10 rounded-xl border border-border-default bg-background-elevated p-6"
        >
          <h2 id="warming-heading" className="text-lg font-bold text-white">
            This analysis is warming up
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-text-secondary">
            We need hourly viewer samples from at least{' '}
            {MIN_INDEXABLE_TIMING_STREAMERS} tracked {category} channels before
            the timing heatmap says anything useful. Data accrues automatically —
            check back in a few days.
          </p>
          <p className="mt-4 text-sm">
            <Link href={`/game/${slug}`} className="text-accent-cyan hover:text-text-primary">
              ← Back to {category} streamers
            </Link>
          </p>
        </section>
      )}

      <p className="mt-12 border-t border-divider pt-6 text-sm text-text-secondary">
        <Link href={`/game/${slug}`} className="text-accent-cyan hover:text-text-primary">
          {/* One interpolated string — adjacent JSX text nodes drop the space
              (the documented "VALORANTstreamers" bug). */}
          {`← ${category} streamers & schedule`}
        </Link>
        {'  ·  '}
        <Link href="/best-games-to-stream" className="text-accent-cyan hover:text-text-primary">
          Best games to stream right now
        </Link>
        {'  ·  '}
        <Link href={`/rankings/game/${slug}`} className="text-accent-cyan hover:text-text-primary">
          {category} ranking
        </Link>
      </p>
    </main>
  );
}
