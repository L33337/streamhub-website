import { describe, it, expect } from 'vitest';
import { formatCompactNumber, formatStatValue } from '../number';

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

describe('formatStatValue', () => {
  it('keeps one decimal below 10 (avg-live-channel range)', () => {
    expect(formatStatValue(7.68)).toBe('7.7');
    expect(formatStatValue(1.04)).toBe('1');
    expect(formatStatValue(2)).toBe('2');
    expect(formatStatValue(9.95)).toBe('10'); // rounds up across the boundary
    expect(formatStatValue(0)).toBe('0');
  });

  it('drops the fake decimals of raw aggregates between 10 and 1000', () => {
    expect(formatStatValue(499.2)).toBe('499');
    expect(formatStatValue(45.6)).toBe('46');
    expect(formatStatValue(999.4)).toBe('999');
  });

  it('compacts everything from 1000 up', () => {
    expect(formatStatValue(8_882.6)).toBe('8.9K');
    expect(formatStatValue(45_808.6)).toBe('45.8K');
    expect(formatStatValue(50_018)).toBe('50K');
    expect(formatStatValue(12_332)).toBe('12.3K');
  });

  it('empty string for null/undefined/non-finite (callers keep their own "—")', () => {
    expect(formatStatValue(null)).toBe('');
    expect(formatStatValue(undefined)).toBe('');
    expect(formatStatValue(Number.NaN)).toBe('');
  });
});
