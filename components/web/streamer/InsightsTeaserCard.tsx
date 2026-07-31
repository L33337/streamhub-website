// M24: compact teaser for the (noindex) streamer insights page — the only
// entry point besides direct links, so it renders whenever insights data
// exists. Server component; numbers are nightly aggregates (UTC weekdays).

import Link from 'next/link';
import { BarChart3 } from 'lucide-react';

export function InsightsTeaserCard({
  slug,
  name,
  bestDay,
  median,
}: {
  slug: string;
  name: string;
  bestDay: string;
  median: number;
}) {
  return (
    <section aria-label={`${name} streaming insights teaser`} className="mt-8">
      <Link
        href={`/streamer/${encodeURIComponent(slug)}/insights`}
        className="group flex items-center gap-4 rounded-xl border border-border-default bg-background-elevated p-4 transition-colors hover:border-accent-cyan/60 hover:bg-background-highlight"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border-default bg-background text-accent-cyan">
          <BarChart3 size={20} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-text-primary group-hover:text-accent-cyan">
            Streaming insights
          </span>
          <span className="mt-0.5 block truncate text-xs text-text-secondary">
            {/* Interpolated strings — adjacent JSX text nodes drop spaces
                (the documented "VALORANTstreamers" bug). */}
            {'Best day: '}
            <span className="font-semibold text-text-primary">{bestDay}</span>
            {` · ~${median} median viewers — viewer patterns, category performance & benchmarks`}
          </span>
        </span>
        <span aria-hidden="true" className="shrink-0 text-accent-cyan">
          →
        </span>
      </Link>
    </section>
  );
}
