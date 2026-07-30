import { cache } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import {
  getPartnerApi,
  type PublicGame,
  type PublicStreamSlot,
  type PublicStreamer,
} from '@/lib/server/partner-api';
import { applyLocaleSeo, buildBreadcrumbJsonLd, buildVideoGameJsonLd, jsonLdHtml } from '@/lib/seo';
import { isUiLang, type UiLang } from '@/lib/i18n-core';
import { gameSlug, findGameBySlug } from '@/lib/game-slug';
import { isVideoGameCategory } from '@/lib/game-categories';
import { groupSlotsByUtcDate, utcDateLabel } from '@/lib/format/time';
import { formatCompactNumber } from '@/lib/format/number';
import {
  buildGameRankingRows,
  rankGameStreamers,
  topGameStreamerNames,
  formatNameList,
} from '@/lib/game-ranking';
import { isGameHubIndexable } from '@/lib/rankings';
import { schedulePlatforms } from '@/lib/game-schedule';
import { isUsableHistogram } from '@/lib/game-heatmap';
import { StreamTimesHeatmap } from '@/components/web/games/StreamTimesHeatmap';
import { FollowGameButton } from '@/components/web/games/FollowGameButton';
import { GameDaySection } from '@/components/web/games/GameDaySection';
import { ScheduleFilters } from '@/components/web/games/ScheduleFilters';
import { DayNavBar } from '@/components/web/DayNavBar';
import { LiveBadge, PlatformBadge } from '@/components/web/Badges';
import { InitialsAvatar } from '@/components/web/InitialsAvatar';
import { GameBoxArt } from '@/components/web/games/GameCard';
import { NextStreamTime } from '@/components/web/NextStreamTime';
import { SlotCard } from '@/components/web/SlotCard';
import { getNextSlotByStreamer } from '@/lib/server/next-streams';

export const revalidate = 300;

const SITE_URL = 'https://streamertimes.tv';

// "Most followed" ranking: fetch a few extra (some may have null follower_count
// and get filtered out), display the top 5. follower_count is refreshed daily,
// so a 1h data-cache revalidate keeps the extra call cheap (deduped with the
// streamer pages, which fetch the same streamer rows).
const RANK_FETCH_LIMIT = 16;
const RANK_DISPLAY_LIMIT = 5;
// "Watching {category} now": only the biggest live channels by viewer count —
// popular categories can have dozens of live slots, which buried the sections
// below.
const LIVE_DISPLAY_LIMIT = 4;
// UX round 2026-07-23: the live slots beyond the cap render inside a closed
// <details> expander (progressive disclosure keeps the section budget), itself
// capped so a mega-category can't inflate the HTML; the tail links to the full
// ranking, which carries live badges for everyone.
const LIVE_EXPAND_LIMIT = 20;

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

interface GamePageData {
  category: string | null;
  // Full games-list row: streamer_count plus the enrichment fields (box art,
  // live numbers, 28d stats, trend). Null when the slug is unknown.
  game: PublicGame | null;
  liveSlots: PublicStreamSlot[];
  upcomingSlots: PublicStreamSlot[];
  // Category's streamers ordered by follower_count (from the Partner API's
  // per-category ranking). Feeds the "Most followed" table; empty on API error.
  rankedStreamers: PublicStreamer[];
  // Related categories (roster overlap, nightly) filtered to catalog entries
  // that have a hub page — never emits internal 404 links. Feeds the
  // "Related games" chips (the internal mesh between game pages).
  related: { category: string; slug: string }[];
  // UTC weekday-hour histogram (168 minutes cells) for the "When is {game}
  // streamed?" heatmap; null while the aggregate warms up or on API error.
  hourHistogram: number[] | null;
  now: Date;
}

