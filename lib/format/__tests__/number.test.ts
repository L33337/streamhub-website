import { describe, it, expect } from 'vitest';
import { formatCompactNumber } from '../number';

describe('formatCompactNumber', () => {
  it('keeps small numbers as-is', () => {
    expect(formatCompactNumber(0)).toBe('0');
    expect(formatCompactNumber(950)).toBe('950');
  });

  it('compacts thousands and millions with one decimal max', () => {
    expect(formatCompactNumber(12_500)).toBe('12.5K');
    expect(formatCompactNumber(1_000)).toBe('1K');
    expect(formatCompactNumber(1_234_567)).toBe('1.2M');
    expect(formatCompactNumber(24_300_000)).toBe('24.3M');
  });

  it('returns an empty string for null/undefined/non-finite', () => {
    expect(formatCompactNumber(null)).toBe('');
    expect(formatCompactNumber(undefined)).toBe('');
    expect(formatCompactNumber(Number.NaN)).toBe('');
    expect(formatCompactNumber(Number.POSITIVE_INFINITY)).toBe('');
  });

  it('localizes the compact notation (loose asserts — ICU may vary)', () => {
    // German uses comma decimals and other compact suffixes than "12.5K".
    const de = formatCompactNumber(12_500, 'de');
    expect(de).not.toBe('');
    expect(de).not.toBe('12.5K');
    expect(formatCompactNumber(12_500, 'ja')).not.toBe('');
    expect(formatCompactNumber(12_500, 'pl')).not.toBe('');
  });

  it('falls back to en-US for invalid language tags', () => {
    expect(formatCompactNumber(12_500, 'not a tag!')).toBe('12.5K');
  });
});
