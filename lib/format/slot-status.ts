import type { PublicStreamSlot } from '@/lib/server/partner-api';
import { formatLocalDateShort, formatUtcDateShort } from './time';

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
 * Hour label in the streamer's home timezone with a zone abbreviation, e.g.
 * "12am CEST" or "1pm PDT". No single locale yields named abbreviations for
 * all regions (en-US: PDT/EDT but "GMT+2" for Berlin; en-GB: CEST/BST but
 * "GMT-7" for Los Angeles), so we try both and keep the first non-offset name,
 * falling back to en-US's "GMT+X" style for zones neither locale names.
 * Falls back to UTC when the timezone is null or not a valid IANA id.
 */
function formatZoneHour(iso: string, timeZone: string | null): string {
  const d = new Date(iso);
  if (timeZone) {
    try {
      let hour: number | null = null;
      let zone: string | null = null;
      for (const locale of ['en-US', 'en-GB']) {
        const parts = new Intl.DateTimeFormat(locale, {
          timeZone,
          hour: 'numeric',
          hourCycle: 'h23',
          timeZoneName: 'short',
        }).formatToParts(d);
        const h = Number(parts.find((p) => p.type === 'hour')?.value);
        const z = parts.find((p) => p.type === 'timeZoneName')?.value;
        if (!Number.isFinite(h) || !z) continue;
        if (hour === null) {
          hour = h;
          zone = z;
        }
        if (!/^(GMT|UTC)/.test(z)) {
          zone = z;
          break;
        }
      }
      if (hour !== null && zone) {
        return `${getHourLabel(hour)} ${zone}`;
      }
    } catch {
      // Invalid IANA id — fall through to UTC.
    }
  }
  return `${getHourLabel(d.getUTCHours())} UTC`;
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
    // Viewer-local hour ("10pm your time"); UTC on the server snapshot. The
    // streamer's own local time follows with a zone abbreviation ("12am CEST").
    // When the streamer part resolves to the same UTC hour already shown
    // (unknown, invalid, or UTC-valued streamer timezone) the server snapshot
    // would read "… 12pm UTC · 12pm UTC" — skip the redundant suffix there.
    const utcHour = `${getHourLabel(start.getUTCHours())} UTC`;
    const localHour = useUtc ? utcHour : `${getHourLabel(start.getHours())} your time`;
    const streamerHour = formatZoneHour(slot.start_time, slot.streamer_timezone);
    const suffix = useUtc && streamerHour === utcHour ? '' : ` · ${streamerHour}`;
    if (slot.is_predicted && new Date() >= start) {
      return `Was expected around ${localHour}${suffix}`;
    }
    const date = useUtc
      ? formatUtcDateShort(slot.start_time)
      : formatLocalDateShort(slot.start_time);
    return `${date} · Around ${localHour}${suffix}`;
  }

  return 'Offline';
}
