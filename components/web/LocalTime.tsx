'use client';

import { useSyncExternalStore } from 'react';
import { formatUtcTime } from '@/lib/format/time';
import { resolveUiLang } from '@/lib/i18n-core';

function subscribe(): () => void {
  // The user's timezone is read once at hydration; Intl does not notify on
  // changes, so the subscribe function is a no-op.
  return () => {};
}

/**
 * Latinized zone abbreviation ("CEST", "PDT"), independent of the page
 * language. Neither en-US nor en-GB names every zone — en-US says "GMT+2" for
 * Berlin, en-GB says "GMT-7" for Los Angeles — so try both and keep the first
 * real name, falling back to whatever offset form we did get. Same approach as
 * `formatZoneHour` in lib/format/slot-status.ts.
 */
function latinZoneName(date: Date): string | null {
  let fallback: string | null = null;
  for (const locale of ['en-US', 'en-GB']) {
    try {
      const zone = new Intl.DateTimeFormat(locale, {
        hour: 'numeric',
        timeZoneName: 'short',
      })
        .formatToParts(date)
        .find((p) => p.type === 'timeZoneName')?.value;
      if (!zone) continue;
      if (!/^(GMT|UTC)/.test(zone)) return zone;
      fallback ??= zone;
    } catch {
      // Try the next locale.
    }
  }
  return fallback;
}

function getClientSnapshot(utcIso: string, lang: string): string {
  const date = new Date(utcIso);
  try {
    // The CLOCK follows the page language (24h in de, 12h in en). The ZONE
    // NAME deliberately does not: reading `undefined` here took the abbreviation
    // from the browser's own locale, so a German-configured browser rendered
    // "8:06 PM MESZ" on the English page.
    const time = date.toLocaleTimeString(lang === 'en' ? 'en-US' : lang, {
      hour: 'numeric',
      minute: '2-digit',
    });
    const zone = latinZoneName(date);
    return zone ? `${time} ${zone}` : time;
  } catch {
    return formatUtcTime(utcIso);
  }
}

export function LocalTime({
  utcIso,
  language = 'en',
}: {
  utcIso: string;
  /** Page language for the clock format; the zone name stays latinized. */
  language?: string;
}) {
  const lang = resolveUiLang(language);
  const local = useSyncExternalStore(
    subscribe,
    () => getClientSnapshot(utcIso, lang),
    () => formatUtcTime(utcIso),
  );
  return (
    <time dateTime={utcIso} suppressHydrationWarning>
      {local}
    </time>
  );
}
