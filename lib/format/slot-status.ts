import type { PublicStreamSlot } from '@/lib/server/partner-api';

export function getRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = Math.abs(now.getTime() - d.getTime());
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours >= 1) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  }
  return `${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
}

export function getShortApproximateRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = Math.abs(now.getTime() - d.getTime());
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours >= 1) return `~${diffHours}h`;
  return `~${diffMins}m`;
}

export function getHourLabel(hour: number): string {
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  if (hour < 12) return `${hour}am`;
  return `${hour - 12}pm`;
}

function getEndTime(startTime: Date | string, durationMinutes: number): Date {
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
  return new Date(start.getTime() + durationMinutes * 60_000);
}

/**
 * Status text for a stream slot, mirroring the mobile app's
 * `getStatusText` in `src/utils/streamUtils.ts`. The Partner API's
 * `status` field is authoritative — we don't re-derive it from time.
 *
 * Pass `useUtc=true` for SSR to get a deterministic, timezone-free hour
 * (matches the LocalTime SSR fallback pattern); pass false on the client
 * for browser-local rounding.
 */
export function getStatusText(slot: PublicStreamSlot, useUtc = false): string {
  const start = new Date(slot.start_time);
  const end = getEndTime(start, slot.duration_minutes);

  if (slot.status === 'live') {
    const liveSince = getRelativeTime(start);
    if (slot.is_always_on) return `Live since ${liveSince}`;
    const now = new Date();
    if (now > end) return `Live since ${liveSince} · Ends in ~1h`;
    return `Live since ${liveSince} · Ends in ${getShortApproximateRelativeTime(end)}`;
  }

  if (slot.status === 'upcoming') {
    const hour = useUtc ? start.getUTCHours() : start.getHours();
    const label = getHourLabel(hour);
    if (slot.is_predicted && new Date() >= start) {
      return `Was expected around ${label}`;
    }
    return `Around ${label}`;
  }

  return 'Offline';
}
