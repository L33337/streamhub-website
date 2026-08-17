import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  getPartnerApi,
  type PartnerApiClient,
  type PublicGame,
  type PublicStreamSlot,
} from '@/lib/server/partner-api';
import { sizedAvatarUrl } from '@/lib/format/image-size';
import { applyLocaleSeo, buildBreadcrumbJsonLd, INDEXABLE_HUB_LOCALES, jsonLdHtml } from '@/lib/seo';
import { isUiLang, localeHref, type UiLang } from '@/lib/i18n-core';
import { hubLexFor } from '@/lib/i18n-hub';
import { chromeLexFor } from '@/lib/i18n-chrome';
import { siteMetaFor } from '@/lib/i18n-sitemeta';
import { gameSlug } from '@/lib/game-slug';
import { groupLiveSlotsByCategory } from '@/lib/live-hub';
import { AlwaysOnBadge, LiveBadge, PlatformBadge } from '@/components/web/Badges';
import { InitialsAvatar } from '@/components/web/InitialsAvatar';
import { LiveJumpNav } from '@/components/web/live/LiveJumpNav';
import { SlotCard } from '@/components/web/SlotCard';

// The whole point of this page is its live state — shortest ISR window on the
// site (matches the homepage).
export const revalidate = 60;

const SITE_URL = 'https://streamertimes.tv';
const PAGE_LIMIT = 500;
const MAX_PAGES = 4; // safety cap, same as lib/server/live-streamers.ts
const STARTING_SOON_HOURS = 6;
const STARTING_SOON_CAP = 12;
/** Map key for the one group whose `category` is null. */
const OTHER_CATEGORY_KEY = '\u0000other';
const STARTING_SOON_ID = 'live-starting-soon';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  const localized = siteMetaFor(locale).live;
  const meta: Metadata = {
    title: locale === 'en' ? "Who's Live Now on Twitch & YouTube | Streamer Times" : localized.title,
    description:
      locale === 'en'
        ? 'See every streamer live right now on Twitch and YouTube, grouped by game and category — plus who is starting in the next few hours. Updated every minute.'
        : localized.description,
    alternates: { canonical: `${SITE_URL}/live` },
    openGraph: {
      title: locale === 'en' ? "Who's live now on Twitch & YouTube" : localized.title,
      description:
        locale === 'en'
          ? 'Every streamer live right now, grouped by game and category, with upcoming streams for the next few hours.'
          : localized.description,
      url: `${SITE_URL}/live`,
      siteName: 'Streamer Times',
      type: 'website',
    },
    robots: { index: true, follow: true },
  };
  return applyLocaleSeo(meta, locale, '/live', INDEXABLE_HUB_LOCALES);
}

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

