import { describe, expect, it } from 'vitest';
import fixture from '../__fixtures__/social-card-spec.fixture.json';
import { parseSocialCardSpec, SOCIAL_CARD_SPEC_VERSION, SocialCardSpecError } from '../types';
import { eyebrowParts } from '../theme';

// Contract test: every spec the backend produces (fixture copied from
// StreamHub supabase/functions/_shared/social-card-spec.fixture.json) must
// parse here. A change on either side that breaks the contract fails this
// test before a card is rendered wrong in production.

const specs = Object.entries(fixture).filter(([k]) => k !== 'generated_from');

describe('social card spec contract', () => {
  it('parses every fixture layout', () => {
    expect(specs.length).toBeGreaterThanOrEqual(8);
    for (const [key, raw] of specs) {
      const spec = parseSocialCardSpec(raw);
      expect(spec.version, key).toBe(SOCIAL_CARD_SPEC_VERSION);
      expect(['list', 'moment'], key).toContain(spec.layout);
    }
  });

  it('list specs carry 3–5 rows with formatted values and https avatars', () => {
    for (const [key, raw] of specs.filter(([k]) => k.startsWith('list_'))) {
      const spec = parseSocialCardSpec(raw);
      if (spec.layout !== 'list') throw new Error(key);
      expect(spec.rows.length, key).toBeGreaterThanOrEqual(3);
      expect(spec.rows.length, key).toBeLessThanOrEqual(5);
      for (const row of spec.rows) {
        expect(row.value, key).toMatch(/^[+\-]?[\d,.]+[KM]?$/);
        if (row.avatar_url) expect(row.avatar_url).toMatch(/^https:\/\//);
      }
      expect(spec.title.length).toBeGreaterThanOrEqual(1);
      expect(spec.title.flat().some((s) => s.accent), `${key} has an accented word`).toBe(true);
    }
  });

  it('moment specs: motif matches the moment type, fun fact optional', () => {
    const m = parseSocialCardSpec(fixture.moment_milestone);
    const r = parseSocialCardSpec(fixture.moment_record);
    const a = parseSocialCardSpec(fixture.moment_marathon);
    if (m.layout !== 'moment' || r.layout !== 'moment' || a.layout !== 'moment') throw new Error('layout');
    expect(m.motif.type).toBe('ring');
    expect(r.motif.type).toBe('sparkline');
    expect(a.motif.type).toBe('arc');
    expect(m.fun_fact?.eyebrow).toBe('FROM THIS WEEK’S STREAMS');
    expect(r.fun_fact?.text).toContain('German-speaking'); // the language rides in the story, never as a "translated" note
    expect(a.fun_fact).toBeNull();
  });

  it('rejects malformed specs with a message', () => {
    const base = fixture.list_peak;
    expect(() => parseSocialCardSpec(null)).toThrow(SocialCardSpecError);
    expect(() => parseSocialCardSpec({ ...base, version: 2 })).toThrow(/version/);
    expect(() => parseSocialCardSpec({ ...base, accent: 'pink' })).toThrow(/accent/);
    expect(() => parseSocialCardSpec({ ...base, rows: [] })).toThrow(/rows/);
    expect(() => parseSocialCardSpec({ ...base, rows: [...base.rows, ...base.rows] })).toThrow(/rows/);
    expect(() => parseSocialCardSpec({ ...base, rows: [{ ...base.rows[0], avatar_url: 'http://x' }] })).toThrow(/https/);
    expect(() => parseSocialCardSpec({ ...base, title: [] })).toThrow(/title/);
    expect(() => parseSocialCardSpec({ ...base, layout: 'grid' })).toThrow(/layout/);
    expect(() => parseSocialCardSpec({ ...fixture.moment_record, motif: { type: 'bars' } })).toThrow(/motif/);
    expect(() => parseSocialCardSpec({ ...fixture.moment_record, fun_fact: 'nope' })).toThrow(/fun_fact/);
    const longName = { ...base, rows: [{ ...base.rows[0], name: 'x'.repeat(41) }] };
    expect(() => parseSocialCardSpec(longName)).toThrow(/name/);
  });

  it('clamps ring fill and peak index', () => {
    const m = parseSocialCardSpec({ ...fixture.moment_milestone, motif: { type: 'ring', fill: 7, label: 'x' } });
    if (m.layout !== 'moment' || m.motif.type !== 'ring') throw new Error();
    expect(m.motif.fill).toBe(1);
    const r = parseSocialCardSpec({ ...fixture.moment_record, motif: { type: 'sparkline', points: [1, 2, 3], peak_index: 9, baseline: 2, label: 'x' } });
    if (r.layout !== 'moment' || r.motif.type !== 'sparkline') throw new Error();
    expect(r.motif.peak_index).toBe(2);
  });

  it('eyebrowParts splits around the accented label', () => {
    expect(eyebrowParts('Streamer Times · Week 38 · Sep 14 – 20, 2026', 'Week 38')).toEqual([
      { text: 'Streamer Times · ', accent: false },
      { text: 'Week 38', accent: true },
      { text: ' · Sep 14 – 20, 2026', accent: false },
    ]);
    expect(eyebrowParts('Streamer Times · September 2026', 'September 2026')).toEqual([
      { text: 'Streamer Times · ', accent: false },
      { text: 'September 2026', accent: true },
    ]);
    expect(eyebrowParts('plain', 'missing')).toEqual([{ text: 'plain', accent: false }]);
  });
});
