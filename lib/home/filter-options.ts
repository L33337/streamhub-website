// Shared vocabulary for the homepage's dropdown filters (live rail 2026-07-28,
// lineup 2026-07-30, clips 2026-07-31). All three sections count their options
// the same way, and the ordering below is part of the ISR contract — see
// countFilterOptions.

export interface CountedFilterOption {
  /** Filter key, e.g. a raw category name or a normalized language code. */
  value: string;
  /** What the dropdown shows (category names are their own label). */
  label: string;
  /** Items matching this option within the pool it was counted over. */
  count: number;
}

/**
 * Dropdown options for one dimension, counted over whatever pool the caller
 * passes. Callers pass the pool narrowed by the OTHER dimensions, so the
 * counts always describe what picking the option would actually show and a
 * zero-result combination cannot be selected.
 *
 * Items whose value is blank are skipped rather than bucketed: a slot with no
 * category or an unknown broadcaster language stays reachable only under
 * "All", because inventing an "Unknown" entry in a filter reads as a bug.
 *
 * Sorted by count desc, then label, so the order is stable across ISR renders
 * with identical data.
 */
export function countFilterOptions<T>(
  items: readonly T[],
  value: (item: T) => string,
  label: (item: T) => string,
): CountedFilterOption[] {
  const counts = new Map<string, CountedFilterOption>();
  for (const item of items) {
    const key = value(item);
    if (!key) continue;
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else counts.set(key, { value: key, label: label(item), count: 1 });
  }
  return [...counts.values()].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label),
  );
}

/**
 * Normalizes a broadcaster language to the value the filters use as their key:
 * lowercased, region subtag dropped ("pt-BR" → "pt"), so Twitch's regional
 * variants collapse into one option. Returns null for a missing/blank code —
 * those items stay reachable only under "All languages", because inventing an
 * "Unknown" bucket in a filter reads as a bug.
 *
 * Lives here rather than next to one section: the live rail reads the language
 * off a slot, the clips rail off the clip's streamer, and a second copy of the
 * region rule is exactly how the two would drift apart.
 */
export function normalizeLanguageCode(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  const base = raw.trim().toLowerCase().split('-')[0];
  return base.length > 0 ? base : null;
}
