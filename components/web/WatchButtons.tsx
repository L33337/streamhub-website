import { slotLexFor } from '@/lib/i18n-slot';

interface ChannelIds {
  twitchLogin: string | null;
  youtubeChannelId: string | null;
}

export function channelUrls({ twitchLogin, youtubeChannelId }: ChannelIds) {
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
  /** Localizes button labels; default 'en' keeps StreamSlotDetail byte-identical. */
  language?: string;
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
  language = 'en',
}: WatchButtonsProps) {
  const { twitchUrl, youtubeUrl } = channelUrls({ twitchLogin, youtubeChannelId });
  if (!twitchUrl && !youtubeUrl) return null;
  const L = slotLexFor(language);

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
          {L.watchOnTwitch}
          <span className="sr-only">{L.opensInNewTab}</span>
        </a>
      )}
      {youtubeUrl && (
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${growClass}inline-flex items-center justify-center gap-2 rounded-lg bg-youtube px-4 py-2.5 text-sm font-bold tracking-wide text-white shadow-[0_0_12px_rgba(0,240,255,0.25)] transition-colors hover:bg-[#FF3355] sm:py-3`}
        >
          {L.watchOnYouTube}
          <span className="sr-only">{L.opensInNewTab}</span>
        </a>
      )}
    </div>
  );
}
