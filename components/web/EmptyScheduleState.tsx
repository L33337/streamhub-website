import Link from 'next/link';
import type { PublicStreamer } from '@/lib/server/partner-api';

export function EmptyScheduleState({ streamer }: { streamer: PublicStreamer }) {
  const platforms =
    streamer.platforms.length > 0
      ? streamer.platforms.map((p) => (p === 'twitch' ? 'Twitch' : 'YouTube')).join(' and ')
      : 'Twitch and YouTube';

  return (
    <section
      className="mt-10 gradient-border p-8 text-center"
      aria-labelledby="empty-heading"
    >
      <h2 id="empty-heading" className="text-2xl font-bold text-white">
        No upcoming streams scheduled
      </h2>
      <p className="mt-3 text-text-secondary max-w-xl mx-auto">
        We track {streamer.name}&apos;s livestreams on {platforms}. AI predictions
        and confirmed schedules will appear here once enough history is collected.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center rounded-lg border border-accent-cyan/60 bg-accent-cyan/10 px-4 py-2 text-sm font-semibold text-accent-cyan hover:bg-accent-cyan/20 transition-colors"
        >
          Browse all streamers
        </Link>
        <Link
          href="/app"
          className="inline-flex items-center rounded-lg border border-border-default bg-background-elevated px-4 py-2 text-sm font-semibold text-text-primary hover:border-accent-cyan/40 transition-colors"
        >
          Get the app
        </Link>
      </div>
    </section>
  );
}
