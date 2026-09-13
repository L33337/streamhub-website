import { describe, expect, it } from 'vitest';
import { isRelatableLanguage, languageDisplayName } from '@/lib/format/language';

describe('isRelatableLanguage', () => {
  it('accepts ISO 639 codes with or without a region tail', () => {
    expect(isRelatableLanguage('en')).toBe(true);
    expect(isRelatableLanguage('DE')).toBe(true);
    expect(isRelatableLanguage('pt-BR')).toBe(true);
    expect(isRelatableLanguage('jpn')).toBe(true);
  });

  it("rejects Twitch's specials — the API answers 400 for them", () => {
    expect(isRelatableLanguage('other')).toBe(false);
    expect(isRelatableLanguage('asl')).toBe(true); // 3 letters: valid shape, the API accepts it
  });

  it('rejects empty, null and malformed input', () => {
    expect(isRelatableLanguage(null)).toBe(false);
    expect(isRelatableLanguage(undefined)).toBe(false);
    expect(isRelatableLanguage('')).toBe(false);
    expect(isRelatableLanguage('de1')).toBe(false);
    expect(isRelatableLanguage('<script>')).toBe(false);
  });
});

describe('languageDisplayName', () => {
  it('maps common ISO codes to English names', () => {
    expect(languageDisplayName('en')).toBe('English');
    expect(languageDisplayName('de')).toBe('German');
    expect(languageDisplayName('pt')).toBe('Portuguese');
    expect(languageDisplayName('ja')).toBe('Japanese');
  });

  it('is case-insensitive', () => {
    expect(languageDisplayName('DE')).toBe('German');
  });

  it('drops region subtags for compactness', () => {
    expect(languageDisplayName('zh-hk')).toBe('Chinese');
    expect(languageDisplayName('pt-br')).toBe('Portuguese');
  });

  it('handles the Twitch special codes', () => {
    expect(languageDisplayName('other')).toBe('Other');
    expect(languageDisplayName('asl')).toBe('American Sign Language');
  });

  it('falls back to the uppercased code for unknown languages', () => {
    expect(languageDisplayName('xx')).toBe('XX');
  });

  it('returns null for missing input', () => {
    expect(languageDisplayName(null)).toBeNull();
    expect(languageDisplayName(undefined)).toBeNull();
    expect(languageDisplayName('')).toBeNull();
    expect(languageDisplayName('   ')).toBeNull();
  });
});
