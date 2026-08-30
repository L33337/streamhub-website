import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getPartnerApi,
  type PublicStreamer,
  type PublicStreamerRankings,
  type PublicStreamerStats,
  type PublicStreamSlot,
  type PublicStreamHistory,
} from '@/lib/server/partner-api';
import {
  applyLocaleSeo,
  buildBreadcrumbJsonLd,
  buildBroadcastEventsJsonLd,
  buildLiveVideoObjectJsonLd,
  buildProfilePageJsonLd,
  buildStreamerMetadata,
  streamerIndexableLocales,
  jsonLdHtml,
} from '@/lib/seo';
import { isUiLang, localeHref, type UiLang } from '@/lib/i18n-core';
import { uiLexFor } from '@/lib/i18n-ui';
import { slotLexFor } from '@/lib/i18n-slot';
import {
  groupSlotsByUtcDate,
  pickNextRealSlot,
  sevenDayKeys,
  utcDateLabel,
} from '@/lib/format/time';
import { ChannelStats } from '@/components/web/ChannelStats';
import { StreamerRankings } from '@/components/web/StreamerRankings';
import { StreamerHero } from '@/components/web/StreamerHero';
import { LastStreamCard } from '@/components/web/LastStreamCard';
import { DaySection } from '@/components/web/DaySection';
import { DayNavBar } from '@/components/web/DayNavBar';
import { toDayCounts } from '@/lib/day-counts';
import { CollapsibleSchedule } from '@/components/web/CollapsibleSchedule';
import { EmptyDayRow } from '@/components/web/EmptyDayRow';
import { EmptyScheduleState } from '@/components/web/EmptyScheduleState';
import { RecentStreamsSection } from '@/components/web/RecentStreamsSection';
import { StreamerFaqBlock } from '@/components/web/StreamerFaqBlock';
import { StreamerStatsBlock } from '@/components/web/StreamerStatsBlock';
import { InsightsTeaserCard } from '@/components/web/streamer/InsightsTeaserCard';
import { WikiTeaserCard } from '@/components/web/streamer/WikiTeaserCard';
import { buildInsightsTeaser } from '@/lib/streamer-insights';
import { StreamerGames } from '@/components/web/StreamerGames';
import { RelatedStreamers } from '@/components/web/RelatedStreamers';
import { floorToBucket } from '@/lib/home/logic';

// 1800 (was 300 until 2026-08-18): this route was the site's single biggest
// ISR-write consumer (~375k units/day, 58% of them plain stale_time
// regenerations — measured via the Observability query API). Freshness is
// covered on-demand instead of by the TTL: /api/revalidate purges all locale
// variants on every live/offline transition (LIVE-badge pipeline) AND after
// every generate-predictions run (2026-08-18), so live badges and new
// predictions appear immediately regardless of this value. The TTL only
// bounds staleness of everything else (follower counts, history) at 30 min.
//
// ⚠️ The lowest fetch revalidate in the render tree caps the ROUTE's
// revalidate (Next.js min() rule) — every fetch below and in
// RelatedStreamers passes `revalidate: 1800` explicitly. Adding a new fetch
// with a smaller value silently drags the whole route back down.
export const revalidate = 1800;

/** Slot cards rendered in full before the schedule is cut (the next one peeks). */
const SCHEDULE_VISIBLE_SLOTS = 2;
/** Below this many slots the whole week renders — truncating would gain nothing. */
const SCHEDULE_TRUNCATE_THRESHOLD = 4;

// Required for ISR: without generateStaticParams, Next renders this dynamic
// route per-request (ƒ in the build output) and never caches the HTML. An
// empty array means no slugs are prerendered at build time — each is
// generated on first visit, then served from the route cache per
// `revalidate` (dynamicParams defaults to true).
export function generateStaticParams(): Array<{ slug: string }> {
  return [];
}

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

interface StreamerPageData {
  streamer: PublicStreamer | null;
  liveSlots: PublicStreamSlot[];
  upcomingSlots: PublicStreamSlot[];
  /** Finished broadcasts, newest first ([0] feeds LastStreamCard, the rest the Recent-streams list). */
  history: PublicStreamHistory[];
  stats: PublicStreamerStats | null;
  rankings: PublicStreamerRankings | null;
  /** M24: teaser payload for the insights subpage; null = don't render the card. */
  insightsTeaser: { bestDay: string; median: number } | null;
  /** M26: a published wiki profile exists → render the wiki teaser card. */
  hasWiki: boolean;
  now: Date;
}

