import { cache } from 'react';
import type { Metadata } from 'next';
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
  buildPersonJsonLd,
  buildStreamerMetadata,
} from '@/lib/seo';
import { groupSlotsByUtcDate, utcDateLabel } from '@/lib/format/time';
import { StreamerHero } from '@/components/web/StreamerHero';
import { LastStreamCard } from '@/components/web/LastStreamCard';
import { DaySection } from '@/components/web/DaySection';
import { DayNavBar } from '@/components/web/DayNavBar';
import { EmptyDayRow } from '@/components/web/EmptyDayRow';
import { EmptyScheduleState } from '@/components/web/EmptyScheduleState';
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
  lastStream: PublicStreamHistory | null;
  stats: PublicStreamerStats | null;
  now: Date;
}

// Wrapped in React `cache()` so generateMetadata and the page component share a
// single fetch per request — calling it twice with the same slug is deduped.
const loadStreamerPage = cache(async (slug: string): Promise<StreamerPageData> => {
  const api = getPartnerApi();
  const now = new Date();
  const streamer = await api.getStreamer(slug);
  if (!streamer) {
    return {
      streamer: null,
      liveSlots: [],
      upcomingSlots: [],
      lastStream: null,
      stats: null,
      now,
    };
  }

  const oneYearAgo = new Date(now.getTime() - 365 * 86_400_000);
  const sixHoursFromNow = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 86_400_000);

  // Two parallel calls — the partner API filters by start_time >= from,
  // which would exclude currently-live slots that started hours ago and
  // always-on slots whose start_time is days in the past. Splitting the
  // queries keeps the upcoming window tight while still capturing live.
  const [liveCall, upcomingCall, lastStream, stats] = await Promise.all([
    api.listSchedules({
      streamerIds: [slug],
      status: ['live'],
      includeAlwaysOn: true,
      from: oneYearAgo.toISOString(),
      to: sixHoursFromNow.toISOString(),
      limit: 10,
    }),
    api.listSchedules({
      streamerIds: [slug],
      status: ['upcoming'],
      includePredictions: true,
      includeAlwaysOn: true,
      from: now.toISOString(),
      to: sevenDaysFromNow.toISOString(),
      limit: 100,
    }),
    // Best-effort: getLastStream swallows errors to null, so a failing history
    // lookup never rejects this Promise.all or breaks the page.
    api.getLastStream(slug),
    // Best-effort too: getStreamerStats collapses errors AND has_stats:false
    // to null. Cached for 1h in the data cache (stats move daily at most).
    api.getStreamerStats(slug),
  ]);

  return {
    streamer,
    liveSlots: liveCall.data,
    upcomingSlots: upcomingCall.data,
    lastStream,
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
  const { streamer, liveSlots, upcomingSlots, lastStream, stats, now } =
    await loadStreamerPage(slug);
  if (!streamer) notFound();

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
  const broadcastEvents = buildBroadcastEventsJsonLd(streamer, allSlots, slug);

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'Home', url: 'https://streamertimes.tv' },
    { name: 'Streamers', url: 'https://streamertimes.tv/streamers' },
    { name: streamer.name },
  ]);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildPersonJsonLd(streamer, slug)),
        }}
      />
      {broadcastEvents.map((evt, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(evt) }}
        />
      ))}

      <StreamerHero streamer={streamer} liveSlot={heroLiveSlot} />

      {lastStream && (
        <LastStreamCard
          stream={lastStream}
          streamerName={streamer.name}
          avatarUrl={streamer.avatar_url}
        />
      )}

      {showEmpty ? (
        <EmptyScheduleState streamer={streamer} />
      ) : (
        <>
          <DayNavBar days={sevenDays} grouped={grouped} todayUtc={todayUtc} />
          {sevenDays.map((dateKey) => {
            const slots = grouped.get(dateKey) ?? [];
            const label = utcDateLabel(dateKey, todayUtc);
            if (slots.length === 0) {
              return <EmptyDayRow key={dateKey} dateKey={dateKey} label={label} />;
            }
            return (
              <DaySection
                key={dateKey}
                dateKey={dateKey}
                label={label}
                slots={slots}
              />
            );
          })}
        </>
      )}

      {/* Stats + FAQ render outside the has-schedule branch on purpose: their
          SEO value is highest exactly when nothing is scheduled and the page
          would otherwise be empty ("when does X usually stream?" stays
          answered on quiet pages). */}
      {stats && <StreamerStatsBlock streamer={streamer} stats={stats} />}

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
      <StreamerGames slots={allSlots} />
      <RelatedStreamers currentId={streamer.id} language={streamer.language} />
    </main>
  );
}
