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
} from '@/lib/seo';
import { isUiLang, localeHref, type UiLang } from '@/lib/i18n-core';
import { uiLexFor } from '@/lib/i18n-ui';
import { groupSlotsByUtcDate, utcDateLabel } from '@/lib/format/time';
import { ChannelStats } from '@/components/web/ChannelStats';
import { StreamerRankings } from '@/components/web/StreamerRankings';
import { StreamerHero } from '@/components/web/StreamerHero';
import { LastStreamCard } from '@/components/web/LastStreamCard';
import { DaySection } from '@/components/web/DaySection';
import { DayNavBar } from '@/components/web/DayNavBar';
import { EmptyDayRow } from '@/components/web/EmptyDayRow';
import { EmptyScheduleState } from '@/components/web/EmptyScheduleState';
import { RecentStreamsSection } from '@/components/web/RecentStreamsSection';
import { StreamerFaqBlock } from '@/components/web/StreamerFaqBlock';
import { StreamerStatsBlock } from '@/components/web/StreamerStatsBlock';
import { StreamerGames } from '@/components/web/StreamerGames';
import { RelatedStreamers } from '@/components/web/RelatedStreamers';

export const revalidate = 300;

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
  now: Date;
}

// Wrapped in React `cache()` so generateMetadata and the page component share a
// single fetch per request — calling it twice with the same slug is deduped.
const loadStreamerPage = cache(async (slug: string): Promise<StreamerPageData> => {
  const api = getPartnerApi();
  const now = new Date();

  const oneYearAgo = new Date(now.getTime() - 365 * 86_400_000);
  const sixHoursFromNow = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 86_400_000);

  // De-serialized cold render (M20 S1.3): the streamer lookup and the four
  // section calls are all fired concurrently. The section calls only need the
  // slug (not the streamer object), so awaiting getStreamer first would stack a
  // full partner-API round-trip in front of the section batch — ~2x p95 on a
  // first-ever (cache-MISS) render, measured at 1.5-1.8 s TTFB in Phase 0. Every
  // section call is individually safe for a non-existent slug (listSchedules →
  // empty data, getStreamerHistory → [] via its rejection handler, getStreamerStats
  // → null), so on the rare 404 we simply discard their in-flight results below.
  const streamerCall = api.getStreamer(slug);
  // Live + upcoming are split because the partner API filters by start_time >= from,
  // which would exclude currently-live slots that started hours ago and always-on
  // slots whose start_time is days in the past. Splitting keeps the upcoming
  // window tight while still capturing live.
  const liveCall = api.listSchedules({
    streamerIds: [slug],
    status: ['live'],
    includeAlwaysOn: true,
    from: oneYearAgo.toISOString(),
    to: sixHoursFromNow.toISOString(),
    limit: 10,
  });
  const upcomingCall = api.listSchedules({
    streamerIds: [slug],
    status: ['upcoming'],
    includePredictions: true,
    includeAlwaysOn: true,
    from: now.toISOString(),
    to: sevenDaysFromNow.toISOString(),
    limit: 100,
  });
  // Best-effort: unlike getLastStream, getStreamerHistory does NOT swallow errors
  // — the rejection handler here is load-bearing so a failing history lookup never
  // rejects or breaks the page. Newest first; [0] feeds LastStreamCard, [1..8] the
  // Recent-streams list.
  //
  // `limit` counts broadcast SESSIONS, so 9 really is 9 distinct streams: the API
  // folds a Twitch+YouTube simulcast into one item. Before that merge landed, a
  // simulcasting streamer got ~4 actual broadcasts out of these 9 slots, each
  // listed twice under two platform badges.
  const historyCall = api.getStreamerHistory(slug, { limit: 9 }).then(
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

  const streamer = await streamerCall;
  if (!streamer) {
    // 404: discard the in-flight section calls. allSettled attaches a handler to
    // each so a rejected live/upcoming fetch can't surface as an unhandled
    // rejection — but we do NOT await it, so notFound() is not delayed.
    void Promise.allSettled([liveCall, upcomingCall, historyCall, statsCall, rankingsCall]);
    return {
      streamer: null,
      liveSlots: [],
      upcomingSlots: [],
      history: [],
      stats: null,
      rankings: null,
      now,
    };
  }

  // Valid slug: await the section batch. A live/upcoming rejection still
  // propagates here exactly as before (the page errors rather than silently
  // dropping schedule data).
  const [liveCall_, upcomingCall_, history, stats, rankings] = await Promise.all([
    liveCall,
    upcomingCall,
    historyCall,
    statsCall,
    rankingsCall,
  ]);

  return {
    streamer,
    liveSlots: liveCall_.data,
    upcomingSlots: upcomingCall_.data,
    history,
    stats,
    rankings,
    now,
  };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  const { streamer, liveSlots, upcomingSlots } = await loadStreamerPage(slug);
  if (!streamer) {
    return { title: 'Streamer not found — StreamerTimes' };
  }
  // Earliest upcoming slot drives the "next stream" meta text.
  const nextSlot =
    [...upcomingSlots].sort((a, b) => a.start_time.localeCompare(b.start_time))[0] ?? null;
  const meta = buildStreamerMetadata(streamer, slug, {
    liveSlot: liveSlots[0] ?? null,
    nextSlot,
    viewerLocale: locale,
  });
  return applyLocaleSeo(meta, locale, `/streamer/${encodeURIComponent(slug)}`);
}

export default async function StreamerPage({ params }: Props) {
  const { locale: rawLocale, slug } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  const { streamer, liveSlots, upcomingSlots, history, stats, rankings, now } =
    await loadStreamerPage(slug);
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

  const sevenDays: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getTime() + i * 86_400_000);
    sevenDays.push(d.toISOString().slice(0, 10));
  }

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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {/* ProfilePage wraps the Person as mainEntity; the Person keeps its
          #person @id so the BroadcastEvent broadcaster refs below resolve. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildProfilePageJsonLd(streamer, slug)),
        }}
      />
      {liveVideoJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(liveVideoJsonLd) }}
        />
      )}
      {broadcastEvents.map((evt, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(evt) }}
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

      <StreamerHero streamer={streamer} liveSlot={heroLiveSlot} uiLanguage={locale} />

      {!isLive && lastStreamCard}

      {showEmpty ? (
        <EmptyScheduleState streamer={streamer} uiLanguage={locale} />
      ) : (
        <>
          <DayNavBar
            days={sevenDays}
            grouped={grouped}
            todayUtc={todayUtc}
            language={locale}
          />
          {sevenDays.map((dateKey) => {
            const slots = grouped.get(dateKey) ?? [];
            const label = utcDateLabel(dateKey, todayUtc, uiLang);
            if (slots.length === 0) {
              return (
                <EmptyDayRow
                  key={dateKey}
                  dateKey={dateKey}
                  label={label}
                  language={locale}
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
              />
            );
          })}
        </>
      )}

      {/* Channel stats + stats + recent streams + FAQ render outside the
          has-schedule branch on purpose: their SEO value is highest exactly
          when nothing is scheduled and the page would otherwise be empty
          ("when does X usually stream?" stays answered on quiet pages). */}
      <ChannelStats streamer={streamer} stats={stats} uiLanguage={locale} />
      <StreamerRankings streamer={streamer} rankings={rankings} uiLanguage={locale} />

      {isLive && lastStreamCard}

      {stats && <StreamerStatsBlock streamer={streamer} stats={stats} uiLanguage={locale} />}

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
        uiLanguage={locale}
      />
    </main>
  );
}
