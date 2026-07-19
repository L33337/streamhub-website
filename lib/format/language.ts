// English display names for streamer broadcaster-language codes ("de" →
// "German"). Twitch sends ISO-639-1 codes plus two specials the CLDR data
// doesn't know: "other" and "asl" (American Sign Language — the ISO code
// would be "ase", but Twitch uses "asl").

const displayNames = (() => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language', fallback: 'code' });
  } catch {
    return null; // runtime without Intl.DisplayNames — fall back to codes
  }
})();

/**
 * Human-readable English language name for a broadcaster language code, or
 * null when there is no code. Region subtags are dropped for compactness
 * ("zh-hk" → "Chinese", not "Chinese (Hong Kong SAR China)"); codes the CLDR
 * cannot resolve fall back to the uppercased input ("xx" → "XX").
 */
export function languageDisplayName(code: string | null | undefined): string | null {
  if (!code) return null;
  const trimmed = code.trim().toLowerCase();
  if (!trimmed) return null;
  if (trimmed === 'other') return 'Other';
  if (trimmed === 'asl') return 'American Sign Language';
  const base = trimmed.split('-')[0];
  try {
    const name = displayNames?.of(base);
    if (name && name.toLowerCase() !== base) return name;
  } catch {
    // Malformed tag — fall through to the code fallback.
  }
  return trimmed.toUpperCase();
}
