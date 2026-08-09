'use client';

// Visual of a recap teaser card / article hero (2026-08-09): the edition's
// top-clip thumbnail with an overlapping avatar stack of the protagonists.
// Client island only for the onError fallbacks — clip thumbnails live on the
// platform CDN and expire for old clips (stream_clips keeps top-3/streamer
// past 30d), so a dead image must degrade to the avatar collage, and a dead
// avatar to initials (same pattern as feed/ClipCard).

import { useState } from 'react';
import { initialsFromName } from '@/components/web/InitialsAvatar';

export interface RecapVisualStreamer {
  id: string;
  name: string;
  avatarUrl: string | null;
}

function StackAvatar({
  name,
  avatarUrl,
  sizeClass,
}: {
  name: string;
  avatarUrl: string | null;
  sizeClass: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!avatarUrl || failed) {
    return (
      <span
        className={`${sizeClass} inline-flex items-center justify-center rounded-full bg-background-highlight text-[9px] font-bold text-text-primary ring-2 ring-background-elevated`}
        aria-hidden="true"
      >
        {initialsFromName(name)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarUrl}
      alt=""
      loading="lazy"
      className={`${sizeClass} rounded-full object-cover ring-2 ring-background-elevated`}
      onError={() => setFailed(true)}
    />
  );
}

export function RecapCardVisual({
  thumbnailUrl,
  thumbnailAlt,
  streamers,
}: {
  thumbnailUrl: string | null;
  thumbnailAlt: string;
  streamers: RecapVisualStreamer[];
}) {
  const [thumbFailed, setThumbFailed] = useState(false);
  const showThumb = Boolean(thumbnailUrl) && !thumbFailed;
  const stack = streamers.slice(0, 3);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-background-highlight">
      {showThumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl!}
          alt={thumbnailAlt}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setThumbFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent-cyan/15 via-background-highlight to-accent-magenta/15">
          {stack.length > 0 && (
            <div className="flex -space-x-2">
              {stack.map((s) => (
                <StackAvatar key={s.id} name={s.name} avatarUrl={s.avatarUrl} sizeClass="h-9 w-9" />
              ))}
            </div>
          )}
        </div>
      )}
      {showThumb && stack.length > 0 && (
        <div className="absolute bottom-1.5 left-1.5 flex -space-x-2">
          {stack.map((s) => (
            <StackAvatar key={s.id} name={s.name} avatarUrl={s.avatarUrl} sizeClass="h-6 w-6" />
          ))}
        </div>
      )}
    </div>
  );
}
