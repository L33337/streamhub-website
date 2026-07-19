import { describe, expect, it } from 'vitest';
import { languageDisplayName } from '@/lib/format/language';

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
