// Unit tests for the recap-article view logic (lib/recaps.ts, 2026-08-09).

import { describe, expect, it } from 'vitest';
import {
  isRecapLocalized,
  latestByKind,
  neighborSlugs,
  parseRecapParagraph,
  recapHref,
  recapPeriodLabel,
  recapPlainText,
  streamerNameMap,
} from '@/lib/recaps';
import type { PublicRecapListItem } from '@/lib/server/partner-api';

const names = new Map([
  ['alpha', 'Alpha'],
  ['gamma', 'Gamma'],
]);

function listItem(overrides: Partial<PublicRecapListItem>): PublicRecapListItem {
  return {
    slug: '2026-week-32',
    kind: 'weekly',
    period_start: '2026-08-03',
    period_end: '2026-08-09',
    published_at: '2026-08-10T06:31:00Z',
    language: 'en',
    requested_language: 'en',
    available_languages: ['en'],
    title: 'T',
    teaser: 'S',
    hero: { clip: null, streamers: [] },
    ...overrides,
  };
}

describe('parseRecapParagraph', () => {
  it('splits text and known markers into segments', () => {
    const segs = parseRecapParagraph('Start [[streamer:alpha]] mid [[streamer:gamma]] end.', names);
    expect(segs).toEqual([
      { type: 'text', text: 'Start ' },
      { type: 'link', streamerId: 'alpha', name: 'Alpha' },
      { type: 'text', text: ' mid ' },
      { type: 'link', streamerId: 'gamma', name: 'Gamma' },
      { type: 'text', text: ' end.' },
    ]);
  });

  it('degrades unknown ids to plain text (sentence keeps its subject)', () => {
    expect(parseRecapParagraph('[[streamer:ghost]] won.', names)).toEqual([
      { type: 'text', text: 'ghost' },
      { type: 'text', text: ' won.' },
    ]);
  });

  it('passes marker-free text through as one segment', () => {
    expect(parseRecapParagraph('No markers here.', names)).toEqual([
      { type: 'text', text: 'No markers here.' },
    ]);
  });

  it('handles markers at both ends', () => {
    const segs = parseRecapParagraph('[[streamer:alpha]] and [[streamer:gamma]]', names);
    expect(segs[0]).toEqual({ type: 'link', streamerId: 'alpha', name: 'Alpha' });
    expect(segs.at(-1)).toEqual({ type: 'link', streamerId: 'gamma', name: 'Gamma' });
  });
});

describe('recapPlainText', () => {
  it('replaces markers with display names', () => {
    expect(recapPlainText('Then [[streamer:alpha]] climbed.', names)).toBe('Then Alpha climbed.');
  });
});

describe('streamerNameMap', () => {
  it('maps id to name', () => {
    const map = streamerNameMap([{ id: 'x', name: 'X', avatar_url: null }]);
    expect(map.get('x')).toBe('X');
  });
});

describe('recapPeriodLabel', () => {
  it('renders the monthly label in the viewer locale', () => {
    expect(recapPeriodLabel('monthly', '2026-07-01', '2026-07-31', 'en')).toBe('July 2026');
    expect(recapPeriodLabel('monthly', '2026-07-01', '2026-07-31', 'de')).toBe('Juli 2026');
  });

  it('renders a weekly range containing both days and the year', () => {
    const label = recapPeriodLabel('weekly', '2026-08-03', '2026-08-09', 'en');
    expect(label).toContain('3');
    expect(label).toContain('9');
    expect(label).toContain('2026');
    expect(label).toContain('Aug');
  });

  it('returns empty string on invalid dates', () => {
    expect(recapPeriodLabel('weekly', 'garbage', '2026-08-09', 'en')).toBe('');
  });
});

describe('latestByKind', () => {
  it('picks the first (newest) edition per cadence', () => {
    const items = [
      listItem({ slug: '2026-week-32', kind: 'weekly' }),
      listItem({ slug: '2026-07', kind: 'monthly', period_start: '2026-07-01' }),
      listItem({ slug: '2026-week-31', kind: 'weekly', period_start: '2026-07-27' }),
    ];
    const { weekly, monthly } = latestByKind(items);
    expect(weekly?.slug).toBe('2026-week-32');
    expect(monthly?.slug).toBe('2026-07');
  });

  it('returns nulls for an empty list', () => {
    expect(latestByKind([])).toEqual({ weekly: null, monthly: null });
  });
});

describe('isRecapLocalized', () => {
  it('is true only when served language matches the requested one', () => {
    expect(isRecapLocalized({ language: 'de', requested_language: 'de' })).toBe(true);
    expect(isRecapLocalized({ language: 'en', requested_language: 'de' })).toBe(false);
  });
});

describe('neighborSlugs', () => {
  const items = [
    listItem({ slug: '2026-week-33', kind: 'weekly', period_start: '2026-08-10' }),
    listItem({ slug: '2026-07', kind: 'monthly', period_start: '2026-07-01' }),
    listItem({ slug: '2026-week-32', kind: 'weekly', period_start: '2026-08-03' }),
    listItem({ slug: '2026-week-31', kind: 'weekly', period_start: '2026-07-27' }),
  ];

  it('finds same-cadence neighbors (newest-first list)', () => {
    const { previous, next } = neighborSlugs(items, '2026-week-32');
    expect(previous?.slug).toBe('2026-week-31');
    expect(next?.slug).toBe('2026-week-33');
  });

  it('omits missing neighbors at the edges', () => {
    expect(neighborSlugs(items, '2026-week-33').next).toBeNull();
    expect(neighborSlugs(items, '2026-week-31').previous).toBeNull();
    expect(neighborSlugs(items, '2026-07')).toEqual({ previous: null, next: null });
  });

  it('returns nulls for an unknown slug', () => {
    expect(neighborSlugs(items, 'nope')).toEqual({ previous: null, next: null });
  });
});

describe('recapHref', () => {
  it('builds the encoded article path', () => {
    expect(recapHref('2026-week-32')).toBe('/rankings/recap/2026-week-32');
  });
});
