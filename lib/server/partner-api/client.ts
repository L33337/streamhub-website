import 'server-only';

import {
  PartnerApiAuthError,
  PartnerApiError,
  PartnerApiNetworkError,
  PartnerApiNotFoundError,
  PartnerApiQuotaError,
  PartnerApiServerError,
} from './errors';
import type {
  BestGameEntry,
  Paginated,
  PartnerApiErrorBody,
  Platform,
  PublicGame,
  PublicRecapArticle,
  PublicStreamer,
  PublicStreamerRankings,
  PublicStreamerStats,
  PublicStreamHistory,
  PublicStreamSlot,
  PublicStreamerWiki,
  RankingMetric,
  RankingsResponse,
  RecapKind,
  RecapsListResponse,
  StreamerInsights,
} from './types';
import { SUPABASE_FUNCTIONS_REGION, SUPABASE_REGION_HEADER } from '@/lib/supabase/region';

const USER_AGENT = 'streamertimes-web/1.0';
/**
 * 15 s → 10 s on 2026-08-29: production p95 per endpoint sits at 0.8–1.4 s
 * (sitemap pages 1–3 s), so 10 s still leaves a wide margin while a real
 * outage stalls a regeneration for at most 2 × 10 s + backoff instead of 30 s.
 */
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_REVALIDATE_SECONDS = 300;

/**
 * Total attempts per request (1 original + retries). All partner-API calls in
 * this client are idempotent GETs, so a retry is always safe. One retry is
 * enough to absorb the fast transient failures we actually see in production
 * (gateway 502 on a cold worker, a transient 503 from a saturated DB pooler, an
 * ECONNRESET) without meaningfully inflating tail latency on a real outage.
 */
const MAX_ATTEMPTS = 2;
/** Linear backoff between attempts (attempt n waits n * this). Small on purpose — the retry is SSR-blocking. */
const RETRY_BACKOFF_MS = 300;
/** 5xx statuses worth a retry. 500 is excluded: it usually signals a deterministic server bug, not a blip. */
const RETRYABLE_STATUS = new Set([502, 503, 504]);

/**
 * Whether an error thrown by {@link PartnerApiClient.request} is worth retrying.
 * Pure + exported so the policy is unit-testable in isolation.
 *
 * Retryable: transient transport failures (network error, but NOT a timeout /
 * caller-abort) and 502/503/504. NOT retryable: 4xx (auth, not-found, quota),
 * plain 500, and timeouts — retrying those either can't help or just doubles the
 * wait.
 */
export function isRetryableError(err: unknown): boolean {
  if (err instanceof PartnerApiNetworkError) return err.retryable;
  if (err instanceof PartnerApiServerError) return RETRYABLE_STATUS.has(err.status);
  return false;
}

/** Injectable deps — real code uses the defaults; tests pass fakes for determinism. */
export interface PartnerApiClientDeps {
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export interface FetchOptions {
  /** Next.js ISR cache duration in seconds. `false` disables caching (`no-store`). */
  revalidate?: number | false;
  signal?: AbortSignal;
  timeoutMs?: number;
}

/** Result of a single-slot lookup — see `getSchedule`. */
export interface ScheduleLookup {
  slot: PublicStreamSlot | null;
  /** Set only when the slot existed and expired; drives the graceful redirect. */
  expiredStreamerId: string | null;
}

export interface ListStreamersOptions extends FetchOptions {
  platform?: Platform[];
  language?: string;
  isAlwaysOn?: boolean;
  search?: string;
  /**
   * Exact category/game name (e.g. "Just Chatting"). When set, the list is
   * restricted to streamers active in that category (same 28-day/live-upcoming
   * window as /v1/games). Pairs with `order: 'followers'` for a per-game
   * "most followed" ranking.
   */
  category?: string;
  order?: 'name' | 'popular' | 'followers';
  cursor?: string;
  limit?: number;
  /**
   * Opt-in offset for numbered-page UIs (e.g. /streamers). When set, the API
   * uses range()-based pagination and returns an exact `pagination.total`; the
   * cursor is ignored. Omit for the default cursor pagination.
   */
  offset?: number;
}

export interface ListSchedulesOptions extends FetchOptions {
  streamerIds?: string[];
  from?: string;
  to?: string;
  platforms?: Platform[];
  includePredictions?: boolean;
  includeAlwaysOn?: boolean;
  minConfidence?: 'low' | 'medium' | 'high';
  status?: ('live' | 'upcoming' | 'offline')[];
  /** Exact-match category filter (e.g. "League of Legends"). */
  category?: string;
  cursor?: string;
  limit?: number;
}

export interface ListGamesOptions extends FetchOptions {
  limit?: number;
  /** Exact-match category filter — narrows the list to that single row. */
  category?: string;
  /**
   * Opt-in enrichments, comma-separable: 'hour_histogram' adds the
   * weekday-hour heatmap data, 'timing' (M24) the viewer-demand vs
   * competition stats.
   */
  include?: 'hour_histogram' | 'timing' | 'hour_histogram,timing' | 'timing,hour_histogram';
}

export interface ListHistoryOptions extends FetchOptions {
  cursor?: string;
  limit?: number;
}

export interface ListRecapsOptions extends FetchOptions {
  kind?: RecapKind;
  /** Requested content language (ISO 639-1); the API falls back to English
   *  per-article and reports what it served via `language`. */
  lang?: string;
  limit?: number;
}

class PartnerApiClient {
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    deps: PartnerApiClientDeps = {},
  ) {
    this.fetchImpl = deps.fetchImpl ?? fetch;
    this.sleep = deps.sleep ?? defaultSleep;
  }

