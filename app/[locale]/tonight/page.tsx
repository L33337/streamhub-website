import type { Metadata } from 'next';
import Link from 'next/link';
import {
  getPartnerApi,
  type PartnerApiClient,
  type PublicStreamSlot,
} from '@/lib/server/partner-api';
import { fetchFeaturedStreamers } from '@/lib/server/home-featured';
import { floorToBucket } from '@/lib/home/logic';
import { languageDisplayName } from '@/lib/format/language';
import { applyLocaleSeo, buildBreadcrumbJsonLd, INDEXABLE_HUB_LOCALES, jsonLdHtml } from '@/lib/seo';
import { isUiLang, localeHref, type UiLang } from '@/lib/i18n-core';
import { hubLexFor } from '@/lib/i18n-hub';
import { siteMetaFor } from '@/lib/i18n-sitemeta';
import { toLineupCardSlot } from '@/lib/home/slot-payload';
import {
  bucketSlotsIntoBlocks,
  buildTonightBlocks,
  buildTonightFilterItems,
  formatClockReading,
  formatEveningDate,
  formatZoneLabel,
  isCancelled,
  pickHeadlineNames,
  pickPrimetimeSlots,
  resolveTonightWindow,
  selectAlreadyLive,
  selectTonightSlots,
  splitTonightLiveSlots,
  formatHeadlineNames,
  toTonightLiveRowSlot,
  tonightZoneFor,
  PRIMETIME_START_MINUTES,
  TONIGHT_FETCH_HOURS,
  TONIGHT_LIVE_CAP,
  TONIGHT_POOL_MAX,
  TONIGHT_REVEAL_STEP,
  TONIGHT_SSR_PER_BLOCK,
  TONIGHT_VISIBLE_PER_BLOCK,
  zonedWallTimeToMs,
} from '@/lib/tonight/logic';
import { buildLiveFilterItems } from '@/lib/home/live-rail';
import { SlotCard } from '@/components/web/SlotCard';
import { FAQItem } from '@/components/web/FAQItem';
import { PrimetimeCard } from '@/components/web/tonight/PrimetimeCard';
import { TonightLiveFilters } from '@/components/web/tonight/TonightLiveFilters';
import { TonightLiveRow } from '@/components/web/tonight/TonightLiveRow';
import { TonightTimesNote } from '@/components/web/tonight/TonightLocal';
import {
  TonightBlocks,
  type TonightBlockView,
} from '@/components/web/tonight/TonightBlocks';

/**
 * Longer than /live's 60 s on purpose: this page previews an evening, and its
 * content only moves when a prediction run or the 30-minute schedule refresh
 * writes new slots. Combined with the bucketed clock below, regenerations
 * inside a 5-minute bucket render byte-identical HTML — Vercel only bills an
 * ISR write when the output changed.
 */
export const revalidate = 300;

const SITE_URL = 'https://streamertimes.tv';
const PAGE_LIMIT = 500;
/** Safety cap on the upcoming sweep; production runs ~440 slots per 24 h. */
const MAX_UPCOMING_PAGES = 2;
/**
 * The live sweep is the opener's FILTER SCOPE, not just its visible rows, so it
 * has to cover the whole live population — production runs ~130 live streamers
 * with evening peaks of 150-250 plausible (`TONIGHT_LIVE_POOL_MAX` caps it).
 */
const MAX_LIVE_PAGES = 2;
const LIVE_SECTION_ID = 'tonight-live';
const PRIMETIME_SECTION_ID = 'tonight-primetime';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  const localized = siteMetaFor(locale).tonight;
  const meta: Metadata = {
    title: localized.title,
    description: localized.description,
    alternates: { canonical: `${SITE_URL}/tonight` },
    openGraph: {
      title: localized.title,
      description: localized.description,
      url: `${SITE_URL}/tonight`,
      siteName: 'Streamer Times',
      type: 'website',
    },
    robots: { index: true, follow: true },
  };
  return applyLocaleSeo(meta, locale, '/tonight', INDEXABLE_HUB_LOCALES);
}

/**
 * The evening's candidate slots. The fetch window is deliberately LOCALE-
 * INDEPENDENT (`now` → `now + TONIGHT_FETCH_HOURS`): all 12 locale prerenders
 * must hit the SAME url or Next's data cache dedupes nothing and each one runs
 * its own sweep — the failure mode that aborted the 2026-07-27 deploy. The
 * per-locale evening is cut out of the result afterwards, in pure code.
 */
