'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { FeedRecentStream } from '@/lib/feed/types';
import { endedAgoLabel, formatDuration } from '@/lib/feed/logic';
import { initialsFromName } from '@/components/web/InitialsAvatar';
import { sizedAvatarUrl, sizedCdnImageUrl } from '@/lib/format/image-size';

/**
 * "New for you" card (M16, port of the app's FeedVodCard): a stream that
 * ended since the user's last visit. With a VOD the card opens it in a new
 * tab; without one it links to the streamer page. The caller logs the
 * watch_tap event via onWatch (fired either way, app parity).
 */
export function FeedVodCard({
  stream,
  onWatch,
}: {
  stream: FeedRecentStream;
  onWatch: () => void;
}) {
  const [thumbnailError, setThumbnailError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const inner = (
    <article className="flex gap-3 overflow-hidden rounded-xl bg-background-elevated transition-colors hover:bg-background-highlight">
      <div className="relative aspect-video w-32 shrink-0 bg-background-highlight sm:w-40">
        {!thumbnailError && stream.thumbnailUrl ? (
          <Image
            src={sizedCdnImageUrl(stream.thumbnailUrl, 160)}
            alt=""
            fill
            unoptimized
            sizes="(min-width: 640px) 160px, 128px"
            className="object-cover"
            onError={() => setThumbnailError(true)}
          />
        ) : !avatarError && stream.avatarUrl ? (
          <div className="flex h-full w-full items-center justify-center">
            <Image
              src={sizedAvatarUrl(stream.avatarUrl, 48)}
              alt=""
              width={48}
              height={48}
              unoptimized
              className="rounded-full"
              onError={() => setAvatarError(true)}
            />
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xl font-bold text-text-muted">
            {initialsFromName(stream.streamerName)}
          </div>
        )}
        {stream.vodUrl && (
          <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 py-px text-[9px] font-bold tracking-wide text-white">
            VOD
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1 py-2 pr-3">
        <p className="truncate text-sm font-bold text-text-primary">{stream.streamerName}</p>
        <p className="line-clamp-2 text-sm text-text-secondary">
          {stream.title ?? 'Untitled stream'}
        </p>
        {stream.category ? (
          <p className="mt-0.5 truncate text-xs text-accent-cyan">{stream.category}</p>
        ) : null}
        <p className="mt-0.5 text-xs text-text-muted" suppressHydrationWarning>
          {endedAgoLabel(stream.endedAt)} · {formatDuration(stream.durationMinutes)}
        </p>
      </div>
    </article>
  );

  if (stream.vodUrl) {
    return (
      <a
        href={stream.vodUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onWatch}
        className="block focus-visible:outline-none"
        aria-label={`${stream.streamerName}, ${stream.title ?? 'stream'}, watch VOD`}
      >
        {inner}
      </a>
    );
  }

  return (
    <Link
      href={`/streamer/${encodeURIComponent(stream.streamerId)}`}
      prefetch={false}
      onClick={onWatch}
      className="block focus-visible:outline-none"
      aria-label={`${stream.streamerName}, ${stream.title ?? 'stream'}`}
    >
      {inner}
    </Link>
  );
}
