// Shared plumbing for filter metadata the homepage islands DERIVE instead of
// receiving (payload diet 2026-09-14, SEO plan F7).
//
// The three filtered sections (live rail, lineup, clips) used to ship one
// filter item per card, each repeating its language NAME in the viewer's
// locale. The islands now rebuild those items from the card data they already
// hold, and the only thing they cannot compute themselves — the localized
// language names (Intl data stays on the server, CLAUDE.md D6) — travels once
// per language as a small code → label map.

import { normalizeLanguageCode } from './filter-options';

/**
 * code → label for every language among `rawCodes`, labelled exactly as the
 * server labels a filter item, so a derived item is indistinguishable from a
 * shipped one.
 */
export function collectLanguageLabels(
  rawCodes: Iterable<string | null | undefined>,
  languageName: (code: string) => string,
): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const raw of rawCodes) {
    const code = normalizeLanguageCode(raw);
    if (code && ownValue(labels, code) === undefined) {
      labels[code] = languageName(code);
    }
  }
  return labels;
}

/**
 * The client-side `languageName` resolver over a shipped label map. The
 * fallback mirrors the server's own (`languageDisplayName(...) ?? upper`) and
 * is unreachable when the map was collected over the same codes.
 */
export function languageNameFromLabels(
  labels: Record<string, string>,
): (code: string) => string {
  return (code) => ownValue(labels, code) ?? code.toUpperCase();
}

/**
 * Own-property lookup: a plain object literal inherits `constructor`,
 * `toString` & co., which a bare `record[key]` would happily return.
 */
export function ownValue(
  record: Record<string, string>,
  key: string,
): string | undefined {
  return Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
}
