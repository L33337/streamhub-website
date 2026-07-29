// Shared vocabulary for the homepage's dropdown filters (live rail 2026-07-28,
// lineup 2026-07-30). Both sections count their options the same way, and the
// ordering below is part of the ISR contract — see countFilterOptions.

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
