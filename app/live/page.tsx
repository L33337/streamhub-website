import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  getPartnerApi,
  type PartnerApiClient,
  type PublicGame,
  type PublicStreamSlot,
} from '@/lib/server/partner-api';
import { buildBreadcrumbJsonLd } from '@/lib/seo';
import { gameSlug } from '@/lib/game-slug';
import { groupLiveSlotsByCategory } from '@/lib/live-hub';
import { AlwaysOnBadge, LiveBadge, PlatformBadge } from '@/components/web/Badges';
import { InitialsAvatar } from '@/components/web/InitialsAvatar';
import { SlotCard } from '@/components/web/SlotCard';

// The whole point of this page is its live state — shortest ISR window on the
// site (matches the homepage).
export const revalidate = 60;

const SITE_URL = 'https://streamertimes.tv';
const PAGE_LIMIT = 500;
const MAX_PAGES = 4; // safety cap, same as lib/server/live-streamers.ts
const STARTING_SOON_HOURS = 6;
const STARTING_SOON_CAP = 12;

export const metadata: Metadata = {
  title: "Who's Live Now on Twitch & YouTube | StreamerTimes",
  description:
    'See every streamer live right now on Twitch and YouTube, grouped by game and category — plus who is starting in the next few hours. Updated every minute.',
  alternates: { canonical: `${SITE_URL}/live` },
  openGraph: {
    title: "Who's live now on Twitch & YouTube",
    description:
      'Every streamer live right now, grouped by game and category, with upcoming streams for the next few hours.',
    url: `${SITE_URL}/live`,
    siteName: 'Streamer Times',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

/**
 * Full live sweep, cursor-paginated (mirrors lib/server/live-streamers.ts).
 * The wide `from` window is required: the API filters start_time >= from and
 * live slots — especially always-on channels — started hours to weeks ago.
 */
async function fetchAllLiveSlots(api: PartnerApiClient, now: Date): Promise<PublicStreamSlot[]> {
  const from = new Date(now.getTime() - 365 * 86_400_000).toISOString();
  const to = new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString();
  const all: PublicStreamSlot[] = [];
  let cursor: string | undefined = undefined;
  let pages = 0;

  do {
    const resp = await api.listSchedules({
      status: ['live'],
      includeAlwaysOn: true,
      from,
      to,
      limit: PAGE_LIMIT,
      cursor,
      revalidate: 60,
    });
    all.push(...resp.data);
    cursor = resp.pagination.next_cursor ?? undefined;
    pages++;
  } while (cursor && pages < MAX_PAGES);

  return all;
}

function LiveStreamerRow({ slot }: { slot: PublicStreamSlot }) {
  return (
    <Link
      href={`/streamer/${encodeURIComponent(slot.streamer_id)}`}
      className="group flex items-center gap-3 rounded-xl border border-border-default bg-background-elevated p-3 transition-colors hover:border-accent-cyan/60 hover:bg-background-highlight"
    >
      {slot.avatar_url ? (
        <Image
          src={slot.avatar_url}
          alt=""
          width={48}
          height={48}
          unoptimized
          className="shrink-0 rounded-full border border-border-default"
        />
      ) : (
        <InitialsAvatar name={slot.streamer_name} size={48} className="shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold text-text-primary group-hover:text-accent-cyan">
            {slot.streamer_name}
          </span>
          <LiveBadge />
          {slot.is_always_on && <AlwaysOnBadge />}
        </div>
        <p className="mt-0.5 truncate text-xs text-text-secondary" title={slot.title}>
          {slot.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {slot.platforms.map((p) => (
            <PlatformBadge key={p} platform={p} size="sm" />
          ))}
        </div>
      </div>
    </Link>
  );
}

export default async function LivePage() {
  const api = getPartnerApi();
  const now = new Date();
  const soonCutoff = new Date(now.getTime() + STARTING_SOON_HOURS * 60 * 60 * 1000);

  // Static route → prerendered at `next build`: every fetch must be
  // failure-isolated, a single throw would abort the whole deploy (same
  // lesson as app/game/[slug]/page.tsx). Upcoming/games degrade
  // independently; only a failed live sweep shows the unavailable state.
  const [liveRes, upcomingRes, gamesRes] = await Promise.allSettled([
    fetchAllLiveSlots(api, now),
    api.listSchedules({
      status: ['upcoming'],
      includePredictions: true,
      from: now.toISOString(),
      to: soonCutoff.toISOString(),
      limit: 50,
      revalidate: 60,
    }),
    api.listGames({ limit: 500, revalidate: 3600 }),
  ]);

  const failed = liveRes.status === 'rejected';
  const liveSlots = liveRes.status === 'fulfilled' ? liveRes.value : [];
  const games: PublicGame[] = gamesRes.status === 'fulfilled' ? gamesRes.value.data : [];

  const groups = groupLiveSlotsByCategory(liveSlots);
  const liveStreamerIds = new Set(groups.flatMap((g) => g.slots.map((s) => s.streamer_id)));
  const liveCount = liveStreamerIds.size;
  const categoryCount = groups.filter((g) => g.category !== null).length;

  // "Starting soon": next slots inside the window, minus streamers already
  // live (their upcoming slot would just duplicate the live row above).
  const startingSoon = (upcomingRes.status === 'fulfilled' ? upcomingRes.value.data : [])
    .filter((s) => !liveStreamerIds.has(s.streamer_id))
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
    .slice(0, STARTING_SOON_CAP);

  // Category H2s only link to hubs that exist (>= 3 streamers per /v1/games);
  // linking blindly would create internal 404s.
  const linkableCategories = new Set(games.map((g) => g.category));

  const intro = failed
    ? ''
    : liveCount > 0
      ? `${liveCount} streamer${liveCount === 1 ? ' is' : 's are'} live right now` +
        (categoryCount > 0
          ? ` across ${categoryCount} game${categoryCount === 1 ? '' : 's'} and categories`
          : '') +
        '.' +
        (startingSoon.length > 0
          ? ` ${startingSoon.length} more ${startingSoon.length === 1 ? 'is' : 'are'} scheduled to start in the next ${STARTING_SOON_HOURS} hours.`
          : '')
      : `No streamers are live right now — here's who's starting soon.`;

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'Home', url: SITE_URL },
    { name: 'Live now' },
  ]);
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Streamers live right now on Twitch & YouTube',
    itemListElement: groups
      .flatMap((g) => g.slots)
      .slice(0, 20)
      .map((s, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: s.streamer_name,
        url: `${SITE_URL}/streamer/${encodeURIComponent(s.streamer_id)}`,
      })),
  };

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {liveCount > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
        />
      )}

      <h1 className="text-3xl font-bold text-white md:text-4xl">
        Live now on Twitch &amp; YouTube
      </h1>
      {intro && <p className="mt-3 max-w-2xl text-text-secondary">{intro}</p>}

      {failed ? (
        <div className="mt-8 gradient-border p-8 text-center">
          <p className="text-accent-pink">
            Live status is temporarily unavailable. Please try again in a moment.
          </p>
        </div>
      ) : (
        <>
          {groups.map((group) => {
            const name = group.category ?? 'Other';
            const slug = group.category ? gameSlug(group.category) : '';
            const linkable =
              group.category !== null && slug !== '' && linkableCategories.has(group.category);
            return (
              <section key={name} aria-label={`${name} — live now`} className="mt-10">
                <h2 className="text-xl font-bold text-white">
                  {linkable ? (
                    <Link href={`/game/${slug}`} className="hover:text-accent-cyan">
                      {name}
                    </Link>
                  ) : (
                    name
                  )}
                  <span className="ml-2 text-sm font-normal text-text-muted">
                    {group.slots.length} live
                  </span>
                </h2>
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {group.slots.map((slot) => (
                    <li key={slot.streamer_id}>
                      <LiveStreamerRow slot={slot} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}

          {startingSoon.length > 0 && (
            <section aria-labelledby="starting-soon-heading" className="mt-12">
              <h2 id="starting-soon-heading" className="text-xl font-bold text-white">
                Starting soon
                <span className="ml-2 text-sm font-normal text-text-muted">
                  next {STARTING_SOON_HOURS} hours
                </span>
              </h2>
              <ul className="mt-3 grid gap-3 md:grid-cols-2">
                {startingSoon.map((slot) => (
                  <li key={slot.id}>
                    <SlotCard slot={slot} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {liveCount === 0 && startingSoon.length === 0 && (
            <div className="mt-8 gradient-border p-8 text-center">
              <p className="text-text-secondary">
                Nothing is live or about to start right now. Browse the full
                streamer directory or explore games to find your next stream.
              </p>
            </div>
          )}
        </>
      )}

      <p className="mt-12 border-t border-divider pt-6 text-sm text-text-secondary">
        <Link href="/streamers" className="text-accent-cyan hover:text-text-primary">
          Browse all streamers A–Z
        </Link>
        {'  ·  '}
        <Link href="/games" className="text-accent-cyan hover:text-text-primary">
          All games &amp; categories
        </Link>
      </p>
    </main>
  );
}
