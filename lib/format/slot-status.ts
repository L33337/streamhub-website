import type { PublicStreamSlot } from '@/lib/server/partner-api';
import { slotLexFor } from '@/lib/i18n-slot';
import { formatLocalDateShort, formatUtcDateShort } from './time';

/**
 * Coarse elapsed/remaining duration, e.g. "2 hours" / "45 minutes". The
 * default 'en' path is the legacy hand-rolled string (byte-identical for the
 * shared English pages); other languages come from Intl.NumberFormat's unit
 * style ("2 Stunden", "2 часа" — with correct plural inflection).
 */
export function getRelativeTime(date: Date | string, lang = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = Math.abs(now.getTime() - d.getTime());
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMins / 60);
  if (lang === 'en') {
    if (diffHours >= 1) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    }
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
  }
  const unit = diffHours >= 1 ? 'hour' : 'minute';
  const n = diffHours >= 1 ? diffHours : diffMins;
  try {
    return new Intl.NumberFormat(lang, {
      style: 'unit',
      unit,
      unitDisplay: 'long',
    }).format(n);
  } catch {
    return getRelativeTime(date, 'en');
  }
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

/**
 * Hour label in the requested language: the legacy 12-hour "10pm" for 'en'
 * (byte-identical on shared English pages); otherwise Intl decides the hour
 * cycle and digits ("22:00" for de/fr/ru/ja, Arabic-Indic digits for ar).
 * Minute is included for non-en so 24h locales don't render a bare "22".
 */
function localizedHourLabel(hour: number, lang: string): string {
  if (lang === 'en') return getHourLabel(hour);
  try {
    return new Intl.DateTimeFormat(lang, {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'UTC',
    }).format(Date.UTC(2024, 0, 1, hour));
  } catch {
    return getHourLabel(hour);
  }
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
 * The zone abbreviation stays in its latinized form on localized bodies; only
 * the hour part follows `lang`.
 */
function formatZoneHour(iso: string, timeZone: string | null, lang = 'en'): string {
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
        return `${localizedHourLabel(hour, lang)} ${zone}`;
      }
    } catch {
      // Invalid IANA id — fall through to UTC.
    }
  }
  return `${localizedHourLabel(d.getUTCHours(), lang)} UTC`;
}

/**
 * Status text for a stream slot, mirroring the mobile app's
 * `getStatusText` in `src/utils/streamUtils.ts`. The Partner API's
 * `status` field is authoritative — we don't re-derive it from time.
 *
 * Pass `useUtc=true` for SSR to get a deterministic, timezone-free hour
 * (matches the LocalTime SSR fallback pattern); pass false on the client
 * for browser-local rounding.
 *
 * `lang` localizes the phrasing via lib/i18n-slot.ts; the default 'en'
 * composition is byte-identical to the previously hardcoded strings, so the
 * shared English pages (/, /live, /game, feed) render exactly as before.
 */
export function getStatusText(
  slot: PublicStreamSlot,
  useUtc = false,
  lang = 'en',
): string {
  const L = slotLexFor(lang);
  const start = new Date(slot.start_time);
  const end = getEndTime(start, slot.duration_minutes);

  if (slot.status === 'live') {
    const liveSince = getRelativeTime(start, lang);
    if (slot.is_always_on) return L.statusLiveSince(liveSince);
    const now = new Date();
    if (now > end) return `${L.statusLiveSince(liveSince)} · ${L.statusEndsIn('~1h')}`;
    return `${L.statusLiveSince(liveSince)} · ${L.statusEndsIn(
      getShortApproximateRelativeTime(end),
    )}`;
  }

  if (slot.status === 'upcoming') {
    // Viewer-local hour ("10pm your time"); UTC on the server snapshot. The
    // streamer's own local time follows with a zone abbreviation ("12am CEST").
    // When the streamer part resolves to the same UTC hour already shown
    // (unknown, invalid, or UTC-valued streamer timezone) the server snapshot
    // would read "… 12pm UTC · 12pm UTC" — skip the redundant suffix there.
    const utcHour = `${localizedHourLabel(start.getUTCHours(), lang)} UTC`;
    const localHour = useUtc
      ? utcHour
      : L.statusYourTime(localizedHourLabel(start.getHours(), lang));
    const streamerHour = formatZoneHour(slot.start_time, slot.streamer_timezone, lang);
    const suffix = useUtc && streamerHour === utcHour ? '' : ` · ${streamerHour}`;
    if (slot.is_predicted && new Date() >= start) {
      return L.statusWasExpected(`${localHour}${suffix}`);
    }
    const date = useUtc
      ? formatUtcDateShort(slot.start_time, lang)
      : formatLocalDateShort(slot.start_time, lang);
    return `${date} · ${L.statusAround(`${localHour}${suffix}`)}`;
  }

  return L.statusOffline;
}
