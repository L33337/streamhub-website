/**
 * Compact display form for large counts: 950 → "950", 12500 → "12.5K",
 * 1_234_567 → "1.2M". One decimal max, trailing ".0" dropped by Intl.
 * Returns '' for null/undefined/non-finite so callers can filter falsy.
 *
 * `lang` localizes the notation (de → "12.500" / "1,2 Mio."); the default 'en'
 * path is pinned to en-US so existing English output stays byte-identical.
 */
export function formatCompactNumber(
  value: number | null | undefined,
  lang = 'en',
): string {
  if (value == null || !Number.isFinite(value)) return '';
  const locale = lang === 'en' ? 'en-US' : lang;
  const options: Intl.NumberFormatOptions = {
    notation: 'compact',
    maximumFractionDigits: 1,
  };
  try {
    return new Intl.NumberFormat(locale, options).format(value);
  } catch {
    return new Intl.NumberFormat('en-US', options).format(value);
  }
}
