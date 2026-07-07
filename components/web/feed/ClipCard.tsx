'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Play, Eye } from 'lucide-react';
import type { FeedClip } from '@/lib/feed/types';
import { formatViews, formatClipDuration } from '@/lib/feed/logic';

/**
 * Twitch clip card for the horizontal Highlights rail (M16, port of the
 * app's ClipCard). The whole card links to the clip on twitch.tv (new tab);
 * the caller logs the clip_open event via onOpen.
 */
export function ClipCard({
  clip,
  streamerName,
  onOpen,
}: {
  clip: FeedClip;
  streamerName?: string;
  onOpen: () => void;
}) {
  const [thumbnailError, setThumbnailError] = useState(false);
  const duration = formatClipDuration(clip.durationSeconds);

  return (
    <a
      href={clip.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onOpen}
      className="block w-[200px] shrink-0 overflow-hidden rounded-xl bg-background-elevated transition-transform hover:scale-[1.02] focus-visible:scale-[1.02] focus-visible:outline-none"
      aria-label={`Clip: ${clip.title ?? 'Untitled'}${streamerName ? `, ${streamerName}` : ''}, ${formatViews(clip.viewCount)} views`}
    >
      <div className="relative aspect-video w-full bg-background-highlight">
        {!thumbnailError && clip.thumbnailUrl ? (
          <Image
            src={clip.thumbnailUrl}
            alt=""
            fill
            unoptimized
            sizes="200px"
            className="object-cover"
            onError={() => setThumbnailError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Play size={28} className="text-text-muted" strokeWidth={1.5} />
          </div>
        )}
        <div className="absolute left-1/2 top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/50">
          <Play size={14} className="text-white" fill="currentColor" strokeWidth={1} />
        </div>
        {duration && (
          <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-px text-[10px] font-semibold text-white">
            {duration}
          </span>
        )}
        <span className="absolute bottom-1 left-1 inline-flex items-center gap-1 rounded bg-black/70 px-1 py-px text-[10px] font-semibold text-white">
          <Eye size={10} strokeWidth={2} />
          {formatViews(clip.viewCount)}
        </span>
      </div>

      <div className="p-3">
        <p className="line-clamp-2 text-xs font-semibold text-text-primary">
          {clip.title ?? 'Untitled clip'}
        </p>
        {streamerName ? (
          <p className="mt-0.5 truncate text-[11px] text-text-secondary">{streamerName}</p>
        ) : null}
      </div>
    </a>
  );
}