// Shared between generateMetadata and the page (React cache dedupes per request).
// Every Partner API call is failure-isolated: a transient API error (edge
// function restart, network blip) must degrade the page — never throw, because
// a thrown error during prerender aborts the ENTIRE production build (seen
// 2026-07-07: one gateway 404 during a secrets-driven function restart killed
// the deploy). ISR (revalidate 300) self-heals degraded pages within minutes.
const loadGamePage = cache(async (slug: string): Promise<GamePageData> => {
  const api = getPartnerApi();
  const now = new Date();
  const empty: GamePageData = {
    category: null,
    game: null,
    liveSlots: [],
    upcomingSlots: [],
    rankedStreamers: [],
    related: [],
    hourHistogram: null,
    now,
  };

  let game: PublicGame | null;
  let catalog: Set<string>;
  try {
    const games = await api.listGames({ limit: 500 });
    game = findGameBySlug(games.data, slug);
    catalog = new Set(games.data.map((g) => g.category));
  } catch {
    return empty; // API unavailable → renders as notFound; ISR retries soon
  }
  if (!game) return empty;

  // Same filter chain as /rankings/game/[slug]: only categories with a hub
  // page of their own, plus a self-reference guard.
  const currentCategory = game.category;
  const related = (game.related_categories ?? [])
    .filter((r) => r.category !== currentCategory && catalog.has(r.category))
    .map((r) => ({ category: r.category, slug: gameSlug(r.category) }))
    .filter((r) => r.slug.length > 0)
    .slice(0, 6);

  const oneYearAgo = new Date(now.getTime() - 365 * 86_400_000);
  const sixHoursFromNow = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 86_400_000);

  const [liveCall, upcomingCall, rankedCall, histogramCall] = await Promise.allSettled([
    api.listSchedules({
      category: game.category,
      status: ['live'],
      includeAlwaysOn: true,
      from: oneYearAgo.toISOString(),
      to: sixHoursFromNow.toISOString(),
      limit: 100,
    }),
    api.listSchedules({
      category: game.category,
      status: ['upcoming'],
      includePredictions: true,
      from: now.toISOString(),
      to: sevenDaysFromNow.toISOString(),
      limit: 200,
    }),
    // Per-category follower ranking (one cheap call; degrades to empty on error
    // or against an older API that doesn't know order='followers').
    api.listStreamers({
      category: game.category,
      order: 'followers',
      limit: RANK_FETCH_LIMIT,
      revalidate: 3600,
    }),
    // "When is {game} streamed?" heatmap — single-row lookup with the opt-in
    // histogram field (nightly aggregate; 1h data cache is plenty fresh).
    // Degrades to null against an older API that rejects the params.
    api.listGames({
      category: game.category,
      include: 'hour_histogram',
      limit: 1,
      revalidate: 3600,
    }),
  ]);

  let hourHistogram: number[] | null = null;
  if (histogramCall.status === 'fulfilled') {
    const value = histogramCall.value.data[0]?.hour_histogram;
    if (isUsableHistogram(value)) hourHistogram = value;
  }

  return {
    category: game.category,
    game,
    liveSlots: liveCall.status === 'fulfilled' ? liveCall.value.data : [],
    upcomingSlots: upcomingCall.status === 'fulfilled' ? upcomingCall.value.data : [],
    rankedStreamers: rankedCall.status === 'fulfilled' ? rankedCall.value.data : [],
    related,
    hourHistogram,
    now,
  };
});

