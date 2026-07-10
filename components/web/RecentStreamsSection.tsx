import type { PublicStreamHistory } from '@/lib/server/partner-api';
import { formatDuration, formatTimeAgo, formatUtcDateShort } from '@/lib/format/time';
import { PlatformBadge } from './Badges';

interface Props {
  /** Finished broadcasts, newest first — already excludes the LastStreamCard item. */
  streams: PublicStreamHistory[];
  /** Request-time clock so the relative labels match the page's other timestamps. */
  now: Date;
}

/**
 * "Recent streams" list for the streamer detail page: the broadcasts before the
 * most recent one (that one has its own LastStreamCard). Compact text rows, no
 * thumbnails — the value is the crawlable date/title/category/duration record,
 * which keeps answering "what has {name} streamed lately?" even on pages with
 * nothing scheduled. Server-rendered from props; the parent guards against an
 * empty list.
 */
export function RecentStreamsSection({ streams, now }: Props) {
  if (streams.length === 0) return null;

  return (
    <section className="mt-10" aria-labelledby="recent-streams-heading">
      <h2 id="recent-streams-heading" className="text-2xl font-bold text-white mb-4">
        Recent streams
      </h2>
      <ul className="grid gap-2">
        {streams.map((s) => {
          const title = s.title?.trim() || 'Past stream';
          const duration =
            s.duration_minutes != null ? formatDuration(s.duration_minutes) : '';
          return (
            <li
              key={s.id}
              className="flex items-baseline gap-3 rounded-xl border border-border-default bg-background-elevated px-3 py-2"
            >
              <div className="w-28 shrink-0 text-xs text-text-muted sm:w-36">
                <time dateTime={s.started_at} className="block text-text-secondary">
                  {formatUtcDateShort(s.started_at)}
                </time>
                {formatTimeAgo(s.started_at, 'en', now)}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-sm font-semibold text-text-primary"
                  title={title}
                >
                  {title}
                </p>
                <p className="truncate text-xs text-text-muted">
                  {[s.category, duration].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 self-center">
                <PlatformBadge platform={s.platform} size="sm" />
                {s.vod_url ? (
                  <a
                    href={s.vod_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-semibold uppercase tracking-wider text-accent-cyan hover:text-text-primary"
                    aria-label={`Watch VOD: ${title}`}
                  >
                    VOD →
                  </a>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
