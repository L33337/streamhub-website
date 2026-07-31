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

/**
 * Display form for M24 stat values (viewers/channel scores, medians, channel
 * counts) whose raw magnitude spans 0.1 … 50,000+. One rule everywhere so
 * columns stay comparable:
 *   < 10    → one decimal ("7.7", "2" — trailing .0 dropped)
 *   < 1000  → integer ("499")
 *   ≥ 1000  → compact ("8.9K", "50K")
 * The decimals of the raw aggregates ("45808.6") are sampling noise, not
 * precision — never show them above 10. Returns '' for null/non-finite so
 * callers keep their own null branches ("—").
 */
export function formatStatValue(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '';
  if (value < 10) {
    const rounded = Math.round(value * 10) / 10;
    return `${rounded}`;
  }
  if (value < 1000) return `${Math.round(value)}`;
  return formatCompactNumber(value, 'en');
}
