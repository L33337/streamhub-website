interface ChannelIds {
  twitchLogin: string | null;
  youtubeChannelId: string | null;
}

function channelUrls({ twitchLogin, youtubeChannelId }: ChannelIds) {
  return {
    twitchUrl: twitchLogin ? `https://twitch.tv/${twitchLogin}` : null,
    youtubeUrl: youtubeChannelId
      ? `https://youtube.com/channel/${youtubeChannelId}`
      : null,
  };
}

interface WatchButtonsProps extends ChannelIds {
  /** Container classes. Default reproduces the slot detail page's layout. */
  className?: string;
  /** flex-1 buttons (full-width split on the slot detail page). The hero passes false. */
  grow?: boolean;
}

/**
 * Prominent brand-colored "Watch on Twitch / YouTube" buttons. Shared between
 * the slot detail page and the streamer hero so the brand styling can't drift.
 * Renders nothing when neither channel id is available.
 */
export function WatchButtons({
  twitchLogin,
  youtubeChannelId,
  className = 'mt-4 flex flex-col gap-2 sm:mt-6 sm:flex-row sm:gap-3',
  grow = true,
}: WatchButtonsProps) {
  const { twitchUrl, youtubeUrl } = channelUrls({ twitchLogin, youtubeChannelId });
  if (!twitchUrl && !youtubeUrl) return null;

  const growClass = grow ? 'flex-1 ' : '';

  return (
    <div className={className}>
      {twitchUrl && (
        <a
          href={twitchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${growClass}inline-flex items-center justify-center gap-2 rounded-lg bg-twitch px-4 py-2.5 text-sm font-bold tracking-wide text-white shadow-[0_0_12px_rgba(0,240,255,0.25)] transition-colors hover:bg-[#A266FF] sm:py-3`}
        >
          Watch on Twitch
          <span className="sr-only"> (opens in new tab)</span>
        </a>
      )}
      {youtubeUrl && (
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${growClass}inline-flex items-center justify-center gap-2 rounded-lg bg-youtube px-4 py-2.5 text-sm font-bold tracking-wide text-white shadow-[0_0_12px_rgba(0,240,255,0.25)] transition-colors hover:bg-[#FF3355] sm:py-3`}
        >
          Watch on YouTube
          <span className="sr-only"> (opens in new tab)</span>
        </a>
      )}
    </div>
  );
}

interface ChannelLinksProps extends ChannelIds {
  className?: string;
}

/**
 * Subtle inline channel links ("Twitch ↗ · YouTube ↗") for the offline hero —
 * the quiet counterpart to WatchButtons. Renders nothing when neither id is
 * available.
 */
export function ChannelLinks({
  twitchLogin,
  youtubeChannelId,
  className = '',
}: ChannelLinksProps) {
  const { twitchUrl, youtubeUrl } = channelUrls({ twitchLogin, youtubeChannelId });
  if (!twitchUrl && !youtubeUrl) return null;

  return (
    <p className={`text-sm text-text-secondary ${className}`}>
      {twitchUrl && (
        <a
          href={twitchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-twitch-fg transition-colors hover:text-white"
        >
          Twitch<span aria-hidden="true"> ↗</span>
          <span className="sr-only"> (opens in new tab)</span>
        </a>
      )}
      {twitchUrl && youtubeUrl && <span className="text-text-muted"> · </span>}
      {youtubeUrl && (
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-youtube-fg transition-colors hover:text-white"
        >
          YouTube<span aria-hidden="true"> ↗</span>
          <span className="sr-only"> (opens in new tab)</span>
        </a>
      )}
    </p>
  );
}
