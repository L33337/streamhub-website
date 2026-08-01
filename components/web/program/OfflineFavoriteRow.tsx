// "Offline today" row — port of the app's OfflineStreamerCard: a favorite
// with no stream (real or predicted) on the current day. Links to the
// streamer's public page (the app opens a detail modal instead).
//
// UX round 2026-07-23: when a future prediction exists, the dead-end
// "No stream today" becomes "Next: Tomorrow ~8pm" (findNextExpectedSlot) —
// the row now carries the product's actual value, the forecast.

import Image from 'next/image';
import Link from 'next/link';
import { InitialsAvatar } from '@/components/web/InitialsAvatar';
import { PlatformBadge } from '@/components/web/Badges';
import type { FavoriteStreamerRow } from '@/lib/supabase/favorites';
import { sizedAvatarUrl } from '@/lib/format/image-size';

export function OfflineFavoriteRow({
  streamer,
  nextExpectedLabel,
}: {
  streamer: FavoriteStreamerRow;
  /** 'Tomorrow ~8pm' (formatNextExpectedLabel) or null when no prediction. */
  nextExpectedLabel?: string | null;
}) {
  return (
    <Link
      href={`/streamer/${encodeURIComponent(streamer.id)}`}
      prefetch={false}
      className="flex items-center gap-3 rounded-xl border border-border-default bg-background-elevated p-3 opacity-70 transition-all hover:border-accent-cyan/40 hover:opacity-100"
    >
      {streamer.avatar_url ? (
        <Image
          src={sizedAvatarUrl(streamer.avatar_url, 40)}
          alt=""
          width={40}
          height={40}
          unoptimized
          className="shrink-0 rounded-full border border-border-default grayscale"
        />
      ) : (
        <InitialsAvatar name={streamer.name} size={40} className="shrink-0" />
      )}

      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-text-primary">
          {streamer.name}
        </span>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          {streamer.platforms.map((p) => (
            <PlatformBadge key={p} platform={p} size="sm" />
          ))}
        </div>
      </div>

      {nextExpectedLabel ? (
        <span className="shrink-0 text-xs font-semibold text-text-secondary">
          Next: <span className="text-accent-cyan">{nextExpectedLabel}</span>
        </span>
      ) : (
        <span className="shrink-0 text-xs text-text-muted">No stream today</span>
      )}
    </Link>
  );
}
