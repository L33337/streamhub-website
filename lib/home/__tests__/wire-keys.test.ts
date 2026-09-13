import { describe, it, expect } from 'vitest';
import { decodeWire, encodeWire } from '../wire-keys';

interface Sample {
  id: string;
  label?: string;
  count: number | null;
  tags?: string[];
}

const KEYS = { id: 'i', label: 'l', count: 'c', tags: 't' } as const;

describe('encodeWire / decodeWire', () => {
  it('renames every defined field and decodes back to the same object', () => {
    const value: Sample = { id: 'a', label: 'Hello', count: null, tags: ['x'] };
    const wire = encodeWire(value, KEYS);
    expect(wire).toEqual({ i: 'a', l: 'Hello', c: null, t: ['x'] });
    expect(decodeWire<Sample, typeof KEYS>(wire, KEYS)).toEqual(value);
  });

  it('keeps absent and undefined fields absent on both sides', () => {
    const value: Sample = { id: 'a', count: 3, label: undefined };
    const wire = encodeWire(value, KEYS);
    expect(Object.keys(wire)).toEqual(['i', 'c']);
    const back = decodeWire<Sample, typeof KEYS>(wire, KEYS);
    expect(back).not.toHaveProperty('label');
    expect(back).not.toHaveProperty('tags');
  });

  it('keeps falsy values that carry information', () => {
    const value: Sample = { id: '', count: 0, label: '' };
    const back = decodeWire<Sample, typeof KEYS>(
      JSON.parse(JSON.stringify(encodeWire(value, KEYS))),
      KEYS,
    );
    expect(back).toEqual(value);
  });

  it('ignores inherited properties when decoding', () => {
    const back = decodeWire<Sample, typeof KEYS>(
      Object.create({ l: 'inherited' }) as never,
      KEYS,
    );
    expect(back).not.toHaveProperty('label');
  });
});
