import { cache } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPartnerApi, type PublicStreamSlot } from '@/lib/server/partner-api';
import { buildBreadcrumbJsonLd } from '@/lib/seo';
import { gameSlug, findGameBySlug } from '@/lib/game-slug';
import { groupSlotsByUtcDate, utcDateLabel } from '@/lib/format/time';
import { DaySection } from '@/components/web/DaySection';
import { DayNavBar } from '@/components/web/DayNavBar';
import { LiveBadge, PlatformBadge } from '@/components/web/Badges';
import { InitialsAvatar } from '@/components/web/InitialsAvatar';

export const revalidate = 300;

const SITE_URL = 'https://streamertimes.tv';

interface Props {
  params: Promise<{ slug: string }>;
}

interface GamePageData {
  category: string | null;
  streamerCount: number;
  liveSlots: PublicStreamSlot[];
  upcomingSlots: PublicStreamSlot[];
  now: Date;
}

// Shared between generateMetadata and the page (React cache dedupes per request).
const loadGamePage = cache(async (slug: string): Promise<GamePageData> => {
  const api = getPartnerApi();
  const now = new Date();
  const games = await api.listGames({ limit: 500 });
  const game = findGameBySlug(games.data, slug);
  if (!game) {
    return { category: null, streamerCount: 0, liveSlots: [], upcomingSlots: [], now };
  }

  const oneYearAgo = new Date(now.getTime() - 365 * 86_400_000);
  const sixHoursFromNow = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 86_400_000);

  const [liveCall, upcomingCall] = await Promise.all([
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
  ]);

  return {
    category: game.category,
    streamerCount: game.streamer_count,
    liveSlots: liveCall.data,
    upcomingSlots: upcomingCall.data,
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
  const { category } = await loadGamePage(slug);
  if (!category) return { title: 'Game not found — StreamerTimes' };
  const url = `${SITE_URL}/game/${slug}`;
  return {
    title: `${category} Streamers — Live Now & Stream Schedule`,
    description: `Who streams ${category}? See ${category} streamers live now, upcoming streams, and AI-predicted schedules across Twitch and YouTube.`,
    alternates: { canonical: url },
    openGraph: {
      title: `${category} streamers — live now & schedule`,
      description: `${category} streamers, live status and stream schedule on Twitch and YouTube.`,
      url,
      siteName: 'Streamer Times',
      type: 'website',
    },
    robots: { index: true, follow: true },
  };
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
  const { category, liveSlots, upcomingSlots, now } = await loadGamePage(slug);
  if (!category) notFound();

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

  // Schedule grid (live + upcoming), grouped by UTC date — same shape as the
  // streamer page so it can reuse DayNavBar + DaySection.
  const todayUtc = now.toISOString().slice(0, 10);
  const grouped = groupSlotsByUtcDate([...liveSlots, ...upcomingSlots]);
  const sevenDays: string[] = [];
  for (let i = 0; i < 7; i++) {
    sevenDays.push(new Date(now.getTime() + i * 86_400_000).toISOString().slice(0, 10));
  }
  const hasSchedule = liveSlots.length + upcomingSlots.length > 0;

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'Home', url: SITE_URL },
    { name: 'Games', url: `${SITE_URL}/games` },
    { name: category },
  ]);
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Streamers who stream ${category}`,
    itemListElement: streamers.slice(0, 20).map((s, i) => ({
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
  const intro =
    `${shown} streamer${shown === 1 ? '' : 's'} ${shown === 1 ? 'has' : 'have'} ${category} streams live or scheduled this week on Twitch and YouTube. ` +
    (liveCount > 0
      ? `${liveCount} ${liveCount === 1 ? 'is' : 'are'} live right now`
      : 'None are live right now') +
    (upcomingSlots.length > 0
      ? `, with ${upcomingSlots.length} upcoming stream${upcomingSlots.length === 1 ? '' : 's'} in the next 7 days.`
      : '.');

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

      <p className="text-sm text-text-muted">
        <Link href="/games" className="hover:text-accent-cyan">
          Games
        </Link>{' '}
        / {category}
      </p>
      <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">
        {category} streamers — live now &amp; schedule
      </h1>
      <p className="mt-3 max-w-2xl text-text-secondary">{intro}</p>

      <section aria-labelledby="streamers-heading" className="mt-8">
        <h2 id="streamers-heading" className="text-xl font-bold text-white">
          Streamers who stream {category}
        </h2>
        <ul
          className="mt-4 grid gap-3 sm:grid-cols-2"
          aria-label={`Streamers who stream ${category}`}
        >
          {streamers.map((s) => (
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

      {hasSchedule && (
        <section aria-label={`${category} stream schedule`}>
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
