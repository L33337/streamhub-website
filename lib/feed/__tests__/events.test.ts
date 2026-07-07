import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  configureFeedEvents,
  logFeedEvent,
  flushFeedEvents,
  setFeedEventsEnabled,
  __resetFeedEventsForTests,
  __getQueueLengthForTests,
} from '../events';
import { EVENTS_MAX_QUEUE, EVENTS_FLUSH_INTERVAL_MS } from '../constants';

function makeFetch(impl?: () => Promise<Response>) {
  return vi.fn<typeof fetch>(impl ?? (() => Promise.resolve(new Response(null, { status: 201 }))));
}

function configure(overrides: Partial<Parameters<typeof configureFeedEvents>[0] & object> = {}) {
  const fetchFn = makeFetch();
  configureFeedEvents({
    userId: 'user-1',
    enabled: true,
    supabaseUrl: 'http://sb.local',
    anonKey: 'anon-key',
    getAccessToken: () => 'token-1',
    fetchFn,
    ...overrides,
  });
  return fetchFn;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  __resetFeedEventsForTests();
  vi.useRealTimers();
});

describe('feed events queue', () => {
  it('no-ops when not configured', () => {
    logFeedEvent({ event: 'tap', itemType: 'live' });
    expect(__getQueueLengthForTests()).toBe(0);
  });

  it('no-ops when analytics is disabled', () => {
    configure({ enabled: false });
    logFeedEvent({ event: 'tap', itemType: 'live' });
    expect(__getQueueLengthForTests()).toBe(0);
  });

  it('flushes immediately when the queue reaches 50', async () => {
    const fetchFn = configure();
    for (let i = 0; i < EVENTS_MAX_QUEUE; i++) {
      logFeedEvent({ event: 'impression', itemType: 'discover', streamerId: `s-${i}` });
    }
    await vi.waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(1));
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('http://sb.local/rest/v1/feed_events');
    const rows = JSON.parse((init as RequestInit).body as string);
    expect(rows).toHaveLength(50);
    expect(__getQueueLengthForTests()).toBe(0);
  });

  it('sends the correct row shape with null-filled optionals and auth headers', async () => {
    const fetchFn = configure();
    logFeedEvent({ event: 'tap', itemType: 'chip', itemId: 'FPS', category: 'FPS' });
    await flushFeedEvents();
    const [, init] = fetchFn.mock.calls[0];
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers.apikey).toBe('anon-key');
    expect(headers.Authorization).toBe('Bearer token-1');
    expect(headers.Prefer).toBe('return=minimal');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual([
      {
        user_id: 'user-1',
        event: 'tap',
        item_type: 'chip',
        item_id: 'FPS',
        streamer_id: null,
        category: 'FPS',
      },
    ]);
  });

  it('flushes on the 30s interval', async () => {
    const fetchFn = configure();
    logFeedEvent({ event: 'tap', itemType: 'live' });
    expect(fetchFn).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(EVENTS_FLUSH_INTERVAL_MS);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('drops the batch when the flush fails, later events still send', async () => {
    const fetchFn = makeFetch(() => Promise.reject(new Error('network down')));
    configure({ fetchFn });
    logFeedEvent({ event: 'tap', itemType: 'live' });
    await flushFeedEvents();
    expect(__getQueueLengthForTests()).toBe(0);

    logFeedEvent({ event: 'tap', itemType: 'upcoming' });
    await flushFeedEvents();
    expect(fetchFn).toHaveBeenCalledTimes(2);
    const rows = JSON.parse((fetchFn.mock.calls[1][1] as RequestInit).body as string);
    expect(rows).toHaveLength(1); // failed batch was NOT retried
    expect(rows[0].item_type).toBe('upcoming');
  });

  it('drops the batch when no access token is available', async () => {
    const fetchFn = makeFetch();
    configure({ fetchFn, getAccessToken: () => null });
    logFeedEvent({ event: 'tap', itemType: 'live' });
    await flushFeedEvents();
    expect(fetchFn).not.toHaveBeenCalled();
    expect(__getQueueLengthForTests()).toBe(0);
  });

  it('disabling clears the queue', () => {
    configure();
    logFeedEvent({ event: 'tap', itemType: 'live' });
    expect(__getQueueLengthForTests()).toBe(1);
    setFeedEventsEnabled(false);
    expect(__getQueueLengthForTests()).toBe(0);
    logFeedEvent({ event: 'tap', itemType: 'live' });
    expect(__getQueueLengthForTests()).toBe(0);
  });

  it('re-enabling resumes logging', () => {
    configure();
    setFeedEventsEnabled(false);
    setFeedEventsEnabled(true);
    logFeedEvent({ event: 'tap', itemType: 'live' });
    expect(__getQueueLengthForTests()).toBe(1);
  });

  it('a user change clears the queue', () => {
    const fetchFn = configure();
    logFeedEvent({ event: 'tap', itemType: 'live' });
    configure({ userId: 'user-2', fetchFn });
    expect(__getQueueLengthForTests()).toBe(0);
  });

  it('sign-out (null config) clears the queue', () => {
    configure();
    logFeedEvent({ event: 'tap', itemType: 'live' });
    configureFeedEvents(null);
    expect(__getQueueLengthForTests()).toBe(0);
  });

  it('passes keepalive for leave flushes', async () => {
    const fetchFn = configure();
    logFeedEvent({ event: 'tap', itemType: 'live' });
    await flushFeedEvents(true);
    expect((fetchFn.mock.calls[0][1] as RequestInit).keepalive).toBe(true);
  });
});
