import { describe, it, expect } from 'vitest';
import { hasPositionClass, touchTargetExpander } from '../positioning';

describe('hasPositionClass', () => {
  it('detects every positioning utility', () => {
    expect(hasPositionClass('absolute right-3 top-3 z-10')).toBe(true);
    expect(hasPositionClass('fixed bottom-4')).toBe(true);
    expect(hasPositionClass('sticky top-0')).toBe(true);
    expect(hasPositionClass('relative')).toBe(true);
    expect(hasPositionClass('z-10 absolute')).toBe(true);
  });

  it('returns false for unpositioned class lists', () => {
    expect(hasPositionClass('')).toBe(false);
    expect(hasPositionClass('shrink-0')).toBe(false);
    expect(hasPositionClass('mt-1 shrink-0')).toBe(false);
  });

  it('does not match positioning names inside other utilities', () => {
    // These share a prefix/substring but are not position utilities.
    expect(hasPositionClass('inset-0')).toBe(false);
    expect(hasPositionClass('absolutely-not')).toBe(false);
    expect(hasPositionClass('hover:relative-ish')).toBe(false);
  });
});

describe('touchTargetExpander', () => {
  it('adds `relative` only when the caller has not positioned the control', () => {
    expect(touchTargetExpander('shrink-0', 'lg')).toContain('relative');
    // The regression this guards: a blanket `relative` beat the caller's
    // `absolute` (equal specificity, stylesheet order decides), so overlay
    // hearts and bells fell out of their corners into the page flow.
    expect(touchTargetExpander('absolute right-3 top-3 z-10', 'lg')).not.toContain('relative');
  });

  it('emits literal Tailwind classes for every size', () => {
    // Assembled class names would be invisible to Tailwind's source scanner,
    // so each variant must be a full literal.
    expect(touchTargetExpander('', 'sm')).toContain('before:-inset-1 ');
    expect(touchTargetExpander('', 'md')).toContain('before:-inset-1.5');
    expect(touchTargetExpander('', 'lg')).toContain('before:-inset-2');
    for (const size of ['sm', 'md', 'lg'] as const) {
      expect(touchTargetExpander('', size)).toContain('before:absolute');
      expect(touchTargetExpander('', size)).toContain("before:content-['']");
    }
  });
});
