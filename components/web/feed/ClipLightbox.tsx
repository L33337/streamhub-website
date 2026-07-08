'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { ClipEmbedFrame } from '@/components/web/ClipEmbedFrame';
import { logFeedEvent } from '@/lib/feed/events';
import type { FeedClip } from '@/lib/feed/types';

/**
 * In-feed clip player lightbox (M18 Phase 1, website half of the app's
 * ClipPlayerModal). Plays via the official Twitch embed; logs
 * clip_play_start on open and clip_play_end (open→close seconds) on close.
 */
export function ClipLightbox({
  clip,
  streamerName,
  onClose,
}: {
  clip: FeedClip;
  streamerName?: string;
  onClose: () => void;
}) {
  const startedAtRef = useRef<number>(0);

  useEffect(() => {
    startedAtRef.current = Date.now();
    logFeedEvent({
      event: 'clip_play_start',
      itemType: 'clip',
      itemId: clip.id,
      streamerId: clip.streamerId,
      category: clip.category,
    });

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      logFeedEvent({
        event: 'clip_play_end',
        itemType: 'clip',
        itemId: clip.id,
        streamerId: clip.streamerId,
        category: clip.category,
        durationSeconds: Math.max(0, Math.round((Date.now() - startedAtRef.current) / 1000)),
      });
    };
    // The lightbox is remounted per clip (keyed by caller) — clip is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Clip: ${clip.title ?? 'Untitled'}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-4xl">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {clip.title ?? 'Untitled clip'}
            </p>
            {streamerName ? (
              <p className="truncate text-xs text-text-secondary">{streamerName}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close player"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background-elevated text-text-secondary transition-colors hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
        <ClipEmbedFrame slug={clip.externalClipId} className="aspect-video w-full border-0" />
        <div className="mt-2 text-center">
          <a
            href={clip.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-text-secondary transition-colors hover:text-white"
          >
            Watch on Twitch
          </a>
        </div>
      </div>
    </div>
  );
}
