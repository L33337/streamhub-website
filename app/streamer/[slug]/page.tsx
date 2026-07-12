import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getPartnerApi,
  type PublicStreamer,
  type PublicStreamerStats,
  type PublicStreamSlot,
  type PublicStreamHistory,
} from '@/lib/server/partner-api';
import {
  buildBreadcrumbJsonLd,
  buildBroadcastEventsJsonLd,
  buildLiveVideoObjectJsonLd,
  buildProfilePageJsonLd,
  buildStreamerMetadata,
} from '@/lib/seo';
import { resolveUiLang } from '@/lib/i18n-core';
import { uiLexFor } from '@/lib/i18n-ui';
import { groupSlotsByUtcDate, utcDateLabel } from '@/lib/format/time';
import { ChannelStats } from '@/components/web/ChannelStats';
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
  params: Promise<{ slug: string }>;
}

interface StreamerPageData {
  streamer: PublicStreamer | null;
  liveSlots: PublicStreamSlot[];
  upcomingSlots: PublicStreamSlot[];
  /** Finished broadcasts, newest first ([0] feeds LastStreamCard, the rest the Recent-streams list). */
  history: PublicStreamHistory[];
  stats: PublicStreamerStats | null;
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
  const historyCall = api.getStreamerHistory(slug, { limit: 9 }).then(
    (page) => page.data,
    () => [] as PublicStreamHistory[],
  );
  // Best-effort too: getStreamerStats collapses errors AND has_stats:false to null.
  // Cached for 1h in the data cache (stats move daily at most).
  const statsCall = api.getStreamerStats(slug);

  const streamer = await streamerCall;
  if (!streamer) {
    // 404: discard the in-flight section calls. allSettled attaches a handler to
    // each so a rejected live/upcoming fetch can't surface as an unhandled
    // rejection — but we do NOT await it, so notFound() is not delayed.
    void Promise.allSettled([liveCall, upcomingCall, historyCall, statsCall]);
    return {
      streamer: null,
      liveSlots: [],
      upcomingSlots: [],
      history: [],
      stats: null,
      now,
    };
  }

  // Valid slug: await the section batch. A live/upcoming rejection still
  // propagates here exactly as before (the page errors rather than silently
  // dropping schedule data).
  const [liveCall_, upcomingCall_, history, stats] = await Promise.all([
    liveCall,
    upcomingCall,
    historyCall,
    statsCall,
  ]);

  return {
    streamer,
    liveSlots: liveCall_.data,
    upcomingSlots: upcomingCall_.data,
    history,
    stats,
    now,
  };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { streamer, liveSlots, upcomingSlots } = await loadStreamerPage(slug);
  if (!streamer) {
    return { title: 'Streamer not found — StreamerTimes' };
  }
  // Earliest upcoming slot drives the "next stream" meta text.
  const nextSlot =
    [...upcomingSlots].sort((a, b) => a.start_time.localeCompare(b.start_time))[0] ?? null;
  return buildStreamerMetadata(streamer, slug, {
    liveSlot: liveSlots[0] ?? null,
    nextSlot,
  });
}

export default async function StreamerPage({ params }: Props) {
  const { slug } = await params;
  const { streamer, liveSlots, upcomingSlots, history, stats, now } =
    await loadStreamerPage(slug);
  if (!streamer) notFound();

  const lastStream = history[0] ?? null;
  const recentStreams = history.slice(1);

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

  // Body localization: the page body renders in the streamer's language (their
  // search queries arrive in that language); unknown/unsupported languages fall
  // back to English and get no lang attribute. UI chrome (header/footer) and
  // <html lang="en"> stay English — the localized <main> carries its own lang.
  const uiLang = resolveUiLang(streamer.language);
  const L = uiLexFor(streamer.language);

  // Breadcrumb names must match the visible breadcrumb below (Google guidance).
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: L.breadcrumb.home, url: 'https://streamertimes.tv' },
    { name: L.breadcrumb.streamers, url: 'https://streamertimes.tv/streamers' },
    { name: streamer.name },
  ]);

  return (
    <main
      className="container mx-auto max-w-5xl px-4 py-8"
      lang={uiLang !== 'en' ? uiLang : undefined}
    >
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
        <Link href="/streamers" className="hover:text-accent-cyan">
          {L.breadcrumb.streamers}
        </Link>{' '}
        / {streamer.name}
      </p>

      <StreamerHero streamer={streamer} liveSlot={heroLiveSlot} />

      {lastStream && (
        <LastStreamCard
          stream={lastStream}
          streamerName={streamer.name}
          avatarUrl={streamer.avatar_url}
          language={streamer.language}
        />
      )}

      {showEmpty ? (
        <EmptyScheduleState streamer={streamer} />
      ) : (
        <>
          <DayNavBar
            days={sevenDays}
            grouped={grouped}
            todayUtc={todayUtc}
            language={streamer.language ?? undefined}
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
                  language={streamer.language ?? undefined}
                />
              );
            }
            return (
              <DaySection
                key={dateKey}
                dateKey={dateKey}
                label={label}
                slots={slots}
                language={streamer.language ?? undefined}
              />
            );
          })}
        </>
      )}

      {/* Channel stats + stats + recent streams + FAQ render outside the
          has-schedule branch on purpose: their SEO value is highest exactly
          when nothing is scheduled and the page would otherwise be empty
          ("when does X usually stream?" stays answered on quiet pages). */}
      <ChannelStats streamer={streamer} stats={stats} />

      {stats && <StreamerStatsBlock streamer={streamer} stats={stats} />}

      {recentStreams.length > 0 && (
        <RecentStreamsSection
          streams={recentStreams}
          now={now}
          language={streamer.language}
        />
      )}

      <StreamerFaqBlock
        streamer={streamer}
        liveSlots={liveSlots}
        upcomingSlots={upcomingSlots}
        stats={stats}
      />

      {/* Deliberately NO Suspense around these two async sections (and no
          loading.tsx on the route): with streaming, the cached ISR HTML keeps
          the fallback skeleton + <template>-swap markup, making the
          SEO-critical internal links render JS-dependent on every hit — and a
          route-level loading shell turns notFound() into a cached soft-404
          (HTTP 200). Verified empirically 2026-07-06. Their fetches are
          parallelized inside RelatedStreamers instead. */}
      <StreamerGames slots={allSlots} language={streamer.language} />
      <RelatedStreamers currentId={streamer.id} language={streamer.language} />
    </main>
  );
}