function LiveStreamerRow({ slot, locale }: { slot: PublicStreamSlot; locale: UiLang }) {
  return (
    <Link
      href={localeHref(locale, `/streamer/${encodeURIComponent(slot.streamer_id)}`)}
      className="group flex items-center gap-3 rounded-xl border border-border-default bg-background-elevated p-3 transition-colors hover:border-accent-cyan/60 hover:bg-background-highlight"
    >
      {slot.avatar_url ? (
        <Image
          src={sizedAvatarUrl(slot.avatar_url, 48)}
          alt={slot.streamer_name}
          width={48}
          height={48}
          unoptimized
          className="shrink-0 rounded-full border border-border-default"
        />
      ) : (
        <InitialsAvatar name={slot.streamer_name} size={48} className="shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
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

export default async function LivePage({ params }: PageProps) {
  const { locale: rawLocale } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  const L = hubLexFor(locale);
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
  // Stable per-section anchor ids, computed once so the jump list and the
  // sections cannot drift apart. `gameSlug` collides for categories that
  // differ only in punctuation, so the index keeps every id unique.
  const sectionIds = new Map(
    groups.map((g, i) => [g.category ?? OTHER_CATEGORY_KEY, `live-${i}-${g.category ? gameSlug(g.category) : 'other'}`]),
  );
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
      ? L.live.intro(liveCount, categoryCount, startingSoon.length, STARTING_SOON_HOURS)
      : L.live.introEmpty;

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: L.crumbs.home, url: SITE_URL },
    { name: L.crumbs.liveNow },
  ]);
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: L.live.itemListName,
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
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(breadcrumb) }}
      />
      {liveCount > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdHtml(itemList) }}
        />
      )}

      <h1 className="text-3xl font-bold text-white md:text-4xl">{L.live.h1}</h1>
      {intro && <p className="mt-3 max-w-2xl text-text-secondary">{intro}</p>}

      {failed ? (
        <div className="mt-8 gradient-border p-8 text-center">
          <p className="text-accent-pink">{L.live.error}</p>
        </div>
      ) : (
        <>
          {groups.length > 2 && (
            <LiveJumpNav label={L.live.jumpToGame}>
              <ul className="flex flex-wrap gap-2">
                {groups.map((group) => (
                  <li key={group.category ?? OTHER_CATEGORY_KEY}>
                    <a
                      href={`#${sectionIds.get(group.category ?? OTHER_CATEGORY_KEY)}`}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border-default bg-background-elevated px-3 text-xs font-semibold text-text-secondary transition-colors hover:border-accent-cyan/60 hover:text-white"
                    >
                      {group.category ?? L.live.otherCategory}
                      <span className="text-text-muted">{group.slots.length}</span>
                    </a>
                  </li>
                ))}
                {startingSoon.length > 0 && (
                  <li>
                    <a
                      href={`#${STARTING_SOON_ID}`}
                      className="inline-flex min-h-11 items-center rounded-full border border-border-default bg-background-elevated px-3 text-xs font-semibold text-text-secondary transition-colors hover:border-accent-cyan/60 hover:text-white"
                    >
                      {L.live.startingSoon}
                    </a>
                  </li>
                )}
              </ul>
            </LiveJumpNav>
          )}

          {groups.map((group) => {
            const name = group.category ?? L.live.otherCategory;
            const slug = group.category ? gameSlug(group.category) : '';
            const linkable =
              group.category !== null && slug !== '' && linkableCategories.has(group.category);
            return (
              <section
                key={name}
                id={sectionIds.get(group.category ?? OTHER_CATEGORY_KEY)}
                aria-label={L.live.categoryLiveAria(name)}
                // Clears the sticky header + the sticky jump bar so an anchored
                // heading is not hidden underneath them.
                className="mt-10 scroll-mt-32"
              >
                <h2 className="text-xl font-bold text-white">
                  {linkable ? (
                    <Link
                      href={localeHref(locale, `/game/${slug}`)}
                      className="hover:text-accent-cyan"
                    >
                      {name}
                    </Link>
                  ) : (
                    name
                  )}
                  <span className="ml-2 text-sm font-normal text-text-muted">
                    {L.live.nLive(group.slots.length)}
                  </span>
                </h2>
                {/* `min-w-0` on the grid ITEM, not just inside the row: a grid
                    item defaults to `min-width:auto`, so a `truncate` title
                    stretched the whole track past the viewport and the page
                    scrolled sideways. The inner min-w-0 alone cannot fix that. */}
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {group.slots.map((slot) => (
                    <li key={slot.streamer_id} className="min-w-0">
                      <LiveStreamerRow slot={slot} locale={locale} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}

          {startingSoon.length > 0 && (
            <section
              id={STARTING_SOON_ID}
              aria-labelledby="starting-soon-heading"
              className="mt-12 scroll-mt-32"
            >
              <h2 id="starting-soon-heading" className="text-xl font-bold text-white">
                {L.live.startingSoon}
                <span className="ml-2 text-sm font-normal text-text-muted">
                  {L.live.nextNHours(STARTING_SOON_HOURS)}
                </span>
              </h2>
              <ul className="mt-3 grid gap-3 md:grid-cols-2">
                {startingSoon.map((slot) => (
                  <li key={slot.id} className="min-w-0">
                    <SlotCard slot={slot} language={locale} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {liveCount === 0 && startingSoon.length === 0 && (
            <div className="mt-8 gradient-border p-8 text-center">
              <p className="text-text-secondary">{L.live.emptyAll}</p>
            </div>
          )}
        </>
      )}

      <p className="mt-12 border-t border-divider pt-6 text-sm text-text-secondary">
        {/* Sibling intention: this page answers "right now", /tonight answers
            "what's on this evening". The label comes from the chrome lexicon
            because it is the same link label the footer uses — /live's own
            hub lexicon has no phrasing for another page's name. */}
        <Link
          href={localeHref(locale, '/tonight')}
          className="text-accent-cyan hover:text-text-primary"
        >
          {chromeLexFor(locale).footer.tonight}
        </Link>
        {'  ·  '}
        <Link
          href={localeHref(locale, '/streamers')}
          className="text-accent-cyan hover:text-text-primary"
        >
          {L.common.browseStreamersAZ}
        </Link>
        {'  ·  '}
        <Link
          href={localeHref(locale, '/games')}
          className="text-accent-cyan hover:text-text-primary"
        >
          {L.common.allGamesCategories}
        </Link>
      </p>
    </main>
  );
}
