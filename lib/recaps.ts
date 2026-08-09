// Pure view logic for the AI recap articles (/rankings hub cards +
// /rankings/recap/[slug], 2026-08-09). Everything here is unit-tested
// (lib/__tests__/recaps.test.ts); components stay markup-only.

import type { PublicRecapListItem, RecapKind, RecapStreamerRef } from '@/lib/server/partner-api';

export const RECAP_BASE_PATH = '/rankings/recap';

export function recapHref(slug: string): string {
  return `${RECAP_BASE_PATH}/${encodeURIComponent(slug)}`;
}

// ============================================
// Marker rendering
// ============================================

export type RecapSegment =
  | { type: 'text'; text: string }
  | { type: 'link'; streamerId: string; name: string };

const MARKER_RE = /\[\[streamer:([^\]]+)\]\]/g;

/**
 * Splits a paragraph into text/link segments. `[[streamer:id]]` markers whose
 * id is in the lookup become link segments carrying the display name; unknown
 * ids degrade to their id as plain text (the sentence keeps its subject).
 */
export function parseRecapParagraph(
  text: string,
  nameById: ReadonlyMap<string, string>,
): RecapSegment[] {
  const segments: RecapSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(MARKER_RE)) {
    const index = m.index ?? 0;
    if (index > last) segments.push({ type: 'text', text: text.slice(last, index) });
    const id = m[1];
    const name = nameById.get(id);
    if (name) {
      segments.push({ type: 'link', streamerId: id, name });
    } else {
      segments.push({ type: 'text', text: id });
    }
    last = index + m[0].length;
  }
  if (last < text.length) segments.push({ type: 'text', text: text.slice(last) });
  return segments;
}

export function streamerNameMap(streamers: RecapStreamerRef[]): Map<string, string> {
  return new Map(streamers.map((s) => [s.id, s.name]));
}

/** Marker-free plain text of a paragraph (JSON-LD articleBody, og fallbacks). */
export function recapPlainText(text: string, nameById: ReadonlyMap<string, string>): string {
  return parseRecapParagraph(text, nameById)
    .map((s) => (s.type === 'text' ? s.text : s.name))
    .join('');
}

// ============================================
// Period labels (viewer-locale, deterministic: fixed inputs + UTC)
// ============================================

function intlLocale(lang: string): string {
  // Site convention: 'en' renders as en-US; 'pt' targets pt-BR (M22).
  if (lang === 'en') return 'en-US';
  if (lang === 'pt') return 'pt-BR';
  return lang;
}

function utcDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00Z`);
}

/**
 * "Aug 3 – 9, 2026" (weekly) / "July 2026" (monthly) in the viewer's locale.
 * Uses Intl range formatting for the weekly span; falls back to two full
 * dates when the runtime lacks formatRange.
 */
export function recapPeriodLabel(
  kind: RecapKind,
  periodStart: string,
  periodEnd: string,
  lang: string,
): string {
  const locale = intlLocale(lang);
  const start = utcDate(periodStart);
  const end = utcDate(periodEnd);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '';
  try {
    if (kind === 'monthly') {
      return new Intl.DateTimeFormat(locale, {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(start);
    }
    const fmt = new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
    const withRange = fmt as Intl.DateTimeFormat & {
      formatRange?: (a: Date, b: Date) => string;
    };
    if (typeof withRange.formatRange === 'function') {
      return withRange.formatRange(start, end);
    }
    return `${fmt.format(start)} – ${fmt.format(end)}`;
  } catch {
    return `${periodStart} – ${periodEnd}`;
  }
}

// ============================================
// Selection helpers
// ============================================

/** Newest edition per cadence out of a newest-first list. */
export function latestByKind(items: PublicRecapListItem[]): {
  weekly: PublicRecapListItem | null;
  monthly: PublicRecapListItem | null;
} {
  return {
    weekly: items.find((i) => i.kind === 'weekly') ?? null,
    monthly: items.find((i) => i.kind === 'monthly') ?? null,
  };
}

/**
 * True when the article text is genuinely in the requested language. False
 * means the API fell back to English — the page renders fine but that locale
 * variant must stay out of the index (M22 "genuinely localized" bar) and
 * shows the translation-pending note.
 */
export function isRecapLocalized(item: Pick<PublicRecapListItem, 'language' | 'requested_language'>): boolean {
  return item.language === item.requested_language;
}

/**
 * Prev/next edition of the SAME cadence for the article footer, from the
 * newest-first archive list. "previous" = older edition, "next" = newer.
 */
export function neighborSlugs(
  items: PublicRecapListItem[],
  slug: string,
): { previous: PublicRecapListItem | null; next: PublicRecapListItem | null } {
  const current = items.find((i) => i.slug === slug);
  if (!current) return { previous: null, next: null };
  const sameKind = items.filter((i) => i.kind === current.kind);
  const idx = sameKind.findIndex((i) => i.slug === slug);
  return {
    previous: idx >= 0 && idx + 1 < sameKind.length ? sameKind[idx + 1] : null,
    next: idx > 0 ? sameKind[idx - 1] : null,
  };
}