async function fetchUpcoming(
  api: PartnerApiClient,
  bucketedNow: Date,
): Promise<PublicStreamSlot[]> {
  const from = bucketedNow.toISOString();
  const to = new Date(
    bucketedNow.getTime() + TONIGHT_FETCH_HOURS * 3_600_000,
  ).toISOString();
  const all: PublicStreamSlot[] = [];
  let cursor: string | undefined = undefined;
  let pages = 0;
  do {
    const resp = await api.listSchedules({
      status: ['upcoming'],
      includePredictions: true,
      includeAlwaysOn: false,
      from,
      to,
      limit: PAGE_LIMIT,
      cursor,
      revalidate: 300,
    });
    all.push(...resp.data);
    cursor = resp.pagination.next_cursor ?? undefined;
    pages++;
  } while (cursor && pages < MAX_UPCOMING_PAGES);
  return all;
}

/**
 * Live slots for the opener. The wide `from` window is required: the API
 * filters `start_time >= from` and a live stream started hours ago (mirrors
 * lib/server/live-streamers.ts).
 */
async function fetchLive(
  api: PartnerApiClient,
  bucketedNow: Date,
): Promise<PublicStreamSlot[]> {
  const from = new Date(bucketedNow.getTime() - 365 * 86_400_000).toISOString();
  const to = new Date(bucketedNow.getTime() + 6 * 3_600_000).toISOString();
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
      revalidate: 300,
    });
    all.push(...resp.data);
    cursor = resp.pagination.next_cursor ?? undefined;
    pages++;
  } while (cursor && pages < MAX_LIVE_PAGES);
  return all;
}

