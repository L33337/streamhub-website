import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getPartnerApi,
  type PublicStreamer,
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
import { EmptyScheduleState } from '@/components/web/EmptyScheduleState';
import { StreamerFaqBlock } from '@/components/web/StreamerFaqBlock';

export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
}

interface StreamerPageData {
  streamer: PublicStreamer | null;
  liveSlots: PublicStreamSlot[];
  upcomingSlots: PublicStreamSlot[];
  lastStream: PublicStreamHistory | null;
  now: Date;
}

// Wrapped in React `cache()` so generateMetadata and the page component share a
// single fetch per request — calling it twice with the same slug is deduped.
const loadStreamerPage = cache(async (slug: string): Promise<StreamerPageData> => {
  const api = getPartnerApi();
  const now = new Date();
  const streamer = await api.getStreamer(slug);
  if (!streamer) {
    return { streamer: null, liveSlots: [], upcomingSlots: [], lastStream: null, now };
  }

  const oneYearAgo = new Date(now.getTime() - 365 * 86_400_000);
  const sixHoursFromNow = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 86_400_000);

  // Two parallel calls — the partner API filters by start_time >= from,
  // which would exclude currently-live slots that started hours ago and
  // always-on slots whose start_time is days in the past. Splitting the
  // queries keeps the upcoming window tight while still capturing live.
  const [liveCall, upcomingCall, lastStream] = await Promise.all([
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
  ]);

  return {
    streamer,
    liveSlots: liveCall.data,
    upcomingSlots: upcomingCall.data,
    lastStream,
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
  const { streamer, liveSlots, upcomingSlots, lastStream, now } = await loadStreamerPage(slug);
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

  // Always-on live slots get their start_time normalised to today's UTC date
  // for grouping purposes so they appear in the Today section.
  const alwaysOnLive = liveSlots.filter((s) => s.is_always_on);
  for (const slot of alwaysOnLive) {
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

          <StreamerFaqBlock
            streamer={streamer}
            liveSlots={liveSlots}
            upcomingSlots={upcomingSlots}
          />
        </>
      )}
    </main>
  );
}