  async listStreamers(opts: ListStreamersOptions = {}): Promise<Paginated<PublicStreamer>> {
    const params = new URLSearchParams();
    opts.platform?.forEach((p) => params.append('platform', p));
    if (opts.language) params.set('language', opts.language);
    if (opts.isAlwaysOn !== undefined) params.set('is_always_on', String(opts.isAlwaysOn));
    if (opts.search) params.set('search', opts.search);
    if (opts.category) params.set('category', opts.category);
    if (opts.order) params.set('order', opts.order);
    if (opts.cursor) params.set('cursor', opts.cursor);
    if (opts.limit !== undefined) params.set('limit', String(opts.limit));
    if (opts.offset !== undefined) params.set('offset', String(opts.offset));
    return this.request<Paginated<PublicStreamer>>('GET', `/v1/streamers?${params}`, opts);
  }

  /** Categories that qualify for a hub page (>= 3 active streamers), most popular first. */
  async listGames(opts: ListGamesOptions = {}): Promise<Paginated<PublicGame>> {
    const params = new URLSearchParams();
    if (opts.limit !== undefined) params.set('limit', String(opts.limit));
    if (opts.category) params.set('category', opts.category);
    if (opts.include) params.set('include', opts.include);
    const qs = params.toString();
    return this.request<Paginated<PublicGame>>('GET', `/v1/games${qs ? `?${qs}` : ''}`, opts);
  }

  /**
   * Opportunity ranking of all categories with >= 5 tracked streamers
   * (M24, GET /v1/games/best-to-stream — already sorted by overall_score
   * desc). NOT best-effort: the /best-games-to-stream page must catch and
   * degrade to its warming state itself (never throw during prerender).
   * Nightly aggregate → 1h data-cache revalidate by default.
   */
  async listBestGamesToStream(opts: FetchOptions = {}): Promise<{ data: BestGameEntry[] }> {
    return this.request<{ data: BestGameEntry[] }>('GET', '/v1/games/best-to-stream', {
      revalidate: 3600,
      ...opts,
    });
  }

  /**
   * Viewer-timing insights for one streamer (M24). Best-effort: any
   * API/network error collapses to null so a failing lookup never breaks the
   * page (mirrors `getStreamerStats`). A `sample_count: 0` response is
   * returned as-is — the collecting state is the page's business.
   * Nightly aggregate → 1h revalidate.
   */
  async getStreamerInsights(
    id: string,
    opts: FetchOptions = {},
  ): Promise<StreamerInsights | null> {
    try {
      return await this.request<StreamerInsights>(
        'GET',
        `/v1/streamers/${encodeURIComponent(id)}/insights`,
        { revalidate: 3600, ...opts },
      );
    } catch {
      return null;
    }
  }

