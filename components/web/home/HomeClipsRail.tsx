'use client';

import { useState } from 'react';
import type { FeedClip } from '@/lib/feed/types';
import { ClipCard } from '@/components/web/feed/ClipCard';
import { ClipLightbox } from '@/components/web/feed/ClipLightbox';
import { FeedSectionHeader } from '@/components/web/feed/FeedSectionHeader';
import { RailScroller } from '@/components/web/feed/RailScroller';

/**
 * "Clips of the week" rail (homepage rebuild 2026-07-27): global top clips,
 * played in the feed's ClipLightbox with prev/next playlist nav. Client
 * component because the lightbox is local state; strings come as props
 * (i18n-hub is server-only). feed_events logging inside ClipCard/Lightbox is
 * a no-op for anonymous visitors (the queue is never configured here).
 */
export function HomeClipsRail({
  clips,
  names,
  title,
}: {
  clips: FeedClip[];
  names: Record<string, string>;
  title: string;
}) {
  const [activeClip, setActiveClip] = useState<FeedClip | null>(null);

  if (clips.length === 0) return null;

  return (
    <section aria-label={title}>
      <FeedSectionHeader title={title} count={clips.length} />
      <RailScroller contentClassName="pb-2">
        <ul className="flex gap-3">
          {clips.map((clip) => (
            <li key={clip.id}>
              <ClipCard
                clip={clip}
                streamerName={names[clip.streamerId]}
                onOpen={(event) => {
                  event.preventDefault();
                  setActiveClip(clip);
                }}
              />
            </li>
          ))}
        </ul>
      </RailScroller>
      {activeClip && (
        <ClipLightbox
          key={activeClip.id}
          clip={activeClip}
          streamerName={names[activeClip.streamerId]}
          onClose={() => setActiveClip(null)}
          playlist={clips}
          onNavigate={setActiveClip}
        />
      )}
    </section>
  );
}
