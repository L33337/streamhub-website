import { cache } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getPartnerApi,
  type PublicGame,
  type PublicStreamSlot,
  type PublicStreamer,
} from '@/lib/server/partner-api';
import { buildBreadcrumbJsonLd, buildVideoGameJsonLd } from '@/lib/seo';
import { gameSlug, findGameBySlug } from '@/lib/game-slug';
import { isVideoGameCategory } from '@/lib/game-categories';
import { groupSlotsByUtcDate, utcDateLabel } from '@/lib/format/time';
import { formatCompactNumber } from '@/lib/format/number';
import {
  rankGameStreamers,
  topGameStreamerNames,
  formatNameList,
} from '@/lib/game-ranking';
import { isGameHubIndexable } from '@/lib/rankings';
import { DaySection } from '@/components/web/DaySection';
import { DayNavBar } from '@/components/web/DayNavBar';
import { LiveBadge, PlatformBadge } from '@/components/web/Badges';
import { InitialsAvatar } from '@/components/web/InitialsAvatar';
import { GameBoxArt } from '@/components/web/games/GameCard';
import { SlotCard } from '@/components/web/SlotCard';

export const revalidate = 300;

const SITE_URL = 'https://streamertimes.tv';

// "Most followed" ranking: fetch a few extra (some may have null follower_count
// and get filtered out), display the top 12. follower_count is refreshed daily,
// so a 1h data-cache revalidate keeps the extra call cheap (deduped with the
// streamer pages, which fetch the same streamer rows).
const RANK_FETCH_LIMIT = 16;
const RANK_DISPLAY_LIMIT = 12;

interface Props {
  params: Promise<{ slug: string }>;
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
    now,
  };

  let game: PublicGame | null;
  try {
    const games = await api.listGames({ limit: 500 });
    game = findGameBySlug(games.data, slug);
  } catch {
    return empty; // API unavailable → renders as notFound; ISR retries soon
  }
  if (!game) return empty;

  const oneYearAgo = new Date(now.getTime() - 365 * 86_400_000);
  const sixHoursFromNow = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 86_400_000);

  const [liveCall, upcomingCall, rankedCall] = await Promise.allSettled([
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
  ]);

  return {
    category: game.category,
    game,
    liveSlots: liveCall.status === 'fulfilled' ? liveCall.value.data : [],
    upcomingSlots: upcomingCall.status === 'fulfilled' ? upcomingCall.value.data : [],
    rankedStreamers: rankedCall.status === 'fulfilled' ? rankedCall.value.data : [],
    now,
  };
});