// Wrapped in React `cache()` so generateMetadata and the page component share a
// single fetch per request — calling it twice with the same slug is deduped.
const loadStreamerPage = cache(async (slug: string): Promise<StreamerPageData> => {
  const api = getPartnerApi();
  const now = new Date();

  // Fetch-URL timestamps use the 5-min bucket (lib/home/logic.ts convention):
  // a raw `now.toISOString()` embeds millisecond precision in the URL, so every
  // ISR regeneration of every locale variant fired its own uncached live +
  // upcoming sweep — 12 locales × every regen = guaranteed data-cache MISS +
  // billed ISR write each time. Bucketed, all locale variants and every regen
  // inside the window share one data-cache entry per call. Display/derivation
  // logic keeps the real `now`; the window edges are day/week-scale, so a ≤5-min
  // shift is invisible in the rendered output.
  const bucketedNow = floorToBucket(now);
  const oneYearAgo = new Date(bucketedNow.getTime() - 365 * 86_400_000);
  const sixHoursFromNow = new Date(bucketedNow.getTime() + 6 * 60 * 60 * 1000);
  const sevenDaysFromNow = new Date(bucketedNow.getTime() + 7 * 86_400_000);

  // De-serialized cold render (M20 S1.3): the streamer lookup and the four
  // section calls are all fired concurrently. The section calls only need the
  // slug (not the streamer object), so awaiting getStreamer first would stack a
  // full partner-API round-trip in front of the section batch — ~2x p95 on a
  // first-ever (cache-MISS) render, measured at 1.5-1.8 s TTFB in Phase 0. Every
  // section call is individually safe for a non-existent slug (listSchedules →
  // empty data, getStreamerHistory → [] via its rejection handler, getStreamerStats
  // → null), so on the rare 404 we simply discard their in-flight results below.
  const streamerCall = api.getStreamer(slug, { revalidate: 1800 });
  // Live + upcoming are split because the partner API filters by start_time >= from,
  // which would exclude currently-live slots that started hours ago and always-on
  // slots whose start_time is days in the past. Splitting keeps the upcoming
  // window tight while still capturing live.
  //
  // Both are best-effort (like history/stats/rankings below): a rejection
  // degrades to an empty slot list rather than 500ing the whole page. Once the
  // streamer itself has loaded, a transient schedule blip must not throw away a
  // page that can still render the hero, channel stats, recent streams and FAQ —
  // the client already retries transient failures once, so reaching this
  // fallback means a genuine outage, and an empty schedule beats an error page.
  const liveCall = api
    .listSchedules({
      streamerIds: [slug],
      status: ['live'],
      includeAlwaysOn: true,
      from: oneYearAgo.toISOString(),
      to: sixHoursFromNow.toISOString(),
      limit: 10,
      revalidate: 1800,
    })
    .then(
      (page) => page.data,
      () => [] as PublicStreamSlot[],
    );
  const upcomingCall = api
    .listSchedules({
      streamerIds: [slug],
      status: ['upcoming'],
      includePredictions: true,
      includeAlwaysOn: true,
      from: bucketedNow.toISOString(),
      to: sevenDaysFromNow.toISOString(),
      limit: 100,
      revalidate: 1800,
    })
    .then(
      (page) => page.data,
      () => [] as PublicStreamSlot[],
    );
  // Best-effort: unlike getLastStream, getStreamerHistory does NOT swallow errors
  // — the rejection handler here is load-bearing so a failing history lookup never
  // rejects or breaks the page. Newest first; [0] feeds LastStreamCard, [1..8] the
  // Recent-streams list.
  //
  // `limit` counts broadcast SESSIONS, so 9 really is 9 distinct streams: the API
  // folds a Twitch+YouTube simulcast into one item. Before that merge landed, a
  // simulcasting streamer got ~4 actual broadcasts out of these 9 slots, each
  // listed twice under two platform badges.
  const historyCall = api.getStreamerHistory(slug, { limit: 9, revalidate: 1800 }).then(
    (page) => page.data,
    () => [] as PublicStreamHistory[],
  );
  // Best-effort too: getStreamerStats collapses errors AND has_stats:false to null.
  // Cached for 1h in the data cache (stats move daily at most).
  const statsCall = api.getStreamerStats(slug);
  // Ranking placements for the Channel-stats "Rankings" block. Best-effort
  // (collapses every error to null) and 1h-cached like stats — ranks move
  // nightly at most.
  const rankingsCall = api.getStreamerRankings(slug);
  // M24 insights teaser. Best-effort inside the client (errors → null),
  // 1h-cached — nightly aggregate.
  const insightsCall = api.getStreamerInsights(slug);
  const streamer = await streamerCall;
  if (!streamer) {
    // 404: discard the in-flight section calls. allSettled attaches a handler to
    // each so a rejected live/upcoming fetch can't surface as an unhandled
    // rejection — but we do NOT await it, so notFound() is not delayed.
    void Promise.allSettled([
      liveCall,
      upcomingCall,
      historyCall,
      statsCall,
      rankingsCall,
      insightsCall,
    ]);
    return {
      streamer: null,
      liveSlots: [],
      upcomingSlots: [],
      history: [],
      stats: null,
      rankings: null,
      insightsTeaser: null,
      hasWiki: false,
      now,
    };
  }

  // M26 wiki teaser, gated on the streamer DTO's `has_wiki` (2026-08-29): the
  // wiki endpoint answers 404 for ~99 % of streamers and Next never caches a
  // non-200, so asking unconditionally cost ~10,000 Partner API calls a day
  // for five published profiles. `undefined` = older API without the flag →
  // ask as before. Best-effort inside the client (404 → null), 1h-cached.
  const wikiCall = streamer.has_wiki === false ? Promise.resolve(null) : api.getStreamerWiki(slug);

  // Valid slug: await the section batch. Every call is now best-effort (each
  // has its own rejection handler that degrades to []/null), so this Promise.all
  // can no longer reject — a partial outage renders a degraded page, not a 500.
  const [liveSlots, upcomingSlots, history, stats, rankings, insights, wiki] = await Promise.all([
    liveCall,
    upcomingCall,
    historyCall,
    statsCall,
    rankingsCall,
    insightsCall,
    wikiCall,
  ]);

  return {
    streamer,
    liveSlots,
    upcomingSlots,
    history,
    stats,
    rankings,
    insightsTeaser: buildInsightsTeaser(insights),
    hasWiki: wiki !== null,
    now,
  };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  const { streamer, liveSlots, upcomingSlots, stats, now } = await loadStreamerPage(slug);
  if (!streamer) {
    return { title: 'Streamer not found — Streamer Times' };
  }
  // Exactly the slot the page below renders as the next stream. Taking the
  // earliest upcoming slot unfiltered (as this did) let a CANCELLED slot become
  // the snippet's "next stream" — a SERP promise the page itself contradicts.
  // `hasUpcoming` keeps the index gate on the old, wider condition.
  const meta = buildStreamerMetadata(streamer, slug, {
    liveSlot: liveSlots[0] ?? null,
    nextSlot: pickNextRealSlot(upcomingSlots, sevenDayKeys(now)),
    hasUpcoming: upcomingSlots.length > 0,
    // Already resolved by the shared cached load — no extra round-trip.
    stats,
    viewerLocale: locale,
  });
  // M22 P3 (D2): each streamer page indexes as an en + own-language hreflang
  // pair (en-only for English/unknown-language streamers); the thin-page gate
  // inside buildStreamerMetadata still wins for every variant.
  return applyLocaleSeo(
    meta,
    locale,
    `/streamer/${encodeURIComponent(slug)}`,
    streamerIndexableLocales(streamer.language),
  );
}

export default async function StreamerPage({ params }: Props) {
  const { locale: rawLocale, slug } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  const {
    streamer,
    liveSlots,
    upcomingSlots,
    history,
    stats,
    rankings,
    insightsTeaser,
    hasWiki,
    now,
  } = await loadStreamerPage(slug);
  if (!streamer) notFound();

  const lastStream = history[0] ?? null;
  const recentStreams = history.slice(1);

  // Last-stream card placement is live-aware: offline streamers get it right
  // under the hero (their most relevant content); live streamers keep it lower,
  // below Channel Stats, so the hero's live callout stays the top focus.
  const lastStreamCard = lastStream ? (
    <LastStreamCard
      stream={lastStream}
      streamerName={streamer.name}
      avatarUrl={streamer.avatar_url}
      language={locale}
    />
  ) : null;

  // Live slots show in their own hero callout + in the "Today" day-section
  // when their start_time falls on today's UTC date. Upcoming slots fill the
  // day-sections.
  const todayUtc = now.toISOString().slice(0, 10);
  const allSlots = [...liveSlots, ...upcomingSlots];
  const grouped = groupSlotsByUtcDate(allSlots);

  const sevenDays = sevenDayKeys(now);

  // Live slots that started before today's UTC date (always-on channels, but
  // also regular streams crossing midnight) get regrouped under today, so the
  // Today section always reflects the hero's live state — otherwise the slot
  // would land in a past-date bucket that is never rendered and Today could
  // claim "No streams expected" while the streamer is visibly live.
  for (const slot of liveSlots) {
    const slotDate = slot.start_time.slice(0, 10);
    if (slotDate !== todayUtc) {
      const todayBucket = grouped.get(todayUtc) ?? [];
      const oldBucket = grouped.get(slotDate);
      if (oldBucket) {
        const idx = oldBucket.indexOf(slot);
        if (idx >= 0) oldBucket.splice(idx, 1);
        if (oldBucket.length === 0) grouped.delete(slotDate);
      }
      todayBucket.unshift(slot);
      grouped.set(todayUtc, todayBucket);
    }
  }

  const heroLiveSlot = liveSlots[0] ?? null;
  const isLive = heroLiveSlot !== null;
  const showEmpty = liveSlots.length === 0 && upcomingSlots.length === 0;

  // Forward pointer for an empty "Today" row — and the same slot generateMetadata
  // announces, so the snippet and the page can never disagree about it.
  const nextRealSlot = pickNextRealSlot(upcomingSlots, sevenDays);
  // Per-day slices with their offset into the flattened 7-day slot list, so the
  // truncation below can be expressed as one global slot index. Quadratic, over
  // seven days — the running-total version reassigned a captured accumulator
  // during render, which the React compiler rejects.
  const scheduleDays = sevenDays.map((dateKey, i) => ({
    dateKey,
    slots: grouped.get(dateKey) ?? [],
    startIndex: sevenDays
      .slice(0, i)
      .reduce((n, key) => n + (grouped.get(key)?.length ?? 0), 0),
  }));
  const renderedSlotCount = scheduleDays.reduce((n, d) => n + d.slots.length, 0);
  // Two whole cards plus a clipped third. Below the threshold the button would
  // hide barely more than it shows, so the week renders in full.
  const truncateAt = renderedSlotCount > SCHEDULE_TRUNCATE_THRESHOLD
    ? SCHEDULE_VISIBLE_SLOTS
    : null;
  const collapsedSlotCount =
    truncateAt !== null ? renderedSlotCount - SCHEDULE_VISIBLE_SLOTS : 0;

  // LIVE badge markup: VideoObject with publication:BroadcastEvent while the
  // hero slot is live (null when offline or without a thumbnail). The covered
  // slot is excluded from the bare BroadcastEvents so the same broadcast never
  // appears twice with diverging endDates.
  const liveVideoJsonLd = heroLiveSlot
    ? buildLiveVideoObjectJsonLd(streamer, heroLiveSlot, slug, now)
    : null;
  const broadcastEvents = buildBroadcastEventsJsonLd(
    streamer,
    allSlots,
    slug,
    liveVideoJsonLd && heroLiveSlot ? heroLiveSlot.id : undefined,
    locale,
  );

  // Body localization (M22, D6 keying rule): the page body renders in the
  // VIEWER's locale (the [locale] route param) — /de/streamer/{german} matches
  // the pre-M22 rendering of /streamer/{german}, while the unprefixed URL is
  // now English. Content pieces (bio, stream titles) keep the streamer's
  // language via their own lang/dir attributes. <html lang> is set per locale
  // in the root layout, so <main> needs no own lang attribute anymore.
  const uiLang = locale;
  const L = uiLexFor(locale);

  // Breadcrumb names must match the visible breadcrumb below (Google guidance).
  const breadcrumb = buildBreadcrumbJsonLd([
    {
      name: L.breadcrumb.home,
      url: locale === 'en' ? 'https://streamertimes.tv' : `https://streamertimes.tv/${locale}`,
    },
    {
      name: L.breadcrumb.streamers,
      url: `https://streamertimes.tv${localeHref(locale, '/streamers')}`,
    },
    { name: streamer.name },
  ]);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(breadcrumb) }}
      />
      {/* ProfilePage wraps the Person as mainEntity; the Person keeps its
          #person @id so the BroadcastEvent broadcaster refs below resolve. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdHtml(buildProfilePageJsonLd(streamer, slug, locale)),
        }}
      />
      {liveVideoJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdHtml(liveVideoJsonLd) }}
        />
      )}
      {broadcastEvents.map((evt, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdHtml(evt) }}
        />
      ))}

      {/* Visible breadcrumb matching the BreadcrumbList JSON-LD above (the
          "Home" crumb stays JSON-LD-only, same convention as the game pages). */}
      <p className="mb-3 text-sm text-text-muted">
        <Link href={localeHref(locale, '/streamers')} className="hover:text-accent-cyan">
          {L.breadcrumb.streamers}
        </Link>{' '}
        / {streamer.name}
      </p>

      <StreamerHero
        streamer={streamer}
        liveSlot={heroLiveSlot}
        nextSlot={nextRealSlot}
        rankings={rankings}
        uiLanguage={locale}
      />

      {!isLive && lastStreamCard}

      {showEmpty ? (
        <>
          <EmptyScheduleState
            streamer={streamer}
            uiLanguage={locale}
            hasTypicalTimes={stats !== null}
          />
          {/* Pulled up out of its usual slot below: with nothing scheduled, the
              typical-times table is the page's actual answer to "when does X
              stream?" and must not sit behind Channel stats + Rankings. */}
          {stats && (
            <StreamerStatsBlock streamer={streamer} stats={stats} uiLanguage={locale} />
          )}
        </>
      ) : (
        (() => {
          const schedule = (
            <>
              <DayNavBar
                days={sevenDays}
                counts={toDayCounts(sevenDays, grouped)}
                todayUtc={todayUtc}
                language={locale}
              />
              {scheduleDays.map(({ dateKey, slots, startIndex }) => {
                const label = utcDateLabel(dateKey, todayUtc, uiLang);
                if (slots.length === 0) {
                  return (
                    <EmptyDayRow
                      key={dateKey}
                      dateKey={dateKey}
                      label={label}
                      language={locale}
                      nextSlot={dateKey === todayUtc ? nextRealSlot : null}
                      collapsed={truncateAt !== null && startIndex > truncateAt}
                    />
                  );
                }
                return (
                  <DaySection
                    key={dateKey}
                    dateKey={dateKey}
                    label={label}
                    slots={slots}
                    language={locale}
                    startIndex={startIndex}
                    truncateAt={truncateAt}
                  />
                );
              })}
            </>
          );
          if (truncateAt === null) return schedule;
          return (
            <CollapsibleSchedule
              moreLabel={slotLexFor(locale).showMoreStreams(collapsedSlotCount)}
              lessLabel={slotLexFor(locale).showFewerStreams}
            >
              {schedule}
            </CollapsibleSchedule>
          );
        })()
      )}

      {/* Channel stats + stats + recent streams + FAQ render outside the
          has-schedule branch on purpose: their SEO value is highest exactly
          when nothing is scheduled and the page would otherwise be empty
          ("when does X usually stream?" stays answered on quiet pages). */}
      <ChannelStats streamer={streamer} stats={stats} uiLanguage={locale} />
      <StreamerRankings streamer={streamer} rankings={rankings} uiLanguage={locale} />

      {isLive && lastStreamCard}

      {stats && !showEmpty && (
        <StreamerStatsBlock streamer={streamer} stats={stats} uiLanguage={locale} />
      )}

      {/* M26: wiki teaser — the main internal entry to the wiki subpage,
          rendered whenever a published profile exists. */}
      {hasWiki && (
        <WikiTeaserCard
          locale={locale}
          slug={streamer.id}
          name={streamer.name}
          title={L.wiki.teaserTitle}
          subtitle={L.wiki.teaserSub(streamer.name)}
        />
      )}

      {/* M24: insights teaser — the ONLY internal entry to the (noindex)
          insights subpage, so it renders whenever the data exists. */}
      {insightsTeaser && (
        <InsightsTeaserCard
          slug={streamer.id}
          name={streamer.name}
          bestDay={insightsTeaser.bestDay}
          median={insightsTeaser.median}
        />
      )}

      {recentStreams.length > 0 && (
        <RecentStreamsSection
          streams={recentStreams}
          now={now}
          language={locale}
        />
      )}

      <StreamerFaqBlock
        streamer={streamer}
        liveSlots={liveSlots}
        upcomingSlots={upcomingSlots}
        stats={stats}
        uiLanguage={locale}
      />

      {/* Deliberately NO Suspense around these two async sections (and no
          loading.tsx on the route): with streaming, the cached ISR HTML keeps
          the fallback skeleton + <template>-swap markup, making the
          SEO-critical internal links render JS-dependent on every hit — and a
          route-level loading shell turns notFound() into a cached soft-404
          (HTTP 200). Verified empirically 2026-07-06. Their fetches are
          parallelized inside RelatedStreamers instead. */}
      <StreamerGames slots={allSlots} language={locale} />
      <RelatedStreamers
        currentId={streamer.id}
        language={streamer.language}
        category={stats?.top_categories[0]?.category ?? null}
        uiLanguage={locale}
      />
    </main>
  );
}
