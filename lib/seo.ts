import type { Metadata } from 'next';
import type { PublicStreamer, PublicStreamSlot } from '@/lib/server/partner-api';

const SITE_URL = 'https://streamertimes.tv';

export function streamerCanonicalUrl(slug: string): string {
  return `${SITE_URL}/streamer/${encodeURIComponent(slug)}`;
}

/**
 * BreadcrumbList JSON-LD. Pass crumbs in order from root to current page.
 * The final crumb (current page) omits `url` per Google's guidance — the
 * trailing item should not link to itself.
 */
export function buildBreadcrumbJsonLd(
  items: { name: string; url?: string }[],
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => {
      const element: Record<string, unknown> = {
        '@type': 'ListItem',
        position: i + 1,
        name: item.name,
      };
      if (item.url) element.item = item.url;
      return element;
    }),
  };
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

/**
 * Stable JSON-LD identifier for the streamer's Person node. Referenced from
 * BroadcastEvent.broadcaster.@id so Google can resolve them as one graph.
 */
function personJsonLdId(slug: string): string {
  return `${streamerCanonicalUrl(slug)}#person`;
}

export function buildPersonJsonLd(streamer: PublicStreamer, slug: string): object {
  const canonicalUrl = streamerCanonicalUrl(slug);
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': personJsonLdId(slug),
    name: streamer.name,
    url: canonicalUrl,
  };
  if (streamer.avatar_url) ld.image = streamer.avatar_url;
  if (streamer.description) ld.description = streamer.description;
  // schema.org: `inLanguage` is not valid on Person — use `knowsLanguage`
  // ("a known language for a person"). BCP-47 string is accepted.
  if (streamer.language) ld.knowsLanguage = streamer.language;

  // sameAs: platform identity verification for Google Knowledge Graph
  const sameAs: string[] = [];
  if (streamer.twitch_login) {
    sameAs.push(`https://twitch.tv/${streamer.twitch_login}`);
  }
  if (streamer.youtube_channel_id) {
    sameAs.push(`https://youtube.com/channel/${streamer.youtube_channel_id}`);
  }
  if (sameAs.length > 0) ld.sameAs = sameAs;

  return ld;
}

// Cap the number of BroadcastEvents per page. Some streamers have 15+ predicted
// upcoming slots in a 7-day window; emitting all of them risks tripping Google's
// schema-spam quality filter. 10 events ≈ next 3-4 days, plenty for SERP snippets.
const MAX_BROADCAST_EVENTS = 10;

export function buildBroadcastEventsJsonLd(
  streamer: PublicStreamer,
  slots: PublicStreamSlot[],
  slug: string,
): object[] {
  const broadcasterRef = { '@id': personJsonLdId(slug) };
  return slots
    .filter((s) => s.status === 'live' || s.status === 'upcoming')
    .slice(0, MAX_BROADCAST_EVENTS)
    .map((slot) => {
      const start = new Date(slot.start_time);
      const durationMin = slot.duration_minutes > 0 ? slot.duration_minutes : 60;
      const end = new Date(start.getTime() + durationMin * 60_000);
      const event: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'BroadcastEvent',
        name: slot.title,
        isLiveBroadcast: true,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        broadcaster: broadcasterRef,
      };
      // inLanguage IS valid on Event/BroadcastEvent. Helps non-English fans find the schedule.
      if (streamer.language) event.inLanguage = streamer.language;
      // Use the AI's reasoning as the event description when available — meaningful
      // SEO copy that explains why this slot was predicted.
      if (slot.reasoning) event.description = slot.reasoning;
      return event;
    });
}
