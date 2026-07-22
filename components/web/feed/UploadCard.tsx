'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Play } from 'lucide-react';
import type { YouTubeUpload } from '@/lib/feed/types';

function publishedAgo(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/**
 * YouTube upload card for the "New videos" rail (M18 Phase 5, app parity).
 * Links out to the video on YouTube (new tab); the caller logs watch_tap.
 */
export function UploadCard({
  upload,
  streamerName,
  onOpen,
}: {
  upload: YouTubeUpload;
  streamerName?: string;
  onOpen: () => void;
}) {
  const [thumbnailError, setThumbnailError] = useState(false);

  return (
    <a
      href={upload.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onOpen}
      className="block w-[200px] shrink-0 overflow-hidden rounded-xl bg-background-elevated transition-transform focus-visible:outline-none motion-safe:hover:scale-[1.02] motion-safe:focus-visible:scale-[1.02]"
      aria-label={`Video: ${upload.title ?? 'Untitled'}${streamerName ? `, ${streamerName}` : ''}`}
    >
      <div className="relative aspect-video w-full bg-background-highlight">
        {!thumbnailError && upload.thumbnailUrl ? (
          <Image
            src={upload.thumbnailUrl}
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
        <span
          className="absolute bottom-1 left-1 rounded bg-black/70 px-1 py-px text-[10px] font-semibold text-white"
          suppressHydrationWarning
        >
          YT · {publishedAgo(upload.publishedAt)}
        </span>
      </div>

      <div className="p-3">
        <p className="line-clamp-2 text-xs font-semibold text-text-primary">
          {upload.title ?? 'Untitled video'}
        </p>
        {streamerName ? (
          <p className="mt-0.5 truncate text-[11px] text-text-secondary">{streamerName}</p>
        ) : null}
      </div>
    </a>
  );
}
