import { describe, it, expect } from 'vitest';
import {
  LIVE_STATUS_SLOT_LIMIT,
  liveStatusQueryPath,
  parseLiveStatusRows,
} from '../wiki-live';

// Phase 4a (2026-09-19): the wiki live island asks Supabase directly. These
// tests pin the query string (the drift contract against the backend's
// /v1/schedules filters) and the row → state mapping.

const NOW = new Date('2026-09-19T12:00:00.000Z');

describe('liveStatusQueryPath', () => {
  it('pins the PostgREST contract: streamer gate + embedded upcoming slots in a 7-day window', () => {
    expect(liveStatusQueryPath('timthetatman', NOW)).toBe(
      'streamers?id=eq.timthetatman&is_hidden=eq.false' +
        '&select=last_known_status%2Cstream_slots(start_time%2Ccategory%2Cconfidence%2Cplatforms%2Cis_ai_prediction%2Cslot_kind)' +
        '&stream_slots.visible=eq.true&stream_slots.status=eq.upcoming' +
        '&stream_slots.start_time=gte.2026-09-19T12%3A00%3A00.000Z' +
        '&stream_slots.start_time=lte.2026-09-26T12%3A00%3A00.000Z' +
        '&stream_slots.order=start_time.asc' +
        `&stream_slots.limit=${LIVE_STATUS_SLOT_LIMIT}`,
    );
  });

  it('encodes the streamer id (collision suffixes and odd characters stay one filter value)', () => {
    expect(liveStatusQueryPath('a b&c', NOW)).toContain('id=eq.a%20b%26c&is_hidden');
  });
});

const slot = (over: Record<string, unknown> = {}) => ({
  start_time: '2026-09-20T18:00:00+00:00',
  category: 'Just Chatting',
  confidence: 'high',
  platforms: ['twitch'],
  is_ai_prediction: false,
  slot_kind: 'regular',
  ...over,
});

describe('parseLiveStatusRows', () => {
  it('maps a live streamer with a real slot', () => {
    const out = parseLiveStatusRows([{ last_known_status: 'live', stream_slots: [slot()] }], NOW);
    expect(out).toEqual({
      isLive: true,
      nextSlot: {
        start_time: '2026-09-20T18:00:00.000Z',
        category: 'Just Chatting',
        confidence: 'high',
        platforms: ['twitch'],
        is_predicted: false,
        slot_kind: 'regular',
      },
    });
  });

  it('is_predicted mirrors is_ai_prediction === true, like the Partner API DTO', () => {
    const out = parseLiveStatusRows(
      [{ last_known_status: 'offline', stream_slots: [slot({ is_ai_prediction: true })] }],
      NOW,
    );
    expect(out?.nextSlot?.is_predicted).toBe(true);
    const off = parseLiveStatusRows([{ last_known_status: 'offline', stream_slots: [slot({ is_ai_prediction: null })] }], NOW);
    expect(off?.nextSlot?.is_predicted).toBe(false);
  });

  it('null last_known_status is not live; platforms/category default like the DTO', () => {
    const out = parseLiveStatusRows(
      [{ last_known_status: null, stream_slots: [slot({ platforms: null, category: null })] }],
      NOW,
    );
    expect(out?.isLive).toBe(false);
    expect(out?.nextSlot?.platforms).toEqual([]);
    expect(out?.nextSlot?.category).toBeNull();
  });

  it('picks the earliest non-cancelled slot inside the rendered week', () => {
    const out = parseLiveStatusRows(
      [
        {
          last_known_status: 'offline',
          stream_slots: [
            slot({ start_time: '2026-09-21T10:00:00Z', slot_kind: 'cancelled' }),
            slot({ start_time: '2026-09-23T10:00:00Z', category: 'Later' }),
            slot({ start_time: '2026-09-22T10:00:00Z', category: 'Sooner' }),
          ],
        },
      ],
      NOW,
    );
    expect(out?.nextSlot?.category).toBe('Sooner');
  });

  it('only cancelled slots → no pill (nextSlot null, still a valid state)', () => {
    const out = parseLiveStatusRows(
      [{ last_known_status: 'offline', stream_slots: [slot({ slot_kind: 'cancelled' })] }],
      NOW,
    );
    expect(out).toEqual({ isLive: false, nextSlot: null });
  });

  it('a slot on the day past the rendered week has no anchor and is skipped', () => {
    const out = parseLiveStatusRows(
      [{ last_known_status: 'offline', stream_slots: [slot({ start_time: '2026-09-26T13:00:00Z' })] }],
      NOW,
    );
    expect(out?.nextSlot).toBeNull();
  });

  it('unknown confidence degrades to low (the wiki then hides the category), unknown kind to undefined', () => {
    const out = parseLiveStatusRows(
      [{ last_known_status: 'offline', stream_slots: [slot({ confidence: 'wild', slot_kind: 'future' })] }],
      NOW,
    );
    expect(out?.nextSlot?.confidence).toBe('low');
    expect(out?.nextSlot?.slot_kind).toBeUndefined();
  });

  it('drops malformed slots but keeps the rest', () => {
    const out = parseLiveStatusRows(
      [{ last_known_status: 'offline', stream_slots: [null, { start_time: 'nope' }, slot()] }],
      NOW,
    );
    expect(out?.nextSlot?.category).toBe('Just Chatting');
  });

  it('returns null for a hidden/unknown streamer or a malformed body (caller keeps SSR state)', () => {
    expect(parseLiveStatusRows([], NOW)).toBeNull();
    expect(parseLiveStatusRows({ message: 'error' }, NOW)).toBeNull();
    expect(parseLiveStatusRows('garbage', NOW)).toBeNull();
    expect(parseLiveStatusRows([null], NOW)).toBeNull();
  });

  it('a streamer without slots is a valid state (live flag only)', () => {
    expect(parseLiveStatusRows([{ last_known_status: 'live' }], NOW)).toEqual({ isLive: true, nextSlot: null });
  });
});