export default async function TonightPage({ params }: PageProps) {
  const { locale: rawLocale } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  const L = hubLexFor(locale);
  const api = getPartnerApi();

  // ONE bucketed clock for the fetch window, the evening resolution and the
  // expiry cut, so all three agree and a regeneration inside the bucket is
  // byte-identical.
  const bucketedNow = floorToBucket(new Date());
  const nowMs = bucketedNow.getTime();
  const timeZone = tonightZoneFor(locale);
  const window = resolveTonightWindow(nowMs, timeZone);

  // Static route → prerendered at `next build`: every fetch is failure-isolated
  // because a single throw would abort the whole deploy (same lesson as
  // /live and /game/[slug]).
  const [upcomingRes, liveRes, featuredRes] = await Promise.allSettled([
    fetchUpcoming(api, bucketedNow),
    fetchLive(api, bucketedNow),
    fetchFeaturedStreamers(),
  ]);

  const failed = upcomingRes.status === 'rejected';
  const upcoming = upcomingRes.status === 'fulfilled' ? upcomingRes.value : [];
  const liveSlots = liveRes.status === 'fulfilled' ? liveRes.value : [];

  // Follower prior for the editorial picks. A failed sweep degrades the
  // ordering to confidence-then-time rather than emptying the highlight box.
  const followers = new Map<string, number>();
  if (featuredRes.status === 'fulfilled' && featuredRes.value) {
    for (const s of featuredRes.value) {
      if (typeof s.follower_count === 'number') followers.set(s.id, s.follower_count);
    }
  }

  const tonightSlots = selectTonightSlots(upcoming, window, nowMs, TONIGHT_POOL_MAX);

  // The live opener: the whole ranked sweep is the FILTER SCOPE, only the first
  // TONIGHT_LIVE_CAP rows are the resting cut. Everything past the SSR head
  // travels as pruned data and is rendered by the island when a filter reaches
  // it — so a German stream at rank 84 is findable without paying ~200 rows of
  // DOM up front.
  const alreadyLive = selectAlreadyLive(liveSlots);
  const { ssr: liveSsr, deferred: liveDeferred } = splitTonightLiveSlots(alreadyLive);
  const liveFilterItems = buildLiveFilterItems(alreadyLive, (code) =>
    languageDisplayName(code, locale) ?? code.toUpperCase(),
  );

  // The highlight box takes its cards OUT of the listing below — the same card
  // twice within one screen reads as a bug, and a magazine's "tips of the
  // evening" box is not a duplicate of the grid either.
  const primetime = pickPrimetimeSlots(tonightSlots, window, followers);
  const primetimeIds = new Set(primetime.map((s) => s.id));
  const listedSlots = tonightSlots.filter((slot) => !primetimeIds.has(slot.id));

  const blocks = buildTonightBlocks(window);
  const buckets = bucketSlotsIntoBlocks(listedSlots, blocks);

  // Language names follow the VIEWER's locale (chrome, not content — D6).
  const filterItems = buildTonightFilterItems(buckets, blocks, (code) =>
    languageDisplayName(code, locale) ?? code.toUpperCase(),
  );

  const blockViews: TonightBlockView[] = blocks.map((block, index) => {
    const slots = buckets[index];
    const ssrSlots = slots.slice(0, TONIGHT_SSR_PER_BLOCK);
    const deferred = slots.slice(TONIGHT_SSR_PER_BLOCK);
    return {
      id: block.id,
      startMs: block.startMs,
      isNight: block.isNight,
      headingSsr: block.isNight
        ? L.tonight.blockNight
        : L.tonight.blockFrom(formatClockReading(block.startMs, locale, timeZone)),
      ssrCards: ssrSlots.map((slot, cardIndex) => (
        <li
          key={slot.id}
          data-tonight-id={slot.id}
          // Beyond the resting window the server hides them outright — the
          // island computes the same set on mount, so the first paint needs no
          // correction and the section does not shift.
          hidden={cardIndex >= TONIGHT_VISIBLE_PER_BLOCK || undefined}
          className="min-w-0"
        >
          <SlotCard slot={slot} language={locale} />
        </li>
      )),
      // Pruned to what SlotCard renders, reasoning already resolved for THIS
      // locale — a full DTO would ship a dozen unread fields plus both copy
      // variants per card in the flight payload (lib/home/slot-payload.ts).
      deferredSlots: deferred.map((slot) => toLineupCardSlot(slot, locale)),
    };
  });

  const totalListed = tonightSlots.length;
  const headlineNames = pickHeadlineNames(tonightSlots, followers);
  const intro = failed
    ? ''
    : totalListed > 0
      ? L.tonight.intro(totalListed, formatHeadlineNames(headlineNames, locale))
      : L.tonight.introEmpty;

  const zoneLabel = formatZoneLabel(window.startMs, locale, timeZone);
  const primetimeAnchor = zonedWallTimeToMs(
    window.dateKey,
    PRIMETIME_START_MINUTES + 45, // the 20:15-style slot itself, not the window edge
    timeZone,
  );

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: L.crumbs.home, url: SITE_URL },
    { name: L.crumbs.tonight },
  ]);
  // Mirrors what the page actually renders: the highlight box first, then the
  // listing — cancellations excluded, because an ItemList of "no stream" is a
  // structured-data claim we do not want to make.
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: L.tonight.itemListName,
    itemListElement: [...primetime, ...listedSlots]
      .filter((slot) => !isCancelled(slot))
      .slice(0, 20)
      .map((slot, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: slot.streamer_name,
        url: `${SITE_URL}/streamer/${encodeURIComponent(slot.streamer_id)}`,
      })),
  };

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(breadcrumb) }}
      />
      {itemList.itemListElement.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdHtml(itemList) }}
        />
      )}

      <h1 className="text-3xl font-bold text-white md:text-4xl">
        {window.mode === 'night' ? L.tonight.h1Night : L.tonight.h1}
      </h1>
      <p className="mt-2 text-sm text-text-muted">
        {formatEveningDate(window, locale)}
        {'  ·  '}
        <TonightTimesNote
          zoneNote={L.tonight.timesInZone(zoneLabel)}
          localNote={L.tonight.timesLocal}
          atMs={window.startMs}
          referenceOffsetMinutes={window.offsetMinutes}
        />
      </p>
      {intro && <p className="mt-3 max-w-2xl text-text-secondary">{intro}</p>}

      {failed ? (
        <div className="mt-8 gradient-border p-8 text-center">
          <p className="text-accent-pink">{L.tonight.error}</p>
        </div>
      ) : (
        <>
          {alreadyLive.length > 0 && (
            <section id={LIVE_SECTION_ID} className="mt-10 scroll-mt-32">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="text-xl font-bold text-white">
                  {L.tonight.liveNowHeading}
                  {/* The POOL count, not the visible cut: the dropdowns reach
                      all of them, and the header is what communicates that
                      scope (the homepage rail's contract). */}
                  <span className="ml-2 text-sm font-normal text-text-muted">
                    {L.live.nLive(alreadyLive.length)}
                  </span>
                </h2>
                <Link
                  href={localeHref(locale, '/live')}
                  className="text-sm font-semibold text-accent-cyan hover:text-text-primary"
                >
                  {L.tonight.liveNowLink}
                </Link>
              </div>
              <div className="mt-3">
                <TonightLiveFilters
                  items={liveFilterItems}
                  locale={locale}
                  listClassName="grid gap-3 sm:grid-cols-2"
                  ssrCards={liveSsr.map((slot, index) => (
                    <TonightLiveRow
                      key={slot.id}
                      slot={slot}
                      locale={locale}
                      // Beyond the resting cut the server hides them outright —
                      // the island computes the same set on mount, so the first
                      // paint needs no correction and the section does not shift.
                      hidden={index >= TONIGHT_LIVE_CAP}
                    />
                  ))}
                  deferredSlots={liveDeferred.map(toTonightLiveRowSlot)}
                  strings={{
                    categoryLabel: L.homeFeed.liveFilterCategory,
                    languageLabel: L.homeFeed.liveFilterLanguage,
                    allCategories: L.homeFeed.liveFilterAllCategories,
                    allLanguages: L.homeFeed.liveFilterAllLanguages,
                    optionPattern: L.homeFeed.liveFilterOption('{label}', '{count}'),
                    // 0..pool, so the island can index straight by its match
                    // count and every language keeps its plural agreement.
                    matchesByCount: Array.from(
                      { length: alreadyLive.length + 1 },
                      (_, count) => L.homeFeed.liveFilterMatches(count),
                    ),
                    reset: L.homeFeed.liveFilterReset,
                    empty: L.homeFeed.liveFilterEmpty,
                  }}
                />
              </div>
            </section>
          )}

          {primetime.length > 0 && (
            <section id={PRIMETIME_SECTION_ID} className="mt-12 scroll-mt-32">
              <h2 className="text-xl font-bold text-white">
                {L.tonight.primetimeHeading}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                {L.tonight.primetimeSub(
                  formatClockReading(primetimeAnchor, locale, timeZone),
                )}
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {primetime.map((slot) => (
                  <PrimetimeCard
                    key={slot.id}
                    slot={slot}
                    locale={locale}
                    timeZone={timeZone}
                    referenceOffsetMinutes={window.offsetMinutes}
                  />
                ))}
              </div>
            </section>
          )}

          {listedSlots.length > 0 ? (
            <div className="mt-12">
              <TonightBlocks
                blocks={blockViews}
                items={filterItems}
                locale={locale}
                referenceOffsetMinutes={window.offsetMinutes}
                windowStartMs={window.startMs}
                listClassName="mt-3 grid gap-3 md:grid-cols-2"
                strings={{
                  categoryLabel: L.homeFeed.liveFilterCategory,
                  languageLabel: L.homeFeed.liveFilterLanguage,
                  allCategories: L.homeFeed.liveFilterAllCategories,
                  allLanguages: L.homeFeed.liveFilterAllLanguages,
                  optionPattern: L.homeFeed.liveFilterOption('{label}', '{count}'),
                  // 0..pool, so the island can index straight by its match
                  // count and every language keeps its own plural agreement.
                  matchesByCount: Array.from(
                    { length: listedSlots.length + 1 },
                    (_, count) => L.homeFeed.lineupFilterMatches(count),
                  ),
                  blockCountByNumber: Array.from(
                    { length: listedSlots.length + 1 },
                    (_, count) => L.tonight.blockCount(count),
                  ),
                  reset: L.homeFeed.liveFilterReset,
                  empty: L.homeFeed.lineupFilterEmpty,
                  blockFromPattern: L.tonight.blockFrom('{time}'),
                  blockNight: L.tonight.blockNight,
                  showMoreByCount: Array.from(
                    { length: TONIGHT_REVEAL_STEP + 1 },
                    (_, count) => L.homeFeed.lineupShowMore(count),
                  ),
                  showLess: L.homeFeed.lineupShowLess,
                  jumpAria: L.tonight.jumpAria,
                }}
              />
            </div>
          ) : (
            primetime.length === 0 && (
              <div className="mt-8 gradient-border p-8 text-center">
                <p className="text-text-secondary">{L.tonight.quietBody}</p>
                <Link
                  href={localeHref(locale, '/live')}
                  className="mt-3 inline-block text-sm font-semibold text-accent-cyan hover:text-text-primary"
                >
                  {L.tonight.liveNowLink}
                </Link>
              </div>
            )
          )}
        </>
      )}

      {/* Evergreen tail: on a quiet evening this is what keeps the page from
          being a thin listing with nothing to index. */}
      <section className="mt-16 border-t border-divider pt-8">
        <h2 className="text-xl font-bold text-white">{L.tonight.aboutHeading}</h2>
        <p className="mt-3 max-w-3xl text-sm text-text-secondary">
          {L.tonight.aboutBody}
        </p>
        <div className="mt-6 space-y-3">
          <FAQItem question={L.tonight.faqWhatQ} answer={L.tonight.faqWhatA} />
          <FAQItem question={L.tonight.faqHowQ} answer={L.tonight.faqHowA} />
          <FAQItem
            question={L.tonight.faqTimesQ}
            answer={L.tonight.faqTimesA(zoneLabel)}
          />
        </div>
      </section>

      <p className="mt-12 border-t border-divider pt-6 text-sm text-text-secondary">
        <Link
          href={localeHref(locale, '/live')}
          className="text-accent-cyan hover:text-text-primary"
        >
          {L.tonight.liveNowLink}
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
