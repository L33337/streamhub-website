import { describe, expect, it } from 'vitest';
import type { IcsSlot } from '@/lib/feed/ics';
import { buildProgramDayIcs, programDayIcsFilename } from '../ics';

const fixedNow = new Date('2026-07-22T12:00:00.000Z');

function icsSlot(overrides: Partial<IcsSlot>): IcsSlot {
  return {
    id: 'slot-1',
    streamerName: 'StreamerOne',
    streamTitle: 'Ranked grind',
    startTime: '2026-07-22T19:00:00.000Z',
    duration: 120,
    category: 'Just Chatting',
    ...overrides,
  };
}

describe('buildProgramDayIcs', () => {
  it('bundles one VEVENT per slot in a single VCALENDAR', () => {
    const ics = buildProgramDayIcs(
      [icsSlot({}), icsSlot({ id: 'slot-2', streamerName: 'StreamerTwo' })],
      { now: fixedNow },
    );
    expect(ics.match(/BEGIN:VCALENDAR/g)).toHaveLength(1);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    // Same UIDs as the per-slot export — re-imports update, not duplicate.
    expect(ics).toContain('UID:slot-1@streamertimes.tv');
    expect(ics).toContain('UID:slot-2@streamertimes.tv');
    expect(ics).toContain('SUMMARY:StreamerTwo live: Just Chatting');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    // Every line break is CRLF (no bare \n)
    expect(ics.replace(/\r\n/g, '')).not.toContain('\n');
  });

  it('produces a valid empty calendar for zero slots (callers disable the button)', () => {
    const ics = buildProgramDayIcs([], { now: fixedNow });
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).not.toContain('BEGIN:VEVENT');
  });
});

describe('programDayIcsFilename', () => {
  it('keys the filename by the LOCAL selected day, zero-padded', () => {
    expect(programDayIcsFilename(new Date(2026, 0, 5))).toBe(
      'streamertimes-program-2026-01-05.ics',
    );
  });
});
