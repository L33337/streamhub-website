import { describe, it, expect, vi } from 'vitest';

// client.ts pulls in `server-only`, which throws outside a React Server
// Component. Stub it so the module can be unit-tested in the node env.
vi.mock('server-only', () => ({}));

import { PartnerApiClient, isRetryableError } from '../client';
import {
  PartnerApiError,
  PartnerApiAuthError,
  PartnerApiNotFoundError,
  PartnerApiQuotaError,
  PartnerApiServerError,
  PartnerApiNetworkError,
} from '../errors';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

type Step = Response | (() => Response) | Error;

/**
 * Builds a fetch stub that returns/throws the given steps in order. A step that
 * is an Error is thrown (simulates a transport failure); a Response is returned.
 */
function sequenceFetch(...steps: Step[]) {
  let i = 0;
  const fn = vi.fn(async (_url: string, _init?: RequestInit) => {
    const step = steps[Math.min(i, steps.length - 1)];
    i++;
    if (step instanceof Error) throw step;
    return typeof step === 'function' ? step() : step;
  });
  return fn as unknown as typeof fetch & { mock: (typeof fn)['mock'] };
}

const instantSleep = vi.fn(async (_ms: number) => {});

function makeClient(fetchImpl: typeof fetch, sleep = instantSleep) {
  return new PartnerApiClient('http://api.local', 'stk_test_key', {
    fetchImpl,
    sleep,
  });
}

function connReset(): Error {
  return Object.assign(new TypeError('fetch failed'), {
    cause: Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' }),
  });
}

// ---------------------------------------------------------------------------
// isRetryableError — pure policy
// ---------------------------------------------------------------------------

describe('isRetryableError', () => {
  it('retries transient network errors (retryable flag true)', () => {
    expect(isRetryableError(new PartnerApiNetworkError('boom', undefined, true))).toBe(true);
  });

  it('does NOT retry a timeout / caller-abort network error (retryable flag false)', () => {
    expect(isRetryableError(new PartnerApiNetworkError('aborted', undefined, false))).toBe(false);
  });

  it.each([502, 503, 504])('retries %i server errors', (status) => {
    expect(isRetryableError(new PartnerApiServerError('x', status, 'http_x'))).toBe(true);
  });

  it('does NOT retry a plain 500', () => {
    expect(isRetryableError(new PartnerApiServerError('x', 500, 'internal_error'))).toBe(false);
  });

  it('does NOT retry 4xx (auth, not-found, quota, generic)', () => {
    expect(isRetryableError(new PartnerApiAuthError('x', 401, 'invalid_token'))).toBe(false);
    expect(isRetryableError(new PartnerApiNotFoundError('x', 404, 'not_found'))).toBe(false);
    expect(isRetryableError(new PartnerApiQuotaError('x', 429, 'rate_limited', undefined, 5))).toBe(
      false,
    );
    expect(isRetryableError(new PartnerApiError('x', 400, 'invalid_request'))).toBe(false);
  });

  it('does NOT retry an unknown error', () => {
    expect(isRetryableError(new Error('nope'))).toBe(false);
    expect(isRetryableError('nope')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Retry loop
// ---------------------------------------------------------------------------

describe('PartnerApiClient retry loop', () => {
  it('retries a transient 503 then succeeds', async () => {
    const fetchImpl = sequenceFetch(
      jsonResponse({ error: 'internal_error', error_description: 'temp' }, 503),
      jsonResponse({ id: 'abc', name: 'Streamer' }, 200),
    );
    const sleep = vi.fn(async () => {});
    const client = makeClient(fetchImpl, sleep);

    const result = await client.getStreamer('abc');

    expect(result).toEqual({ id: 'abc', name: 'Streamer' });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(300);
  });

  it('retries a transport failure (ECONNRESET) then succeeds', async () => {
    const fetchImpl = sequenceFetch(connReset(), jsonResponse({ id: 'x', name: 'S' }, 200));
    const client = makeClient(fetchImpl);

    const result = await client.getStreamer('x');

    expect(result).toEqual({ id: 'x', name: 'S' });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('gives up after MAX_ATTEMPTS on a persistent 502', async () => {
    const fetchImpl = sequenceFetch(
      jsonResponse({ error: 'bad_gateway' }, 502),
      jsonResponse({ error: 'bad_gateway' }, 502),
      jsonResponse({ error: 'bad_gateway' }, 502),
    );
    const client = makeClient(fetchImpl);

    // listStreamers does not swallow, so the error propagates.
    await expect(client.listStreamers({ limit: 1 })).rejects.toBeInstanceOf(PartnerApiServerError);
    expect(fetchImpl).toHaveBeenCalledTimes(2); // 1 original + 1 retry, then stop
  });

  it('does NOT retry a 401 (auth) — fails fast on the first attempt', async () => {
    const fetchImpl = sequenceFetch(
      jsonResponse({ error: 'invalid_token', error_description: 'Invalid API key' }, 401),
    );
    const client = makeClient(fetchImpl);

    await expect(client.listStreamers({ limit: 1 })).rejects.toBeInstanceOf(PartnerApiAuthError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry a 404, and getStreamer maps it to null', async () => {
    const fetchImpl = sequenceFetch(jsonResponse({ error: 'not_found' }, 404));
    const client = makeClient(fetchImpl);

    const result = await client.getStreamer('missing');

    expect(result).toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry our own timeout abort (retryable=false), and only calls fetch once', async () => {
    // fetch respects the abort signal and never resolves otherwise.
    const fetchImpl = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }));
          });
        }),
    ) as unknown as typeof fetch;
    const sleep = vi.fn(async () => {});
    const client = makeClient(fetchImpl, sleep);

    // 5ms internal timeout fires → controller aborts → network error, non-retryable.
    await expect(client.listStreamers({ limit: 1, timeoutMs: 5 })).rejects.toBeInstanceOf(
      PartnerApiNetworkError,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('does NOT retry when the caller-supplied signal is already aborted', async () => {
    const fetchImpl = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          if (init?.signal?.aborted) {
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
            return;
          }
          init?.signal?.addEventListener('abort', () => {
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
          });
        }),
    ) as unknown as typeof fetch;
    const sleep = vi.fn(async () => {});
    const client = makeClient(fetchImpl, sleep);

    const controller = new AbortController();
    controller.abort();

    await expect(
      client.listStreamers({ limit: 1, signal: controller.signal }),
    ).rejects.toBeInstanceOf(PartnerApiNetworkError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('succeeds on the first attempt without sleeping', async () => {
    const fetchImpl = sequenceFetch(jsonResponse({ id: 'a', name: 'A' }, 200));
    const sleep = vi.fn(async () => {});
    const client = makeClient(fetchImpl, sleep);

    await client.getStreamer('a');

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });
});