  /**
   * AI-researched wiki profile for one streamer (M26). Best-effort: 404 (no
   * published profile — the common case) and any API/network error collapse
   * to null so callers can gate rendering on the result. Profiles change only
   * on regeneration → 1h revalidate.
   */
  async getStreamerWiki(
    id: string,
    opts: FetchOptions = {},
  ): Promise<PublicStreamerWiki | null> {
    try {
      return await this.request<PublicStreamerWiki>(
        'GET',
        `/v1/streamers/${encodeURIComponent(id)}/wiki`,
        { revalidate: 3600, ...opts },
      );
    } catch {
      return null;
    }
  }

  async getStreamer(id: string, opts: FetchOptions = {}): Promise<PublicStreamer | null> {
    try {
      return await this.request<PublicStreamer>(
        'GET',
        `/v1/streamers/${encodeURIComponent(id)}`,
        opts,
      );
    } catch (err) {
      if (err instanceof PartnerApiNotFoundError) return null;
      throw err;
    }
  }

  /**
   * Single slot lookup. A miss is not just "null": an EXPIRED slot names its
   * streamer, which is what lets the page 308 somewhere useful instead of
   * rendering a dead end. Unknown/hidden ids yield `expiredStreamerId: null`.
   */
  async getSchedule(id: string, opts: FetchOptions = {}): Promise<ScheduleLookup> {
    try {
      const slot = await this.request<PublicStreamSlot>(
        'GET',
        `/v1/schedules/${encodeURIComponent(id)}`,
        opts,
      );
      return { slot, expiredStreamerId: null };
    } catch (err) {
      if (err instanceof PartnerApiNotFoundError) {
        return { slot: null, expiredStreamerId: err.expiredStreamerId };
      }
      throw err;
    }
  }

  /**
   * Paginated broadcast history for a streamer (most recent finished streams
   * first). The Partner API already excludes synthetic always-on/live-slot
   * fragments, so every item is a real finished stream.
   */
  async getStreamerHistory(
    id: string,
    opts: ListHistoryOptions = {},
  ): Promise<Paginated<PublicStreamHistory>> {
    const params = new URLSearchParams();
    if (opts.cursor) params.set('cursor', opts.cursor);
    if (opts.limit !== undefined) params.set('limit', String(opts.limit));
    const qs = params.toString();
    return this.request<Paginated<PublicStreamHistory>>(
      'GET',
      `/v1/streamers/${encodeURIComponent(id)}/history${qs ? `?${qs}` : ''}`,
      opts,
    );
  }

