export function formatUtcTime(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm} UTC`;
}

/**
 * Coarse "time ago" label for past timestamps, e.g. "2 hours ago",
 * "yesterday", "3 days ago", "last month". Counterpart to
 * `localizedNextLabel` (future). Built on `Intl.RelativeTimeFormat` so we don't
 * hand-maintain word lists. `now` is injectable for deterministic rendering /
 * tests; callers in server components render it once at request time.
 */
export function formatTimeAgo(iso: string, lang = 'en', now = new Date()): string {
  const sec = Math.round((new Date(iso).getTime() - now.getTime()) / 1000);
  const abs = Math.abs(sec);
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  const MIN = 60;
  const HOUR = 3600;
  const DAY = 86_400;
  const WEEK = 604_800;
  const MONTH = 2_592_000; // 30 days
  const YEAR = 31_536_000;
  if (abs < MIN) return rtf.format(sec, 'second');
  if (abs < HOUR) return rtf.format(Math.round(sec / MIN), 'minute');
  if (abs < DAY) return rtf.format(Math.round(sec / HOUR), 'hour');
  if (abs < WEEK) return rtf.format(Math.round(sec / DAY), 'day');
  if (abs < MONTH) return rtf.format(Math.round(sec / WEEK), 'week');
  if (abs < YEAR) return rtf.format(Math.round(sec / MONTH), 'month');
  return rtf.format(Math.round(sec / YEAR), 'year');
}

/**
 * Compact human duration from a minute count, e.g. "45m", "3h", "3h 12m".
 * Returns '' for non-positive / non-finite input so callers can omit it.
 */
export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '';
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function groupSlotsByUtcDate<T extends { start_time: string }>(
  slots: T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const slot of slots) {
    const dateKey = slot.start_time.slice(0, 10);
    const arr = map.get(dateKey);
    if (arr) arr.push(slot);
    else map.set(dateKey, [slot]);
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => a.start_time.localeCompare(b.start_time));
  }
  return map;
}

export function utcDateLabel(yyyyMmDd: string, todayUtc: string): string {
  if (yyyyMmDd === todayUtc) return 'Today';
  const today = new Date(todayUtc + 'T00:00:00Z');
  const target = new Date(yyyyMmDd + 'T00:00:00Z');
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diffDays === 1) return 'Tomorrow';
  return target.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function utcDateShortLabel(yyyyMmDd: string, todayUtc: string): string {
  if (yyyyMmDd === todayUtc) return 'Today';
  const today = new Date(todayUtc + 'T00:00:00Z');
  const target = new Date(yyyyMmDd + 'T00:00:00Z');
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diffDays === 1) return 'Tomorrow';
  return target.toLocaleDateString('en-US', {
    weekday: 'short',
    timeZone: 'UTC',
  });
}

/**
 * Locale-aware "next stream" label for SEO meta descriptions, e.g.
 * "Today 20:00 UTC", "Tomorrow 18:00 UTC", "Sat 20:00 UTC" — translated to the
 * streamer's language. Today/Tomorrow come from Intl.RelativeTimeFormat so we
 * don't hand-maintain word lists; the weekday from toLocaleDateString.
 * `lang` is a BCP-47 code (falls back to 'en' for unknown/empty input).
 *
 * `opts.relative: false` forces the absolute weekday form ("Sat 20:00 UTC")
 * even for today/tomorrow. Use it for Google-cached metadata (title/description)
 * and crawlable snippet text, where a relative word like "Today" goes stale the
 * moment Google's cached copy outlives the day.
 */
export function localizedNextLabel(
  iso: string,
  lang = 'en',
  opts: { relative?: boolean; now?: Date } = {},
): string {
  const { relative = true, now = new Date() } = opts;
  const time = formatUtcTime(iso);
  const todayUtc = now.toISOString().slice(0, 10);
  const targetUtc = iso.slice(0, 10);
  const today = new Date(todayUtc + 'T00:00:00Z');
  const target = new Date(targetUtc + 'T00:00:00Z');
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);

  if (relative && (diffDays === 0 || diffDays === 1)) {
    const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
    const rel = rtf.format(diffDays, 'day'); // "today"/"tomorrow", "heute"/"morgen", …
    return `${rel.charAt(0).toUpperCase()}${rel.slice(1)} ${time}`;
  }
  const weekday = target.toLocaleDateString(lang, { weekday: 'short', timeZone: 'UTC' });
  return `${weekday} ${time}`;
}
