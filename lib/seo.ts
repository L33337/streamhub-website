import type { Metadata } from 'next';
import type { PublicStreamer, PublicStreamSlot } from '@/lib/server/partner-api';

const SITE_URL = 'https://streamertimes.tv';

export function streamerCanonicalUrl(slug: string): string {
  return `${SITE_URL}/streamer/${encodeURIComponent(slug)}`;
}

export function buildStreamerMetadata(streamer: PublicStreamer, slug: string): Metadata {
  const platforms =
    streamer.platforms.length > 0
      ? streamer.platforms.map((p) => p[0].toUpperCase() + p.slice(1)).join(' + ')
      : 'Twitch & YouTube';
  const url = streamerCanonicalUrl(slug);
  return {
    title: `${streamer.name} — Stream Schedule & Live Status | StreamerTimes`,
    description: `When does ${streamer.name} stream live on ${platforms}? Upcoming schedule, AI-predicted next streams, and current live status.`,
    alternates: { canonical: url },
    openGraph: {
      title: `${streamer.name} — Live Stream Guide`,
      description: `Stream schedule & live status for ${streamer.name} on ${platforms}.`,
      url,
      type: 'profile',
      siteName: 'Streamer Times',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${streamer.name} — Live Stream Guide`,
      description: `Stream schedule for ${streamer.name}.`,
    },
  };
}

export function buildPersonJsonLd(streamer: PublicStreamer, slug: string): object {
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: streamer.name,
    url: streamerCanonicalUrl(slug),
  };
  if (streamer.avatar_url) ld.image = streamer.avatar_url;
  return ld;
}

export function buildBroadcastEventsJsonLd(
  streamer: PublicStreamer,
  slots: PublicStreamSlot[],
): object[] {
  return slots
    .filter((s) => !s.is_predicted && (s.status === 'live' || s.status === 'upcoming'))
    .map((slot) => {
      const start = new Date(slot.start_time);
      const durationMin = slot.duration_minutes > 0 ? slot.duration_minutes : 60;
      const end = new Date(start.getTime() + durationMin * 60_000);
      return {
        '@context': 'https://schema.org',
        '@type': 'BroadcastEvent',
        name: slot.title,
        isLiveBroadcast: true,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        videoFormat: 'Live',
        broadcaster: { '@type': 'Person', name: streamer.name },
      };
    });
}