  /**
   * Convenience wrapper returning a streamer's single most recent finished
   * stream, or null when there is none. Best-effort: any API/network error is
   * swallowed to null so a failing history lookup never breaks the page that
   * renders it (mirrors `getStreamer`'s null-tolerance on 404).
   */
  async getLastStream(
    id: string,
    opts: FetchOptions = {},
  ): Promise<PublicStreamHistory | null> {
    try {
      const page = await this.getStreamerHistory(id, { ...opts, limit: 1 });
      return page.data[0] ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Typical-streaming-times stats for a streamer (per-weekday medians, streams
   * per week, top categories). Best-effort: any API/network error AND the
   * server's `has_stats: false` case both collapse to null, so a failing or
   * empty stats lookup never breaks the page that renders it (mirrors
   * `getLastStream`). Stats move daily at most, so the fetch defaults to a
   * 1-hour data-cache revalidate independent of the page-level ISR window.
   */
  async getStreamerStats(
    id: string,
    opts: FetchOptions = {},
  ): Promise<PublicStreamerStats | null> {
    try {
      const stats = await this.request<PublicStreamerStats>(
        'GET',
        `/v1/streamers/${encodeURIComponent(id)}/stats`,
        { revalidate: 3600, ...opts },
      );
      return stats.has_stats ? stats : null;
    } catch {
      return null;
    }
  }

  /**
   * One page of a ranking leaderboard (max 100 entries; pass `offset` for
   * deeper pages). `rank` is absolute, so page 2 starts at 101, and
   * `pagination.total` gives the exact pool size the page count derives from.
   * The underlying aggregates move nightly, so the fetch defaults to a 1-hour
   * data-cache revalidate (same reasoning as `getStreamerStats`).
   * NOT best-effort — callers on prerendered routes must catch (never throw
   * during prerender) so they can degrade to an empty list AND noindex the
   * thin page.
   */
  async getRankings(
    metric: RankingMetric,
    opts: FetchOptions & { limit?: number; offset?: number } = {},
  ): Promise<RankingsResponse> {
    const params = new URLSearchParams();
    if (opts.limit !== undefined) params.set('limit', String(opts.limit));
    if (opts.offset) params.set('offset', String(opts.offset));
    const qs = params.toString();
    return this.request<RankingsResponse>(
      'GET',
      `/v1/rankings/${metric}${qs ? `?${qs}` : ''}`,
      { revalidate: 3600, ...opts },
    );
  }

  /**
   * Every ranking placement of one streamer (global metrics + game categories),
   * for the "Rankings" block on the streamer detail page. Best-effort: any
   * error collapses to null so a failing rank lookup never breaks the page
   * (mirrors `getStreamerStats`). Ranks move nightly → 1-hour revalidate.
   */
  async getStreamerRankings(
    id: string,
    opts: FetchOptions = {},
  ): Promise<PublicStreamerRankings | null> {
    try {
      return await this.request<PublicStreamerRankings>(
        'GET',
        `/v1/streamers/${encodeURIComponent(id)}/rankings`,
        { revalidate: 3600, ...opts },
      );
    } catch {
      return null;
    }
  }

  /**
   * Published recap articles, newest first (list items: title/teaser/hero —
   * no sections). Weekly editions publish Monday mornings, monthly on the
   * 1st; translations trickle in via a daily drip, so the fetch defaults to a
   * 15-min data-cache revalidate. NOT best-effort — callers on prerendered
   * routes must catch and degrade (hub falls back to its static intro).
   */
  async listRecaps(opts: ListRecapsOptions = {}): Promise<RecapsListResponse> {
    const params = new URLSearchParams();
    if (opts.kind) params.set('kind', opts.kind);
    if (opts.lang) params.set('lang', opts.lang);
    if (opts.limit !== undefined) params.set('limit', String(opts.limit));
    const qs = params.toString();
    return this.request<RecapsListResponse>('GET', `/v1/recaps${qs ? `?${qs}` : ''}`, {
      revalidate: 900,
      ...opts,
    });
  }

  /**
   * One full recap article incl. sections + the streamer lookup for its
   * [[streamer:id]] markers. Null on 404 (unknown slug / not published) so
   * the route can notFound() cleanly; other errors propagate for the caller's
   * degrade path.
   */
  async getRecap(
    slug: string,
    opts: FetchOptions & { lang?: string } = {},
  ): Promise<PublicRecapArticle | null> {
    const params = new URLSearchParams();
    if (opts.lang) params.set('lang', opts.lang);
    const qs = params.toString();
    try {
      return await this.request<PublicRecapArticle>(
        'GET',
        `/v1/recaps/${encodeURIComponent(slug)}${qs ? `?${qs}` : ''}`,
        { revalidate: 900, ...opts },
      );
    } catch (err) {
      if (err instanceof PartnerApiNotFoundError) return null;
      throw err;
    }
  }

  async listSchedules(opts: ListSchedulesOptions = {}): Promise<Paginated<PublicStreamSlot>> {
    const params = new URLSearchParams();
    opts.streamerIds?.forEach((id) => params.append('streamer_id', id));
    opts.platforms?.forEach((p) => params.append('platform', p));
    opts.status?.forEach((s) => params.append('status', s));
    if (opts.from) params.set('from', opts.from);
    if (opts.to) params.set('to', opts.to);
    if (opts.includePredictions !== undefined) {
      params.set('include_predictions', String(opts.includePredictions));
    }
    if (opts.includeAlwaysOn !== undefined) {
      params.set('include_always_on', String(opts.includeAlwaysOn));
    }
    if (opts.minConfidence) params.set('min_confidence', opts.minConfidence);
    if (opts.category) params.set('category', opts.category);
    if (opts.cursor) params.set('cursor', opts.cursor);
    if (opts.limit !== undefined) params.set('limit', String(opts.limit));
    return this.request<Paginated<PublicStreamSlot>>('GET', `/v1/schedules?${params}`, opts);
  }

  /**
   * Retry wrapper around {@link attempt}. Retries only transient failures (see
   * {@link isRetryableError}), up to {@link MAX_ATTEMPTS} total, with a short
   * linear backoff. A caller-aborted signal short-circuits the loop so a
   * cancelled request is never retried.
   */
  private async request<T>(method: string, path: string, opts: FetchOptions): Promise<T> {
    let lastErr: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return await this.attempt<T>(method, path, opts);
      } catch (err) {
        lastErr = err;
        const isLastAttempt = attempt >= MAX_ATTEMPTS;
        const callerAborted = opts.signal?.aborted ?? false;
        if (isLastAttempt || callerAborted || !isRetryableError(err)) {
          throw err;
        }
        await this.sleep(RETRY_BACKOFF_MS * attempt);
      }
    }
    // Unreachable (the loop either returns or throws), but keeps TS happy.
    throw lastErr;
  }

