import { describe, expect, it } from 'vitest';
import { buildSlotIcs, escapeIcsText, slotIcsFilename, toIcsUtc, type IcsSlot } from '../ics';

const baseSlot: IcsSlot = {
  id: 'slot-123',
  streamerName: 'TestStreamer',
  streamTitle: 'Ranked grind, then chatting',
  startTime: '2026-07-22T19:00:00.000Z',
  duration: 180,
  category: 'Just Chatting',
};

const fixedNow = new Date('2026-07-22T12:00:00.000Z');

describe('toIcsUtc', () => {
  it('formats compact UTC timestamps', () => {
    expect(toIcsUtc(new Date('2026-07-22T19:05:30.000Z'))).toBe('20260722T190530Z');
  });
});

describe('escapeIcsText', () => {
  it('escapes backslash, semicolon, comma and newlines', () => {
    expect(escapeIcsText('a\\b;c,d\ne')).toBe('a\\\\b\\;c\\,d\\ne');
    expect(escapeIcsText('win\r\nline')).toBe('win\\nline');
  });
});

describe('buildSlotIcs', () => {
  it('builds a valid single-event calendar with CRLF endings', () => {
    const ics = buildSlotIcs(baseSlot, { now: fixedNow });
    expect(ics).toContain('BEGIN:VCALENDAR\r\n');
    expect(ics).toContain('UID:slot-123@streamertimes.tv');
    expect(ics).toContain('DTSTAMP:20260722T120000Z');
    expect(ics).toContain('DTSTART:20260722T190000Z');
    // 180 min after start
    expect(ics).toContain('DTEND:20260722T220000Z');
    expect(ics).toContain('SUMMARY:TestStreamer live: Just Chatting');
    expect(ics).toContain('STATUS:TENTATIVE');
    expect(ics).toContain('URL:https://streamertimes.tv/schedule/slot-123');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    // Every line break is CRLF (no bare \n)
    expect(ics.replace(/\r\n/g, '')).not.toContain('\n');
  });

  it('escapes calendar-reserved characters in summary and description', () => {
    const ics = buildSlotIcs(
      { ...baseSlot, streamerName: 'A;B', category: 'RPG, Adventure', streamTitle: 'Line1\nLine2' },
      { now: fixedNow },
    );
    expect(ics).toContain('SUMMARY:A\\;B live: RPG\\, Adventure');
    expect(ics).toContain('DESCRIPTION:Line1\\nLine2');
  });

  it('falls back to a 120-minute duration when the slot has none', () => {
    const ics = buildSlotIcs({ ...baseSlot, duration: 0 }, { now: fixedNow });
    expect(ics).toContain('DTEND:20260722T210000Z');
  });

  it('omits the category suffix when absent', () => {
    const ics = buildSlotIcs({ ...baseSlot, category: undefined }, { now: fixedNow });
    expect(ics).toContain('SUMMARY:TestStreamer live\r\n');
  });
});

describe('slotIcsFilename', () => {
  it('slugifies the streamer name and appends the date', () => {
    expect(slotIcsFilename(baseSlot)).toBe('teststreamer-2026-07-22.ics');
    expect(slotIcsFilename({ ...baseSlot, streamerName: 'Ünïcode Náme!' })).toBe(
      'n-code-n-me-2026-07-22.ics',
    );
    expect(slotIcsFilename({ ...baseSlot, streamerName: '???' })).toBe('stream-2026-07-22.ics');
  });
});
