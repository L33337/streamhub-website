'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { FeedClip } from '@/lib/feed/types';
import { Icon } from '@/components/web/icons/IconSprite';
import { formatViews, formatClipDuration } from '@/lib/feed/logic';

/**
 * Twitch clip card for the horizontal Highlights rail (M16, port of the
 * app's ClipCard). The card is an <a> to the clip on twitch.tv; since M18
 * Phase 1 the caller intercepts the click (preventDefault) to open the
 * in-feed lightbox instead — the href stays as middle-click/no-JS fallback.
 *
 * `showMeta` (homepage clips rail, 2026-07-31) adds a third line naming the
 * clip's category and its broadcaster language — the two dimensions that
 * section filters by, so a card can be read back against the dropdown that
 * surfaced it. Opt-in, because the signed-in feed's Highlights rail is
 * already scoped to the viewer's own streamers and gains nothing from it.
 */
export function ClipCard({
  clip,
  streamerName,
  languageCode,
  showMeta = false,
  onOpen,
}: {
  clip: FeedClip;
  streamerName?: string;
  /** Normalized broadcaster language ("de"); shown upper-cased with `showMeta`. */
  languageCode?: string;
  showMeta?: boolean;
  onOpen: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  const [thumbnailError, setThumbnailError] = useState(false);
  const duration = formatClipDuration(clip.durationSeconds);
  const meta = showMeta
    ? [clip.category, languageCode?.toUpperCase()].filter(Boolean).join(' · ')
    : '';

  return (
    <a
      href={clip.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onOpen}
      className="block w-[200px] shrink-0 overflow-hidden rounded-xl bg-background-elevated transition-transform focus-visible:outline-none motion-safe:hover:scale-[1.02] motion-safe:focus-visible:scale-[1.02]"
      // The label REPLACES the card's inner text for screen readers, so the
      // meta line has to be repeated here or it is invisible to them.
      aria-label={`Clip: ${clip.title ?? 'Untitled'}${streamerName ? `, ${streamerName}` : ''}, ${formatViews(clip.viewCount)} views${meta ? `, ${meta.replace(' · ', ', ')}` : ''}`}
    >
      <div className="relative aspect-video w-full bg-background-highlight">
        {!thumbnailError && clip.thumbnailUrl ? (
          <Image
            src={clip.thumbnailUrl}
            // Not decorative for crawlers: Bing's SEO report counts an empty
            // alt as a missing one, and the homepage rail alone ships 24 of
            // these. Screen readers never reach it — the <a> above carries an
            // aria-label, which replaces the subtree — so a descriptive alt
            // costs nothing in double-announcement.
            alt={clipThumbnailAlt(clip.title, streamerName)}
            fill
            unoptimized
            sizes="200px"
            className="object-cover"
            onError={() => setThumbnailError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Icon name="play" size={28} className="text-text-muted" strokeWidth={1.5} />
          </div>
        )}
        <div className="absolute left-1/2 top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/50">
          <Icon name="play" size={14} className="text-white" fill="currentColor" strokeWidth={1} />
        </div>
        {duration && (
          <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-px text-[10px] font-semibold text-white">
            {duration}
          </span>
        )}
        <span className="absolute bottom-1 left-1 inline-flex items-center gap-1 rounded bg-black/70 px-1 py-px text-[10px] font-semibold text-white">
          <Icon name="eye" size={10} />
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
        {/* Rendered even when empty (a clip with neither category nor
            language): the rail lays its cards out in a flex row, so a card
            one line shorter than its neighbours ends visibly higher. */}
        {showMeta && (
          <p className="mt-0.5 min-h-[14px] truncate font-mono text-[10px] uppercase tracking-wide text-text-muted">
            {meta}
          </p>
        )}
      </div>
    </a>
  );
}

/**
 * Alt text for a clip thumbnail. English on purpose, like the card's
 * aria-label and its "Untitled clip" fallback: the clip title is content in the
 * streamer's language, and the two-word frame around it is not worth a lexicon
 * round-trip through a client component (CLAUDE.md D6).
 */
export function clipThumbnailAlt(
  title: string | null | undefined,
  streamerName?: string,
): string {
  const subject = title?.trim() || 'Twitch clip';
  return streamerName ? `${subject} — clip by ${streamerName}` : subject;
}
