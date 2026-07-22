// "Missed" row — port of the app's WasOnlineCard (StreamHub
// src/components/WasOnlineCard.tsx): a real stream from a favorite that
// started and already ended today. Shows the local start–end range and links
// to the slot detail page. Rendered client-side only (local-time labels).

import Image from 'next/image';
import Link from 'next/link';
import { InitialsAvatar } from '@/components/web/InitialsAvatar';
import { PlatformBadge } from '@/components/web/Badges';
import { formatLocalTimeRange } from '@/lib/program/logic';
import type { StreamSlot } from '@/lib/feed/types';
import type { Platform } from '@/lib/server/partner-api';

export function MissedSlotRow({ slot }: { slot: StreamSlot }) {
  return (
    <Link
      href={`/schedule/${encodeURIComponent(slot.id)}`}
      prefetch={false}
      className="flex items-center gap-3 rounded-xl border border-border-default bg-background-elevated p-3 transition-colors hover:border-accent-cyan/40"
      aria-label={`${slot.streamerName} streamed ${formatLocalTimeRange(slot.startTime, slot.duration)}`}
    >
      {slot.avatarUrl ? (
        <Image
          src={slot.avatarUrl}
          alt=""
          width={40}
          height={40}
          unoptimized
          className="shrink-0 rounded-full border border-border-default"
        />
      ) : (
        <InitialsAvatar name={slot.streamerName} size={40} className="shrink-0" />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-semibold text-text-primary">
            {slot.streamerName}
          </span>
          {slot.platforms.map((p) => (
            <PlatformBadge key={p} platform={p as Platform} size="sm" />
          ))}
        </div>
        <p className="truncate text-xs text-text-secondary" title={slot.streamTitle}>
          {slot.streamTitle}
        </p>
      </div>

      <span className="shrink-0 text-xs text-text-muted">
        {formatLocalTimeRange(slot.startTime, slot.duration)}
      </span>
    </Link>
  );
}
