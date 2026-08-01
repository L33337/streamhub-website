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
 *
 * `lang` localizes the separators ("2.1" → de "2,1"). It defaults to 'en'
 * because the M24 pages that introduced this helper are English-only bodies;
 * the homepage quick facts (2026-08-01) are the first localized caller, where
 * an en-US "2.1" would read as a THOUSANDS separator in de/es/it/pt.
 */
export function formatStatValue(value: number | null | undefined, lang = 'en'): string {
  if (value == null || !Number.isFinite(value)) return '';
  const locale = lang === 'en' ? 'en-US' : lang;
  if (value < 1000) {
    // < 10 keeps one decimal, above that the decimals are noise.
    const options: Intl.NumberFormatOptions = {
      maximumFractionDigits: value < 10 ? 1 : 0,
      // Nothing below 1000 groups; without this a rounded 999.6 would become
      // "1,000" where the previous implementation printed "1000".
      useGrouping: false,
    };
    try {
      return new Intl.NumberFormat(locale, options).format(value);
    } catch {
      return new Intl.NumberFormat('en-US', options).format(value);
    }
  }
  // Round BEFORE compacting: de/ja have no short form below 10,000, so an
  // unrounded 9347.2 would render as "9347,2" — a decimal on a value whose
  // decimals are sampling noise. English is unaffected ("9.3K" either way).
  return formatCompactNumber(Math.round(value), lang);
}
