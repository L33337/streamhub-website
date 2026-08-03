export function formatUtcTime(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm} UTC`;
}

/**
 * Returns `tz` when it is a usable non-UTC IANA timezone id, else null so
 * callers keep the deterministic UTC rendering path. 'UTC' itself maps to
 * null on purpose: the UTC path already labels times "HH:MM UTC" and a
 * "UTC time" city label would be redundant.
 */
export function safeTimeZone(tz: string | null | undefined): string | null {
  if (!tz || tz === 'UTC') return null;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return null;
  }
}

/**
 * Coarse "time ago" label for past timestamps, e.g. "2 hours ago",
 * "yesterday", "3 days ago", "last month". Counterpart to
 * `localizedNextLabel` (future). Built on `Intl.RelativeTimeFormat` so we don't
 * hand-maintain word lists. `now` is injectable for deterministic rendering /
 * tests; callers in server components render it once at request time.
 *
 * The reference time is floored to the FULL HOUR so ISR regenerations inside
 * the same hour render byte-identical labels — Vercel only bills an ISR write
 * when the output changed, and a raw `now` made every streamer-page
 * regeneration a billed full-page write (this route was the site's top ISR
 * write consumer, 2026-08-03). Cost: a label can lag up to one rounding step
 * behind the exact value. Timestamps INSIDE the current hour keep the exact
 * `now` reference — flooring would put them in the future ("in 20 minutes"
 * for a stream that just ended); those pages regenerate with fresh data
 * anyway (offline transition → revalidate ping + new history row).
 */
export function formatTimeAgo(iso: string, lang = 'en', now = new Date()): string {
  const t = new Date(iso).getTime();
  const flooredHour = Math.floor(now.getTime() / 3_600_000) * 3_600_000;
  const refMs = t <= flooredHour ? flooredHour : now.getTime();
  const sec = Math.round((t - refMs) / 1000);
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

/**
 * Viewer-local counterpart of `localizedNextLabel`: same "Today 20:00" /
 * "Sat 8:00 PM" shape, but rendered in the RUNTIME timezone and the runtime's
 * hour cycle (12h for en-US, 24h for de/fr/…).
 *
 * Client-side only. On the server the runtime zone is the server's, which would
 * bake a wrong zone into ISR-cached HTML — callers pair this with
 * `localizedNextLabel` as the deterministic SSR snapshot (the
 * useSyncExternalStore pattern used by SlotStatusText / LocalTime).
 *
 * `now` is injectable for deterministic tests.
 */
export function localNextLabel(iso: string, lang = 'en', now = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const locale = lang === 'en' ? 'en-US' : lang;
  try {
    const time = d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
    // en-CA yields YYYY-MM-DD — a runtime-zone calendar date we can diff in UTC,
    // so 23:30 UTC can correctly read as "tomorrow" east of Greenwich.
    const dayFmt = new Intl.DateTimeFormat('en-CA');
    const diffDays = Math.round(
      (Date.parse(`${dayFmt.format(d)}T00:00:00Z`) -
        Date.parse(`${dayFmt.format(now)}T00:00:00Z`)) /
        86_400_000,
    );
    if (diffDays === 0 || diffDays === 1) {
      const rel = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(
        diffDays,
        'day',
      );
      return `${rel.charAt(0).toUpperCase()}${rel.slice(1)} ${time}`;
    }
    const weekday = d.toLocaleDateString(locale, { weekday: 'short' });
    return `${weekday} ${time}`;
  } catch {
    return localizedNextLabel(iso, lang, { now });
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
 * The runtime's own calendar date as `YYYY-MM-DD` — i.e. the viewer's local
 * "today" when called in the browser. `en-CA` formats exactly that shape (the
 * same trick `localNextLabel` above already relies on).
 *
 * CLIENT-SIDE ONLY for day labels: on the server this is the server's date,
 * which must never be baked into ISR HTML. Callers pair it with the UTC key as
 * the deterministic SSR snapshot (see components/web/DayLabel.tsx).
 */
export function localDateKey(now = new Date()): string {
  try {
    const formatted = new Intl.DateTimeFormat('en-CA').format(now);
    // Guard against ICU builds that hand back a non-ISO order.
    if (/^\d{4}-\d{2}-\d{2}$/.test(formatted)) return formatted;
  } catch {
    // Fall through to manual assembly.
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
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

/**
 * Weekday + date, never relative — "Thu, Jul 30". Used where a label has to
 * stay unambiguous regardless of the reader's timezone (aria text, and the
 * fallback branch of the relative labels below).
 */
export function utcDateAbsoluteLabel(yyyyMmDd: string, lang = 'en'): string {
  const target = new Date(yyyyMmDd + 'T00:00:00Z');
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

export function utcDateLabel(yyyyMmDd: string, todayUtc: string, lang = 'en'): string {
  if (yyyyMmDd === todayUtc) return relativeDayLabel(0, lang);
  const today = new Date(todayUtc + 'T00:00:00Z');
  const target = new Date(yyyyMmDd + 'T00:00:00Z');
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diffDays === 1) return relativeDayLabel(1, lang);
  return utcDateAbsoluteLabel(yyyyMmDd, lang);
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
 *
 * `opts.timeZone` (a validated non-UTC IANA id, see `safeTimeZone`) renders
 * weekday + HH:MM in that zone WITHOUT a zone suffix ("Sat 21:00") — the
 * caller appends its own localized zone label ("Berlin time"). The zone is the
 * streamer's fixed home timezone, so the output stays deterministic and
 * ISR-cacheable. Invalid/UTC/absent zones keep the UTC form byte-identically.
 */
export function localizedNextLabel(
  iso: string,
  lang = 'en',
  opts: { relative?: boolean; now?: Date; timeZone?: string } = {},
): string {
  const { relative = true, now = new Date() } = opts;
  const timeZone = safeTimeZone(opts.timeZone);
  const d = new Date(iso);

  if (timeZone) {
    const time = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone,
    }).format(d);
    if (relative) {
      // Today/tomorrow must be judged on the zone's local calendar date —
      // 23:30Z can already be "tomorrow" in Berlin. en-CA yields YYYY-MM-DD.
      const localDay = new Intl.DateTimeFormat('en-CA', { timeZone });
      const diffDays = Math.round(
        (Date.parse(localDay.format(d) + 'T00:00:00Z') -
          Date.parse(localDay.format(now) + 'T00:00:00Z')) /
          86_400_000,
      );
      if (diffDays === 0 || diffDays === 1) {
        const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
        const rel = rtf.format(diffDays, 'day');
        return `${rel.charAt(0).toUpperCase()}${rel.slice(1)} ${time}`;
      }
    }
    const weekday = d.toLocaleDateString(lang, { weekday: 'short', timeZone });
    return `${weekday} ${time}`;
  }

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

/**
 * Self-contained start label with the calendar date: "Sat, Jul 18, 21:00",
 * rendered in `timeZone` (UTC when absent/unusable). No zone suffix — the
 * caller owns that, because copy that already names the zone once must not
 * repeat it.
 *
 * The date is what separates this from `localizedNextLabel`. Inside the page a
 * bare "Sat 21:00" is unambiguous (the day section around it supplies the
 * date), but a <meta description> is read detached from the page: Google
 * serves the cached snippet for days, and LLM crawlers quote it with no
 * surrounding context at all. There "Sat 21:00" silently becomes whichever
 * Saturday the reader assumes.
 *
 * Times use en-GB/h23 like the zoned branch of `localizedNextLabel`, so the
 * hour matches the 24h "HH:MM" strings the stats copy renders.
 */
export function absoluteStartLabel(iso: string, lang = 'en', timeZone?: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const zone = safeTimeZone(timeZone) ?? 'UTC';
  const time = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: zone,
  }).format(d);
  const dateOpts: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: zone,
  };
  try {
    return `${d.toLocaleDateString(lang, dateOpts)}, ${time}`;
  } catch {
    return `${d.toLocaleDateString('en-US', dateOpts)}, ${time}`;
  }
}

/** UTC date keys (`yyyy-mm-dd`) of the seven days a streamer page renders. */
export function sevenDayKeys(now: Date): string[] {
  const keys: string[] = [];
  for (let i = 0; i < 7; i++) {
    keys.push(new Date(now.getTime() + i * 86_400_000).toISOString().slice(0, 10));
  }
  return keys;
}

/**
 * Earliest upcoming slot that is a real stream inside the rendered week.
 *
 * Shared by the streamer page body and its `generateMetadata` so the SERP
 * snippet can never announce a stream the page itself does not show. Two
 * exclusions, both load-bearing:
 * - `slot_kind === 'cancelled'` — a cancellation is the opposite of a next
 *   stream, and promising one in the snippet contradicts the page.
 * - slots outside `dayKeys` — the fetch window reaches a day past the last
 *   rendered day section, and such a slot has no anchor to point at.
 */
export function pickNextRealSlot<
  T extends { start_time: string; slot_kind?: string | null },
>(slots: readonly T[], dayKeys: readonly string[]): T | null {
  return (
    [...slots]
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
      .find(
        (s) => s.slot_kind !== 'cancelled' && dayKeys.includes(s.start_time.slice(0, 10)),
      ) ?? null
  );
}
