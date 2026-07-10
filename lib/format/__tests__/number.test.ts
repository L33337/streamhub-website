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
});