  private async attempt<T>(method: string, path: string, opts: FetchOptions): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    const noCache = opts.revalidate === false;

    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'User-Agent': USER_AGENT,
          Accept: 'application/json',
          // Run the Edge Function next to the database (see lib/supabase/region.ts).
          [SUPABASE_REGION_HEADER]: SUPABASE_FUNCTIONS_REGION,
        },
        signal: opts.signal ?? controller.signal,
        ...(noCache
          ? { cache: 'no-store' as const }
          : { next: { revalidate: opts.revalidate ?? DEFAULT_REVALIDATE_SECONDS } }),
      });
    } catch (err) {
      // Distinguish a transient transport failure (retryable) from our own
      // timeout firing or a caller cancelling (both non-retryable): retrying a
      // request that already ran the full timeout would only double the wait.
      const callerAborted = opts.signal?.aborted ?? false;
      const retryable = !timedOut && !callerAborted;
      const message = err instanceof Error ? `Network error: ${err.message}` : 'Network error';
      throw new PartnerApiNetworkError(message, err, retryable);
    } finally {
      clearTimeout(timeout);
    }

    const text = await res.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        // Non-JSON response — leave body as null and fall through to status-based handling.
      }
    }

    if (!res.ok) {
      const errBody = (body ?? {}) as Partial<PartnerApiErrorBody>;
      const code = errBody.error ?? `http_${res.status}`;
      const message =
        errBody.error_description ??
        `Partner API ${method} ${path} failed with status ${res.status}`;
      const requestId = errBody.request_id ?? res.headers.get('x-request-id') ?? undefined;

      if (res.status === 401 || res.status === 403) {
        throw new PartnerApiAuthError(message, res.status, code, requestId);
      }
      if (res.status === 404) {
        const expired = (errBody as { expired_streamer_id?: unknown }).expired_streamer_id;
        throw new PartnerApiNotFoundError(
          message,
          res.status,
          code,
          requestId,
          typeof expired === 'string' && expired.length > 0 ? expired : null,
        );
      }
      if (res.status === 429) {
        const retryAfterRaw = res.headers.get('retry-after');
        const parsed = retryAfterRaw === null ? NaN : parseInt(retryAfterRaw, 10);
        const retryAfterSeconds = Number.isFinite(parsed) ? parsed : null;
        throw new PartnerApiQuotaError(message, res.status, code, requestId, retryAfterSeconds);
      }
      if (res.status >= 500) {
        throw new PartnerApiServerError(message, res.status, code, requestId);
      }
      throw new PartnerApiError(message, res.status, code, requestId);
    }

    return body as T;
  }
}

let _singleton: PartnerApiClient | null = null;

/**
 * Lazy singleton accessor for the Partner API client.
 *
 * Throws if `PARTNER_API_KEY` or `PARTNER_API_BASE_URL` is unset, so that
 * misconfiguration shows up at first call rather than module-load time
 * (which would break tooling like `next build` and CI).
 */
export function getPartnerApi(): PartnerApiClient {
  if (_singleton) return _singleton;
  const rawBase = process.env.PARTNER_API_BASE_URL;
  const apiKey = process.env.PARTNER_API_KEY;
  if (!rawBase) {
    throw new Error('PARTNER_API_BASE_URL is not set');
  }
  if (!apiKey) {
    throw new Error('PARTNER_API_KEY is not set');
  }
  const baseUrl = rawBase.replace(/\/+$/, '');
  _singleton = new PartnerApiClient(baseUrl, apiKey);
  return _singleton;
}

// Exported as a value (not type-only) so unit tests can construct a client with
// injected fetch/sleep deps. The barrel re-exports it as a type for consumers.
export { PartnerApiClient };
