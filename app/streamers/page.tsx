import type { Metadata } from 'next';
import { StreamersIndexView, pageCanonical } from '@/components/web/StreamersIndexView';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'All Streamers A–Z — Twitch & YouTube Live Schedules | StreamerTimes',
  description:
    'Browse every Twitch and YouTube streamer tracked on Streamer Times, A to Z. See who is live now, upcoming schedules, and AI-predicted next streams.',
  alternates: { canonical: pageCanonical(1) },
  openGraph: {
    title: 'All Streamers A–Z — Twitch & YouTube Live Schedules',
    description:
      'Every Twitch and YouTube streamer tracked on Streamer Times, A to Z, with live status and AI-powered schedule predictions.',
    url: pageCanonical(1),
    siteName: 'Streamer Times',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export default function StreamersIndexPage() {
  return <StreamersIndexView page={1} />;
}
