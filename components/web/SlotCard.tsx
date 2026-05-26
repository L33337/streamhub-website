import Link from 'next/link';
import type { PublicStreamSlot } from '@/lib/server/partner-api';
import {
  AlwaysOnBadge,
  ConfidenceBadge,
  LiveBadge,
  PlatformBadge,
  PredictedBadge,
} from './Badges';
import { LocalTime } from './LocalTime';

export function SlotCard({ slot }: { slot: PublicStreamSlot }) {
  const isLive = slot.status === 'live';
  const isAlwaysOn = slot.is_always_on;
  const isPredicted = slot.is_predicted;
  const durationLabel = slot.duration_minutes > 0 ? `${slot.duration_minutes} min` : null;

  return (
    <Link
      href={`/schedule/${encodeURIComponent(slot.id)}`}
      prefetch={false}
      className="block transition-transform hover:scale-[1.01] focus-visible:scale-[1.01] focus-visible:outline-none"
      aria-label={`${slot.streamer_name}: ${slot.title}`}
    >
      <article className="gradient-border p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4">
        <div className="md:w-32 md:flex-shrink-0 text-text-primary">
          {isAlwaysOn ? (
            <div className="text-2xl font-bold gradient-text" aria-label="Always live, 24/7">
              24/7
            </div>
          ) : (
            <div className="flex flex-col">
              <span className="text-lg font-semibold">
                <LocalTime utcIso={slot.start_time} />
              </span>
              {durationLabel && (
                <span className="text-xs text-text-muted mt-0.5">{durationLabel}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3
            className="text-lg font-semibold text-text-primary line-clamp-2"
            title={slot.title}
          >
            {slot.title}
          </h3>
          {slot.category && (
            <p className="text-sm text-text-secondary mt-1">{slot.category}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {slot.platforms.map((p) => (
              <PlatformBadge key={p} platform={p} />
            ))}
            {isLive && !isAlwaysOn && <LiveBadge />}
            {isAlwaysOn && <AlwaysOnBadge />}
            {isPredicted && (
              <>
                <PredictedBadge />
                <ConfidenceBadge level={slot.confidence} />
              </>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
