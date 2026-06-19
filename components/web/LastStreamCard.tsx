import Image from 'next/image';
import type { PublicStreamHistory } from '@/lib/server/partner-api';
import { formatDuration, formatTimeAgo } from '@/lib/format/time';
import { PlatformBadge } from './Badges';

function PlaceholderThumbnail({ name }: { name: string }) {
  const letter = (name?.trim()?.[0] ?? '?').toUpperCase();
  return (
    <div
      aria-hidden="true"
      className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent-purple/40 to-accent-cyan/30 text-2xl font-bold text-white"
    >
      {letter}
    </div>
  );
}

const THUMB_SIZES =
  '(min-width: 1024px) 224px, (min-width: 768px) 176px, (min-width: 640px) 144px, 112px';

// Twitch returns this placeholder while a freshly-ended VOD's thumbnail is still being
// generated. The collector already stores it as null, but guard here too so a stale
// placeholder URL can never render as the grey 404 image — fall back to the avatar instead.
function usableThumbnail(url: string | null): string | null {
  if (!url || url.includes('/_404/404_processing')) return null;
  return url;
}

interface Props {
  stream: PublicStreamHistory;
  streamerName: string;
  avatarUrl: string | null;
}

/**
 * "Last stream" section for the streamer detail page — the streamer's most
 * recent finished broadcast (thumbnail, title, category, when it aired,
 * duration). Server-rendered: the relative-time label is computed once at
 * request time, so there is no client hydration of a drifting value.
 *
 * Links to the VOD when one is available; otherwise renders as a static card.
 */
export function LastStreamCard({ stream, streamerName, avatarUrl }: Props) {
  const title = stream.title?.trim() || 'Past stream';
  const aired = formatTimeAgo(stream.started_at);
  const duration =
    stream.duration_minutes != null ? formatDuration(stream.duration_minutes) : '';
  const meta = [aired, duration].filter(Boolean).join(' · ');
  const thumbnailUrl = usableThumbnail(stream.thumbnail_url);

  const card = (
    <article className="flex gap-3 rounded-xl bg-background-elevated p-3 gradient-border glow-cyan">
      <div className="relative aspect-[3/2] w-28 flex-shrink-0 overflow-hidden rounded-lg bg-background-highlight sm:w-36 md:w-44 lg:w-56">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt=""
            fill
            unoptimized
            sizes={THUMB_SIZES}
            className="object-cover"
          />
        ) : avatarUrl ? (
          <Image
            src={avatarUrl}
            alt=""
            fill
            unoptimized
            sizes={THUMB_SIZES}
            className="object-cover"
          />
        ) : (
          <PlaceholderThumbnail name={streamerName} />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
        <div className="min-w-0">
          <span className="truncate text-xs text-text-secondary">{meta}</span>
          <h3
            className="mt-1 text-sm font-bold uppercase tracking-wide text-text-primary line-clamp-2"
            title={title}
          >
            {title}
          </h3>
          {stream.category ? (
            <p className="truncate text-xs text-text-secondary">{stream.category}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <PlatformBadge platform={stream.platform} size="sm" />
          {stream.vod_url ? (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-accent-cyan">
              Watch VOD →
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );

  return (
    <section className="mt-10">
      <h2 className="text-2xl font-bold text-white mb-4">Last stream</h2>
      {stream.vod_url ? (
        <a
          href={stream.vod_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block transition-transform hover:scale-[1.01] focus-visible:scale-[1.01] focus-visible:outline-none"
          aria-label={`Watch ${streamerName}'s last stream: ${title}`}
        >
          {card}
        </a>
      ) : (
        card
      )}
    </section>
  );
}