export async function generateStaticParams() {
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
  const { slug } = await params;
  const { category, game, liveSlots, upcomingSlots, rankedStreamers } =
    await loadGamePage(slug);
  if (!category) return { title: 'Game not found — StreamerTimes' };
  const url = `${SITE_URL}/game/${slug}`;
  // Coarse, slow-moving numbers only (streamer_count changes daily at most,
  // hours_28d nightly). NEVER live viewer counts here — hourly metadata churn
  // hurts SEO more than the numbers help.
  const count = game?.streamer_count;
  const titleCount = count && count > 0 ? ` (${count})` : '';
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
    title: `${category} Streamers${titleCount} — Live Now, Rankings & Schedule`,
    description: `Who are the most followed ${category} streamers? ${namesLead} who is live now, upcoming streams, and AI-predicted schedules across Twitch and YouTube.${hoursSentence}`,
    alternates: { canonical: url },
    openGraph: {
      title: `${category} streamers — live now, rankings & schedule`,
      description: `The most followed ${category} streamers${ogNames} live status and stream schedule on Twitch and YouTube.`,
      url,
      siteName: 'Streamer Times',
      type: 'website',
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
  return meta;
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
  const { category, game, liveSlots, upcomingSlots, rankedStreamers, now } =
    await loadGamePage(slug);
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
  // Structured list leads with the most-followed streamers, then the long tail.
  const itemListStreamers = [
    ...ranked.map((r) => ({ id: r.streamer.id, name: r.streamer.name })),
    ...moreStreamers.map((s) => ({ id: s.id, name: s.name })),
  ].slice(0, 20);
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />
      {videoGameJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(videoGameJsonLd) }}
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
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold text-white md:text-4xl">
            {category} streamers — live now &amp; schedule
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
        </div>
      </div>

      {liveSlots.length > 0 && (
        <section aria-labelledby="watching-now-heading" className="mt-8">
          <h2 id="watching-now-heading" className="text-xl font-bold text-white">
            Watching {category} now
          </h2>
          <ul className="mt-4 grid gap-3 lg:grid-cols-2" aria-label={`Live ${category} streams`}>
            {[...liveSlots]
              .sort((a, b) => (b.viewer_count ?? -1) - (a.viewer_count ?? -1))
              .map((slot) => (
                <li key={slot.id}>
                  <SlotCard slot={slot} />
                </li>
              ))}
          </ul>
        </section>
      )}

      {ranked.length > 0 && (
        <section aria-labelledby="most-followed-heading" className="mt-8">
          <h2 id="most-followed-heading" className="text-xl font-bold text-white">
            Most followed {category} streamers
          </h2>
          <div className="mt-4 overflow-x-auto rounded-xl bg-background-elevated p-1 gradient-border">
            <table className="w-full text-sm">
              <caption className="sr-only">
                {category} streamers ranked by follower count
              </caption>
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                  <th scope="col" className="px-3 py-2 font-semibold">
                    #
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Streamer
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">
                    Followers
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">
                    Avg viewers
                  </th>
                </tr>
              </thead>
              <tbody>
                {ranked.map(({ rank, streamer }) => {
                  const avg = streamer.avg_view_count;
                  return (
                    <tr key={streamer.id} className="border-t border-divider">
                      <td className="px-3 py-2 font-bold tabular-nums text-text-muted">
                        {rank}
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
                            <InitialsAvatar
                              name={streamer.name}
                              size={36}
                              className="shrink-0"
                            />
                          )}
                          <span className="flex min-w-0 flex-col">
                            <span className="flex items-center gap-2">
                              <span className="truncate font-semibold text-text-primary group-hover:text-accent-cyan">
                                {streamer.name}
                              </span>
                              {liveIds.has(streamer.id) && <LiveBadge />}
                            </span>
                            <span className="mt-1 flex flex-wrap items-center gap-1.5">
                              {streamer.platforms.map((p) => (
                                <PlatformBadge key={p} platform={p} size="sm" />
                              ))}
                            </span>
                          </span>
                        </Link>
                      </th>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums text-accent-cyan">
                        {formatCompactNumber(streamer.follower_count, 'en')}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-text-secondary">
                        {avg != null && avg > 0 ? formatCompactNumber(avg, 'en') : '—'}
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

      {moreStreamers.length > 0 && (
        <section aria-labelledby="streamers-heading" className="mt-10">
          <h2 id="streamers-heading" className="text-xl font-bold text-white">
            {ranked.length > 0
              ? `More ${category} streamers`
              : `Streamers who stream ${category}`}
          </h2>
          <ul
            className="mt-4 grid gap-3 sm:grid-cols-2"
            aria-label={
              ranked.length > 0
                ? `More ${category} streamers`
                : `Streamers who stream ${category}`
            }
          >
            {moreStreamers.map((s) => (
            <li key={s.id}>
              <Link
                href={`/streamer/${encodeURIComponent(s.id)}`}
                className="group flex items-center gap-3 rounded-xl border border-border-default bg-background-elevated p-3 transition-colors hover:border-accent-cyan/60 hover:bg-background-highlight"
              >
                {s.avatar ? (
                  <Image
                    src={s.avatar}
                    alt=""
                    width={48}
                    height={48}
                    unoptimized
                    className="shrink-0 rounded-full border border-border-default"
                  />
                ) : (
                  <InitialsAvatar name={s.name} size={48} className="shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
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

      {hasSchedule && (
        <section aria-label={`${category} stream schedule`} className="mt-10">
          <h2 className="text-xl font-bold text-white">
            Upcoming {category} streams
          </h2>
          <DayNavBar days={sevenDays} grouped={grouped} todayUtc={todayUtc} />
          {sevenDays.map((dateKey) => {
            const slots = grouped.get(dateKey) ?? [];
            if (slots.length === 0) return null;
            return (
              <DaySection
                key={dateKey}
                dateKey={dateKey}
                label={utcDateLabel(dateKey, todayUtc)}
                slots={slots}
              />
            );
          })}
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
