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
 * Human-readable city label from an IANA timezone id:
 * "America/New_York" → "New York", "Europe/Berlin" → "Berlin", "UTC" → "UTC".
 */
export function timezoneCityLabel(tz: string): string {
  return (tz.split('/').pop() ?? tz).replace(/_/g, ' ');
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

/**
 * Short date label in the *browser's* timezone, e.g. "Fri, Jul 3". Client-side
 * only — on the server (unknown viewer timezone) use `formatUtcDateShort`.
 * The default 'en' is pinned to en-US so English pages stay byte-identical;
 * pass the streamer's language on localized bodies. Only the timezone comes
 * from the browser.
 */
export function formatLocalDateShort(iso: string, lang = 'en'): string {
  try {
    return new Date(iso).toLocaleDateString(lang === 'en' ? 'en-US' : lang, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return formatUtcDateShort(iso, lang);
  }
}

/** Short date label in UTC, e.g. "Sat, Jul 4" — deterministic SSR counterpart. */
export function formatUtcDateShort(iso: string, lang = 'en'): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  };
  try {
    return new Date(iso).toLocaleDateString(lang === 'en' ? 'en-US' : lang, options);
  } catch {
    return new Date(iso).toLocaleDateString('en-US', options);
  }
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

/**
 * "Today"/"Tomorrow" in `lang` via Intl.RelativeTimeFormat (numeric:'auto'),
 * capitalized like the English literals ("Heute", "Сегодня", "今日"). Falls
 * back to the English words on unknown tags.
 */
function relativeDayLabel(diffDays: 0 | 1, lang: string): string {
  if (lang === 'en') return diffDays === 0 ? 'Today' : 'Tomorrow';
  try {
    const rel = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' }).format(
      diffDays,
      'day',
    );
    return rel.charAt(0).toUpperCase() + rel.slice(1);
  } catch {
    return diffDays === 0 ? 'Today' : 'Tomorrow';
  }
}

export function utcDateLabel(yyyyMmDd: string, todayUtc: string, lang = 'en'): string {
  if (yyyyMmDd === todayUtc) return relativeDayLabel(0, lang);
  const today = new Date(todayUtc + 'T00:00:00Z');
  const target = new Date(yyyyMmDd + 'T00:00:00Z');
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diffDays === 1) return relativeDayLabel(1, lang);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  };
  try {
    return target.toLocaleDateString(lang === 'en' ? 'en-US' : lang, options);
  } catch {
    return target.toLocaleDateString('en-US', options);
  }
}

export function utcDateShortLabel(
  yyyyMmDd: string,
  todayUtc: string,
  lang = 'en',
): string {
  if (yyyyMmDd === todayUtc) return relativeDayLabel(0, lang);
  const today = new Date(todayUtc + 'T00:00:00Z');
  const target = new Date(yyyyMmDd + 'T00:00:00Z');
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diffDays === 1) return relativeDayLabel(1, lang);
  const options: Intl.DateTimeFormatOptions = { weekday: 'short', timeZone: 'UTC' };
  try {
    return target.toLocaleDateString(lang === 'en' ? 'en-US' : lang, options);
  } catch {
    return target.toLocaleDateString('en-US', options);
  }
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
