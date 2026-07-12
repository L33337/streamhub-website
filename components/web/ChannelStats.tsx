import type { PublicStreamer, PublicStreamerStats } from '@/lib/server/partner-api';
import { formatCompactNumber } from '@/lib/format/number';
import { resolveUiLang } from '@/lib/i18n-core';
import { uiLexFor } from '@/lib/i18n-ui';

interface Props {
  streamer: PublicStreamer;
  stats: PublicStreamerStats | null;
}

interface Tile {
  label: string;
  value: string;
  detail?: string;
}

/**
 * "Channel stats" tile row — the TwitchTracker-style headline numbers
 * (followers, average/peak viewers, hours streamed). Deliberately rendered
 * independently of the schedule AND of the stats block: always-on streamers
 * have stats=null but still carry follower/avg-viewer counts on the streamer
 * row, so they keep the first two tiles. Tiles without a value are omitted;
 * the whole section disappears when nothing is known. Tile styling matches
 * StreamerStatsBlock's existing stat tiles.
 */
export function ChannelStats({ streamer, stats }: Props) {
  const lang = resolveUiLang(streamer.language);
  const L = uiLexFor(streamer.language).channelStats;

  // Twitch counts followers, YouTube counts subscribers; a Twitch presence
  // wins the label because the backend fetches the primary channel's count
  // with the same precedence.
  const followerLabel = streamer.platforms.includes('twitch') ? L.followers : L.subscribers;

  const tiles: Tile[] = [];
  if (streamer.follower_count != null) {
    tiles.push({
      label: followerLabel,
      value: formatCompactNumber(streamer.follower_count, lang),
    });
  }
  if (streamer.avg_view_count != null) {
    tiles.push({
      label: L.avgViewers,
      value: formatCompactNumber(streamer.avg_view_count, lang),
      detail: L.medianDetail,
    });
  }
  if (stats?.peak_viewer_count != null) {
    tiles.push({
      label: L.peakViewers,
      value: formatCompactNumber(stats.peak_viewer_count, lang),
      detail: L.lastNDays(stats.window_days),
    });
  }
  if (stats?.hours_streamed != null) {
    tiles.push({
      label: L.hoursStreamed,
      value: formatCompactNumber(Math.round(stats.hours_streamed), lang),
      detail: L.lastNDays(stats.window_days),
    });
  }

  if (tiles.length === 0) return null;

  return (
    <section aria-labelledby="channel-stats-heading" className="mt-16 border-t border-divider pt-8">
      <h2 id="channel-stats-heading" className="text-2xl font-bold text-white">
        {L.heading}
      </h2>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-xl bg-background-elevated p-3">
            <dt className="text-xs uppercase tracking-wider text-text-muted">{tile.label}</dt>
            <dd className="mt-1 text-lg font-bold text-text-primary">
              {tile.value}
              {tile.detail ? (
                <span className="block text-xs font-normal normal-case text-text-muted">
                  {tile.detail}
                </span>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
