'use client';

import { useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { ClipEmbedFrame } from '@/components/web/ClipEmbedFrame';
import { logFeedEvent } from '@/lib/feed/events';
import type { FeedClip } from '@/lib/feed/types';

/**
 * In-feed clip player lightbox (M18 Phase 1, website half of the app's
 * ClipPlayerModal). Plays via the official Twitch embed; logs
 * clip_play_start on open and clip_play_end (open→close seconds) on close.
 *
 * Feed UX round 2026-07-22: optional `playlist` + `onNavigate` turn the
 * lightbox into a lean-back browser — prev/next buttons and ←/→ keys walk
 * the rail the clip was opened from without closing. The caller remounts
 * per clip (key), which keeps the per-clip play_start/play_end logging
 * intact. Deliberately NO autoplay-next: the Twitch embed iframe gives us
 * no reliable "ended" signal without their player JS API.
 */
export function ClipLightbox({
  clip,
  streamerName,
  onClose,
  playlist,
  onNavigate,
}: {
  clip: FeedClip;
  streamerName?: string;
  onClose: () => void;
  /** Embeddable clips of the rail this one was opened from (incl. `clip`). */
  playlist?: FeedClip[];
  onNavigate?: (clip: FeedClip) => void;
}) {
  const startedAtRef = useRef<number>(0);

  const index = playlist ? playlist.findIndex((candidate) => candidate.id === clip.id) : -1;
  const prevClip = playlist && index > 0 ? playlist[index - 1] : null;
  const nextClip =
    playlist && index >= 0 && index < playlist.length - 1 ? playlist[index + 1] : null;

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
      if (event.key === 'ArrowLeft' && prevClip && onNavigate) onNavigate(prevClip);
      if (event.key === 'ArrowRight' && nextClip && onNavigate) onNavigate(nextClip);
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
    // The lightbox is remounted per clip (keyed by caller) — clip, playlist
    // neighbors and callbacks are all stable for this mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navButtonClass =
    'absolute top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/85 focus-visible:outline focus-visible:outline-accent-cyan';

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
        <div className="relative">
          <ClipEmbedFrame slug={clip.externalClipId} className="aspect-video w-full border-0" />
          {prevClip && onNavigate && (
            <button
              type="button"
              aria-label="Previous clip"
              onClick={() => onNavigate(prevClip)}
              className={`${navButtonClass} left-2`}
            >
              <ChevronLeft size={20} />
            </button>
          )}
          {nextClip && onNavigate && (
            <button
              type="button"
              aria-label="Next clip"
              onClick={() => onNavigate(nextClip)}
              className={`${navButtonClass} right-2`}
            >
              <ChevronRight size={20} />
            </button>
          )}
        </div>
        <div className="mt-2 flex items-center justify-center gap-3">
          {playlist && playlist.length > 1 && index >= 0 && (
            <span className="text-xs text-text-muted">
              {index + 1} / {playlist.length}
            </span>
          )}
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