export async function generateStaticParams({
  params,
}: {
  params: { locale: string };
}) {
  // M22: prebuild known slugs only for the English tree — the 11 other locale
  // variants render on demand (ISR, dynamicParams=true) so the build stays flat.
  if (params.locale !== 'en') return [];
  try {
    const resp = await getPartnerApi().listGames({ limit: 500 });
    return resp.data
      .map((g) => ({ slug: gameSlug(g.category) }))
      .filter((p) => p.slug.length > 0);
  } catch {
    // Backend unavailable at build → render on demand instead of failing the build.
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  const { category, game, liveSlots, upcomingSlots, rankedStreamers } =
    await loadGamePage(slug);
  if (!category) return { title: 'Game not found — StreamerTimes' };
  const url = `${SITE_URL}/game/${slug}`;
  // Coarse, slow-moving numbers only (streamer_count changes daily at most,
  // hours_28d nightly). NEVER live viewer counts here — hourly metadata churn
  // hurts SEO more than the numbers help.
  const hours = game?.hours_28d;
  const hoursSentence =
    hours != null && hours >= 10
      ? ` ~${formatCompactNumber(Math.round(hours), 'en')} hours streamed in the last 28 days.`
      : '';
  // Top names from the SAME ranking the visible "Most followed" table renders —
  // they target "streamer + game" searches. follower_count refreshes daily, so
  // the names are stable between crawls; when the ranking call degraded (or no
  // streamer has a usable follower count) the copy falls back to the nameless
  // variant instead of churning.
  const names = topGameStreamerNames(rankedStreamers, 3);
  const namesLead =
    names.length > 0
      ? `${formatNameList(names)} lead${names.length === 1 ? 's' : ''} the ranking — see`
      : `See ${category} streamers ranked by followers,`;
  const ogNames = names.length > 0 ? ` — ${formatNameList(names)} —` : ',';
  const meta: Metadata = {
    // No streamer count in the title: it changes daily → title churn on every
    // re-crawl, and the chars are better spent on the stable keywords.
    title: `${category} Streamers — Live Now, Rankings & Schedule`,
    description: `Who are the most followed ${category} streamers? ${namesLead} who is live now, upcoming streams, and AI-predicted schedules across Twitch and YouTube.${hoursSentence}`,
    alternates: { canonical: url },
    openGraph: {
      title: `${category} streamers — live now, rankings & schedule`,
      description: `The most followed ${category} streamers${ogNames} live status and stream schedule on Twitch and YouTube.`,
      url,
      siteName: 'Streamer Times',
      type: 'website',
    },
    // Without a page-level twitter block, X cards fall back to the root
    // layout's generic site title/image. Next auto-wires the colocated
    // opengraph-image as twitter:image once this block exists. Names only,
    // no live numbers (churn rule above).
    twitter: {
      card: 'summary_large_image',
      title: `${category} streamers — live now, rankings & schedule`,
      description: `The most followed ${category} streamers${ogNames} live status and stream schedule on Twitch and YouTube.`,
    },
  };
  // Site convention (lib/seo.ts, rankings pages): only set robots when gating
  // out; indexable pages inherit the root default.
  if (
    !isGameHubIndexable({
      streamerCount: game?.streamer_count ?? 0,
      liveCount: liveSlots.length,
      upcomingCount: upcomingSlots.length,
    })
  ) {
    meta.robots = { index: false, follow: true };
  }
  // M22 P3: en-only indexability matrix — pass-through for 'en', noindex,follow
  // + self-canonical for every other locale variant.
  return applyLocaleSeo(meta, locale, `/game/${slug}`);
}

interface GameStreamer {
  id: string;
  name: string;
  avatar: string | null;
  platforms: PublicStreamSlot['platforms'];
  isLive: boolean;
}

export default async function GamePage({ params }: Props) {
  const { slug } = await params;
  const {
    category,
    game,
    liveSlots,
    upcomingSlots,
    rankedStreamers,
    related,
    hourHistogram,
    now,
  } = await loadGamePage(slug);
  if (!category || !game) notFound();

  // Dedupe streamers across live + upcoming; live first, then alphabetical.
  const liveIds = new Set(liveSlots.map((s) => s.streamer_id));
  const byId = new Map<string, GameStreamer>();
  for (const s of [...liveSlots, ...upcomingSlots]) {
    if (!byId.has(s.streamer_id)) {
      byId.set(s.streamer_id, {
        id: s.streamer_id,
        name: s.streamer_name,
        avatar: s.avatar_url,
        platforms: s.platforms,
        isLive: liveIds.has(s.streamer_id),
      });
    }
  }
  const streamers = [...byId.values()].sort(
    (a, b) => Number(b.isLive) - Number(a.isLive) || a.name.localeCompare(b.name),
  );
  const liveCount = liveIds.size;

  // "Most followed {category} streamers" ranking (per-category follower ranking
  // from the Partner API). Excludes null/0-follower streamers, top N by
  // followers. The roster grid below becomes the long tail — this-week
  // streamers NOT already in the table — so no streamer is listed twice.
  const ranked = rankGameStreamers(rankedStreamers, RANK_DISPLAY_LIMIT);
  const rankedIds = new Set(ranked.map((r) => r.streamer.id));
  const moreStreamers = streamers.filter((s) => !rankedIds.has(s.id));
  const topStreamer = ranked[0]?.streamer ?? null;

  // UX round 2026-07-23: the ranking table reuses the /rankings/game/[slug]
  // view model — live status, earliest next stream and 28d hours per row all
  // derive from data already fetched for this page.
  //
  // "Next stream" means "when is this streamer next live", INDEPENDENT of game:
  // the category-filtered upcomingSlots above only carry slots predicted for
  // THIS category, so a top-follower streamer whose next stream is a different
  // game (e.g. KaiCenat on /game/just-chatting) would show a blank cell despite
  // a valid prediction. Fetch the earliest upcoming slot per ranked streamer
  // WITHOUT a category filter, matching the /rankings/most-followed leaderboard.
  const nextStreamByStreamer = await getNextSlotByStreamer(
    ranked.map((r) => r.streamer.id),
  );
  const rankingRows = buildGameRankingRows(ranked, liveSlots, [
    ...nextStreamByStreamer.values(),
  ]);

  // Live section: top slots by viewers stay visible, the rest collapses.
  const sortedLive = [...liveSlots].sort(
    (a, b) => (b.viewer_count ?? -1) - (a.viewer_count ?? -1),
  );
  const liveShown = sortedLive.slice(0, LIVE_DISPLAY_LIMIT);
  const liveMore = sortedLive.slice(
    LIVE_DISPLAY_LIMIT,
    LIVE_DISPLAY_LIMIT + LIVE_EXPAND_LIMIT,
  );
  const liveOverflow = sortedLive.length - LIVE_DISPLAY_LIMIT - liveMore.length;

  // Quiet category: nothing live and nothing scheduled — the page renders an
  // explanatory empty state with the related-games chips pulled into it.
  const isQuiet = liveSlots.length === 0 && upcomingSlots.length === 0;

  // Schedule grid (upcoming only, grouped by UTC date) — same shape as the
  // streamer page so it can reuse DayNavBar + DaySection. Live slots have
  // their own "Watching now" section above and would duplicate here.
  const todayUtc = now.toISOString().slice(0, 10);
  const grouped = groupSlotsByUtcDate(upcomingSlots);
  const sevenDays: string[] = [];
  for (let i = 0; i < 7; i++) {
    sevenDays.push(new Date(now.getTime() + i * 86_400_000).toISOString().slice(0, 10));
  }
  const hasSchedule = upcomingSlots.length > 0;
  // Day sections that actually render — the ranking's "Next stream" cell only
  // deep-links days the schedule shows (a slot exactly on the 7-day boundary
  // can carry an 8th UTC date that has no section).
  const renderedDayKeys = new Set(
    sevenDays.filter((d) => (grouped.get(d)?.length ?? 0) > 0),
  );

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'Home', url: SITE_URL },
    { name: 'Games', url: `${SITE_URL}/games` },
    { name: category },
  ]);
  // VideoGame structured data ONLY for actual video games — "Just Chatting" /
  // IRL-style categories keep Breadcrumb + ItemList only.
  const videoGameJsonLd = isVideoGameCategory(category)
    ? buildVideoGameJsonLd({
        name: category,
        url: `${SITE_URL}/game/${slug}`,
        imageUrl: game.box_art_url,
      })
    : null;
  // Structured list mirrors exactly what the page renders: the ranking table
  // when there is one, otherwise the roster grid (which is only shown as a
  // fallback for categories with no follower data).
  const itemListStreamers = (
    ranked.length > 0
      ? ranked.map((r) => ({ id: r.streamer.id, name: r.streamer.name }))
      : moreStreamers.map((s) => ({ id: s.id, name: s.name }))
  ).slice(0, 20);
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Streamers who stream ${category}`,
    itemListElement: itemListStreamers.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: s.name,
      url: `${SITE_URL}/streamer/${encodeURIComponent(s.id)}`,
    })),
  };

  // Headline numbers are derived from exactly what's rendered below (the live +
  // upcoming streamers/slots), so they always match the list. We deliberately do
  // NOT use the games-endpoint streamer_count here: that counts a 28-day catalog
  // window, which would overstate how many streamers are actually shown.
  const shown = streamers.length;
  // Honest superlative line — derived ONLY from the rendered ranking (its #1),
  // never fabricated. Omitted entirely when the ranking is empty.
  const topFollowerNoun = topStreamer?.platforms.includes('twitch')
    ? 'followers'
    : 'subscribers';
  const superlative =
    topStreamer && topStreamer.follower_count != null
      ? ` The most-followed ${category} streamer here is ${topStreamer.name} with ${formatCompactNumber(topStreamer.follower_count, 'en')} ${topFollowerNoun}.`
      : '';
  const intro =
    `${shown} streamer${shown === 1 ? '' : 's'} ${shown === 1 ? 'has' : 'have'} ${category} streams live or scheduled this week on Twitch and YouTube. ` +
    (liveCount > 0
      ? `${liveCount} ${liveCount === 1 ? 'is' : 'are'} live right now`
      : 'None are live right now') +
    (upcomingSlots.length > 0
      ? `, with ${upcomingSlots.length} upcoming stream${upcomingSlots.length === 1 ? '' : 's'} in the next 7 days.`
      : '.') +
    superlative;

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(itemList) }}
      />
      {videoGameJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdHtml(videoGameJsonLd) }}
        />
      )}

      <p className="text-sm text-text-muted">
        <Link href="/games" className="hover:text-accent-cyan">
          Games
        </Link>{' '}
        / {category}
      </p>

      <div className="mt-3 flex items-start gap-4 sm:gap-6">
        {game.box_art_url && (
          <div className="w-24 flex-shrink-0 sm:w-32">
            <GameBoxArt
              boxArtUrl={game.box_art_url}
              name={category}
              sizes="(min-width: 640px) 128px, 96px"
              priority
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          {/* One interpolated string, not `{category} text`: adjacent JSX
              children render as separate text nodes and the leading space of
              the second one is lost, which shipped "VALORANTstreamers". */}
          <h1 className="text-pretty text-3xl font-bold text-white md:text-4xl">
            {`${category} streamers — live now & schedule`}
          </h1>
          <p className="mt-3 max-w-2xl text-text-secondary">{intro}</p>
          {/* Stats chips — every chip conditional on its (nullable) field. */}
          <ul className="mt-3 flex flex-wrap gap-2 text-xs" aria-label={`${category} statistics`}>
            <li className="rounded-full border border-border-default bg-background-elevated px-2.5 py-1 text-text-secondary">
              <span className="font-semibold text-text-primary">{game.streamer_count}</span>{' '}
              streamer{game.streamer_count === 1 ? '' : 's'}
            </li>
            {liveCount > 0 && (
              <li className="rounded-full border border-live/40 bg-background-elevated px-2.5 py-1 text-live">
                <span className="font-semibold">{liveCount}</span> live now
                {game.live_viewer_total != null && (
                  <>
                    {' '}
                    · <span className="font-semibold">
                      {formatCompactNumber(game.live_viewer_total, 'en')}
                    </span>{' '}
                    watching
                  </>
                )}
              </li>
            )}
            {game.hours_28d != null && game.hours_28d > 0 && (
              <li className="rounded-full border border-border-default bg-background-elevated px-2.5 py-1 text-text-secondary">
                <span className="font-semibold text-text-primary">
                  {formatCompactNumber(Math.round(game.hours_28d), 'en')}h
                </span>{' '}
                streamed / 28d
              </li>
            )}
            {game.streams_28d != null && game.streams_28d > 0 && (
              <li className="rounded-full border border-border-default bg-background-elevated px-2.5 py-1 text-text-secondary">
                <span className="font-semibold text-text-primary">{game.streams_28d}</span>{' '}
                streams / 28d
              </li>
            )}
            {game.peak_viewer_28d != null && game.peak_viewer_28d > 0 && (
              <li className="rounded-full border border-border-default bg-background-elevated px-2.5 py-1 text-text-secondary">
                Peak{' '}
                <span className="font-semibold text-text-primary">
                  {formatCompactNumber(game.peak_viewer_28d, 'en')}
                </span>{' '}
                viewers / 28d
              </li>
            )}
            {game.trend_delta_percent != null && (
              <li
                className={`rounded-full border border-border-default bg-background-elevated px-2.5 py-1 font-semibold ${
                  game.trend_delta_percent >= 0 ? 'text-live' : 'text-accent-pink'
                }`}
                title="Week-over-week change in active streamers"
              >
                {game.trend_delta_percent >= 0 ? '▲' : '▼'}{' '}
                {Math.abs(game.trend_delta_percent)}% this week
              </li>
            )}
          </ul>
          <FollowGameButton category={category} />
        </div>
      </div>

      {(liveSlots.length > 0 ||
        ranked.length > 0 ||
        hasSchedule ||
        (related.length > 0 && !isQuiet)) && (
        <nav aria-label="On this page" className="mt-5 flex flex-wrap gap-2 text-xs">
          {liveSlots.length > 0 && (
            <a href="#watching-now" className="rounded-full border border-border-default bg-background-elevated px-3 py-1 text-text-secondary transition-colors hover:border-accent-cyan/60 hover:text-accent-cyan">
              Live now
            </a>
          )}
          {ranked.length > 0 && (
            <a href="#most-followed" className="rounded-full border border-border-default bg-background-elevated px-3 py-1 text-text-secondary transition-colors hover:border-accent-cyan/60 hover:text-accent-cyan">
              Top streamers
            </a>
          )}
          {hourHistogram && (
            <a href="#stream-times" className="rounded-full border border-border-default bg-background-elevated px-3 py-1 text-text-secondary transition-colors hover:border-accent-cyan/60 hover:text-accent-cyan">
              Best times
            </a>
          )}
          {hasSchedule && (
            <a href="#schedule" className="rounded-full border border-border-default bg-background-elevated px-3 py-1 text-text-secondary transition-colors hover:border-accent-cyan/60 hover:text-accent-cyan">
              Schedule
            </a>
          )}
          {related.length > 0 && !isQuiet && (
            <a href="#related-games" className="rounded-full border border-border-default bg-background-elevated px-3 py-1 text-text-secondary transition-colors hover:border-accent-cyan/60 hover:text-accent-cyan">
              Related games
            </a>
          )}
        </nav>
      )}

      {liveSlots.length > 0 && (
        <section
          aria-labelledby="watching-now-heading"
          id="watching-now"
          className="mt-8 scroll-mt-[calc(var(--header-height)+1.5rem)]"
        >
          <h2 id="watching-now-heading" className="text-xl font-bold text-white">
            Watching {category} now
          </h2>
          <ul className="mt-4 grid gap-3 lg:grid-cols-2" aria-label={`Live ${category} streams`}>
            {liveShown.map((slot) => (
              <li key={slot.id}>
                <SlotCard slot={slot} />
              </li>
            ))}
          </ul>
          {liveMore.length > 0 && (
            <details className="group mt-3">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg border border-border-default/60 bg-background-elevated/40 px-3 py-2 text-sm text-text-muted transition-colors hover:border-accent-cyan/60 hover:text-accent-cyan [&::-webkit-details-marker]:hidden">
                <ChevronRight
                  size={14}
                  aria-hidden="true"
                  className="shrink-0 transition-transform group-open:rotate-90"
                />
                Show {liveMore.length} more live channel{liveMore.length === 1 ? '' : 's'}
              </summary>
              <ul
                className="mt-3 grid gap-3 lg:grid-cols-2"
                aria-label={`More live ${category} streams`}
              >
                {liveMore.map((slot) => (
                  <li key={slot.id}>
                    <SlotCard slot={slot} />
                  </li>
                ))}
              </ul>
              {liveOverflow > 0 && (
                <p className="mt-2 text-xs">
                  <Link
                    href={`/rankings/game/${slug}`}
                    className="text-accent-cyan hover:text-text-primary"
                  >
                    {liveOverflow} more live in the full {category} ranking →
                  </Link>
                </p>
              )}
            </details>
          )}
          <p className="mt-2 text-xs text-text-muted">
            Live status and viewer counts update every few minutes.
          </p>
        </section>
      )}

      {ranked.length > 0 && (
        <section
          aria-labelledby="most-followed-heading"
          id="most-followed"
          className="mt-8 scroll-mt-[calc(var(--header-height)+1.5rem)]"
        >
          <h2 id="most-followed-heading" className="text-xl font-bold text-white">
            Most followed {category} streamers
          </h2>
          <div className="mt-4 overflow-x-auto rounded-xl bg-background-elevated p-1 gradient-border">
            <table className="w-full text-sm">
              <caption className="sr-only">
                {category} streamers ranked by follower count, with their next
                expected stream
              </caption>
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                  <th scope="col" className="px-3 py-2 font-semibold">
                    #
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Streamer
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Next stream
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">
                    Followers
                  </th>
                  <th scope="col" className="hidden px-3 py-2 text-right font-semibold sm:table-cell">
                    Hours / 28d
                  </th>
                </tr>
              </thead>
              <tbody>
                {rankingRows.map((row) => {
                  const nextDay = row.nextStreamAt?.slice(0, 10) ?? null;
                  const nextLabel = row.nextStreamAt ? (
                    <span className="flex flex-col leading-tight">
                      <NextStreamTime
                        startTime={row.nextStreamAt}
                        isPredicted={row.nextIsPredicted}
                      />
                      {row.nextCategory && (
                        <span
                          className="mt-0.5 max-w-[9rem] truncate text-[11px] text-text-muted"
                          title={row.nextCategory}
                        >
                          {row.nextCategory}
                        </span>
                      )}
                    </span>
                  ) : null;
                  return (
                    <tr key={row.id} className="border-t border-divider">
                      <td className="px-3 py-2 font-bold tabular-nums text-text-muted">
                        {row.rank}
                      </td>
                      <th scope="row" className="px-3 py-2 text-left font-medium">
                        <Link
                          href={`/streamer/${encodeURIComponent(row.id)}`}
                          className="group flex items-center gap-3"
                        >
                          {row.avatarUrl ? (
                            <Image
                              src={row.avatarUrl}
                              alt={row.name}
                              width={36}
                              height={36}
                              unoptimized
                              className="shrink-0 rounded-full border border-border-default"
                            />
                          ) : (
                            <InitialsAvatar
                              name={row.name}
                              size={36}
                              className="shrink-0"
                            />
                          )}
                          <span className="flex min-w-0 flex-col">
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="truncate font-semibold text-text-primary group-hover:text-accent-cyan">
                                {row.name}
                              </span>
                              {row.isLive && <LiveBadge />}
                            </span>
                            <span className="mt-1 flex flex-wrap items-center gap-1.5">
                              {row.platforms.map((p) => (
                                <PlatformBadge key={p} platform={p} size="sm" />
                              ))}
                            </span>
                          </span>
                        </Link>
                      </th>
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-text-secondary">
                        {row.isLive ? (
                          <a
                            href="#watching-now"
                            className="font-semibold text-live hover:underline"
                          >
                            Live now
                          </a>
                        ) : nextDay && renderedDayKeys.has(nextDay) ? (
                          <a href={`#day-${nextDay}`} className="hover:text-accent-cyan">
                            {nextLabel}
                          </a>
                        ) : (
                          nextLabel ?? '—'
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums text-accent-cyan">
                        {formatCompactNumber(row.followerCount, 'en')}
                      </td>
                      <td className="hidden px-3 py-2 text-right tabular-nums text-text-secondary sm:table-cell">
                        {row.hours28d != null && row.hours28d > 0
                          ? `${formatCompactNumber(Math.round(row.hours28d), 'en')}h`
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm">
            <Link
              href={`/rankings/game/${slug}`}
              className="text-accent-cyan hover:text-text-primary"
            >
              See the full {category} ranking (top 50) →
            </Link>
          </p>
        </section>
      )}

      {ranked.length === 0 && moreStreamers.length > 0 && (
        <section aria-labelledby="streamers-heading" className="mt-10">
          <h2 id="streamers-heading" className="text-xl font-bold text-white">
            Streamers who stream {category}
          </h2>
          <ul
            className="mt-4 grid gap-3 sm:grid-cols-2"
            aria-label={`Streamers who stream ${category}`}
          >
            {moreStreamers.map((s) => (
            <li key={s.id} className="min-w-0">
              <Link
                href={`/streamer/${encodeURIComponent(s.id)}`}
                className="group flex items-center gap-3 rounded-xl border border-border-default bg-background-elevated p-3 transition-colors hover:border-accent-cyan/60 hover:bg-background-highlight"
              >
                {s.avatar ? (
                  <Image
                    src={s.avatar}
                    alt={s.name}
                    width={48}
                    height={48}
                    unoptimized
                    className="shrink-0 rounded-full border border-border-default"
                  />
                ) : (
                  <InitialsAvatar name={s.name} size={48} className="shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-semibold text-text-primary group-hover:text-accent-cyan">
                      {s.name}
                    </span>
                    {s.isLive && <LiveBadge />}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {s.platforms.map((p) => (
                      <PlatformBadge key={p} platform={p} />
                    ))}
                  </div>
                </div>
              </Link>
            </li>
          ))}
          </ul>
        </section>
      )}

      {hourHistogram && (
        <section
          aria-labelledby="stream-times-heading"
          id="stream-times"
          className="mt-8 scroll-mt-[calc(var(--header-height)+1.5rem)]"
        >
          <h2 id="stream-times-heading" className="text-xl font-bold text-white">
            When is {category} streamed?
          </h2>
          <StreamTimesHeatmap category={category} histogram={hourHistogram} />
        </section>
      )}

      {isQuiet && (
        <section
          aria-labelledby="quiet-heading"
          className="mt-10 rounded-xl border border-border-default bg-background-elevated p-6"
        >
          <h2 id="quiet-heading" className="text-lg font-bold text-white">
            No {category} streams right now
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-text-secondary">
            None of the {category} streamers we track are live or expected in
            the next 7 days. Schedules and AI predictions refresh several times
            a day — check back soon.
          </p>
          {related.length > 0 && (
            <>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-text-muted">
                In the meantime
              </p>
              <ul className="mt-2 flex flex-wrap gap-2" aria-label="Related games">
                {related.map((r) => (
                  <li key={r.category}>
                    <Link
                      href={`/game/${r.slug}`}
                      prefetch={false}
                      className="inline-block rounded-full border border-border-default bg-background px-4 py-1.5 text-sm text-text-primary transition-colors hover:border-accent-cyan/60 hover:text-accent-cyan"
                    >
                      {r.category} streamers
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="mt-4 text-sm">
            <Link href="/live" className="text-accent-cyan hover:text-text-primary">
              See who&apos;s live now →
            </Link>
            {'  ·  '}
            <Link href="/games" className="text-accent-cyan hover:text-text-primary">
              Browse all games
            </Link>
          </p>
        </section>
      )}

      {hasSchedule && (
        <section
          aria-label={`${category} stream schedule`}
          id="schedule"
          className="mt-10 scroll-mt-[calc(var(--header-height)+1.5rem)]"
        >
          <h2 className="text-xl font-bold text-white">
            Upcoming {category} streams
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            Times adjust to your local timezone, with the streamer&apos;s own
            time alongside. Days follow the UTC calendar, so a late-night
            stream can appear under the next day.
          </p>
          <ScheduleFilters
            platforms={schedulePlatforms(upcomingSlots)}
            hasLow={upcomingSlots.some(
              (s) => s.confidence === 'low' && s.slot_kind !== 'cancelled',
            )}
          >
            {/* No `language` prop on purpose: this whole page still renders
                English chrome (M22 P4 localizes the game hub as one piece), and
                German day headings under English section titles would read
                worse than consistent English. The viewer-local "Today" fix in
                DayNavBar/DayLabel is language-independent and applies anyway. */}
            <DayNavBar days={sevenDays} grouped={grouped} todayUtc={todayUtc} />
            {sevenDays.map((dateKey) => {
              const slots = grouped.get(dateKey) ?? [];
              if (slots.length === 0) return null;
              return (
                <GameDaySection
                  key={dateKey}
                  dateKey={dateKey}
                  label={utcDateLabel(dateKey, todayUtc)}
                  slots={slots}
                />
              );
            })}
          </ScheduleFilters>
        </section>
      )}

      {related.length > 0 && !isQuiet && (
        <section
          aria-labelledby="related-games-heading"
          id="related-games"
          className="mt-12 scroll-mt-[calc(var(--header-height)+1.5rem)]"
        >
          <h2
            id="related-games-heading"
            className="text-sm font-semibold uppercase tracking-wider text-text-muted"
          >
            Related games
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Related games">
            {related.map((r) => (
              <li key={r.category}>
                <Link
                  href={`/game/${r.slug}`}
                  prefetch={false}
                  className="inline-block rounded-full border border-border-default bg-background-elevated px-4 py-1.5 text-sm text-text-primary transition-colors hover:border-accent-cyan/60 hover:text-accent-cyan"
                >
                  {r.category} streamers
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-text-muted">
            Games with overlapping streamer rosters in the last 28 days.
          </p>
        </section>
      )}

      <p className="mt-12 border-t border-divider pt-6 text-sm text-text-secondary">
        <Link href="/games" className="text-accent-cyan hover:text-text-primary">
          ← All games &amp; categories
        </Link>
        {'  ·  '}
        <Link href="/streamers" className="text-accent-cyan hover:text-text-primary">
          Browse all streamers A–Z
        </Link>
      </p>
    </main>
  );
}
