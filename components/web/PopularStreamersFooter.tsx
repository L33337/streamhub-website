import Link from 'next/link';
import type { PublicStreamer } from '@/lib/server/partner-api';

interface Props {
  streamers: PublicStreamer[];
}

export function PopularStreamersFooter({ streamers }: Props) {
  if (streamers.length === 0) return null;
  return (
    <footer
      className="mt-20 border-t border-divider pt-8"
      aria-labelledby="popular-heading"
    >
      <div className="flex items-center justify-between gap-4">
        <h2
          id="popular-heading"
          className="text-sm font-bold uppercase tracking-widest text-text-muted"
        >
          Popular streamers
        </h2>
        <Link
          href="/streamers"
          className="shrink-0 text-sm font-semibold text-accent-cyan transition-colors hover:text-text-primary"
        >
          View all streamers →
        </Link>
      </div>
      <nav aria-label="Popular streamers" className="mt-4 flex flex-wrap gap-2">
        {streamers.map((s) => (
          <Link
            key={s.id}
            href={`/streamer/${encodeURIComponent(s.id)}`}
            className="inline-flex items-center rounded-full border border-border-default bg-background-elevated px-3 py-1.5 text-sm text-text-secondary transition-colors hover:border-accent-cyan/60 hover:text-text-primary"
          >
            {s.name}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
