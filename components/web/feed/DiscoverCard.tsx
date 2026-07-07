'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Sparkles } from 'lucide-react';
import type { DiscoverRecommendation } from '@/lib/feed/types';
import { buildDiscoverReasonLabel } from '@/lib/feed/logic';
import { PlatformBadge } from '@/components/web/Badges';
import { FavoriteButton } from '@/components/web/FavoriteButton';
import { InitialsAvatar } from '@/components/web/InitialsAvatar';

/**
 * Channel URL for a Discover recommendation (port of the app's
 * openStreamerChannel, without the extra streamer fetch — the RPC already
 * delivers twitch_login / youtube_channel_id).
 */
export function discoverChannelUrl(rec: DiscoverRecommendation): string {
  const platform = rec.platforms[0] ?? 'twitch';
  if (platform === 'twitch') {
    const login = rec.twitchLogin ?? rec.name.toLowerCase().replace(/\s+/g, '');
    return `https://twitch.tv/${login}`;
  }
  if (rec.youtubeChannelId) {
    return `https://youtube.com/channel/${rec.youtubeChannelId}`;
  }
  return `https://youtube.com/results?search_query=${encodeURIComponent(rec.name)}`;
}

/**
 * Discover section card (M16, port of the app's DiscoverStreamerCard): a
 * featured/popular streamer the user has not favorited yet, with reason chip
 * and inline favorite toggle. The card opens the channel in a new tab.
 */
export function DiscoverCard({
  recommendation,
  onOpen,
  onFavoriteToggled,
}: {
  recommendation: DiscoverRecommendation;
  onOpen: () => void;
  onFavoriteToggled: (nowFavorited: boolean) => void;
}) {
  const [avatarError, setAvatarError] = useState(false);
  const reason = buildDiscoverReasonLabel(recommendation);

  return (
    <a
      href={discoverChannelUrl(recommendation)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onOpen}
      className="block rounded-xl border border-border-default bg-background-elevated p-4 transition-colors hover:border-accent-cyan/60 hover:bg-background-highlight focus-visible:outline-none"
      aria-label={`Suggested streamer: ${recommendation.name}. ${reason}`}
    >
      <div className="flex items-center gap-3">
        {!avatarError && recommendation.avatarUrl ? (
          <Image
            src={recommendation.avatarUrl}
            alt=""
            width={48}
            height={48}
            unoptimized
            className="shrink-0 rounded-full border border-border-default"
            onError={() => setAvatarError(true)}
          />
        ) : (
          <InitialsAvatar name={recommendation.name} size={48} className="shrink-0" />
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold text-text-primary">
            {recommendation.name}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {recommendation.platforms.map((platform) => (
              <PlatformBadge key={platform} platform={platform} size="sm" />
            ))}
            {recommendation.topCategory ? (
              <span className="truncate text-[11px] text-text-muted">
                {recommendation.topCategory}
              </span>
            ) : null}
          </div>
        </div>

        <FavoriteButton
          streamerId={recommendation.streamerId}
          streamerName={recommendation.name}
          size="sm"
          className="shrink-0"
          onToggled={onFavoriteToggled}
        />
      </div>

      {recommendation.description ? (
        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-text-secondary">
          {recommendation.description}
        </p>
      ) : null}

      <span className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full border border-accent-cyan/40 bg-background-highlight px-2.5 py-1">
        <Sparkles size={12} className="shrink-0 text-accent-cyan" strokeWidth={2} />
        <span className="truncate text-[11px] font-semibold text-accent-cyan">{reason}</span>
      </span>
    </a>
  );
}
