/**
 * Compact display form for large counts: 950 → "950", 12500 → "12.5K",
 * 1_234_567 → "1.2M". One decimal max, trailing ".0" dropped by Intl.
 * Returns '' for null/undefined/non-finite so callers can filter falsy.
 */
export function formatCompactNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '';
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}
