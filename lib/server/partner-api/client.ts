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
  Paginated,
  PartnerApiErrorBody,
  Platform,
  PublicGame,
  PublicStreamer,
  PublicStreamerStats,
  PublicStreamHistory,
  PublicStreamSlot,
  RankingMetric,
  RankingsResponse,
} from './types';

const USER_AGENT = 'streamertimes-web/1.0';
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_REVALIDATE_SECONDS = 300;

export interface FetchOptions {
  /** Next.js ISR cache duration in seconds. `false` disables caching (`no-store`). */
  revalidate?: number | false;
  signal?: AbortSignal;
  timeoutMs?: number;
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
}

export interface ListHistoryOptions extends FetchOptions {
  cursor?: string;
  limit?: number;
}

class PartnerApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

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
    const qs = params.toString();
    return this.request<Paginated<PublicGame>>('GET', `/v1/games${qs ? `?${qs}` : ''}`, opts);
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

  async getSchedule(id: string, opts: FetchOptions = {}): Promise<PublicStreamSlot | null> {
    try {
      return await this.request<PublicStreamSlot>(
        'GET',
        `/v1/schedules/${encodeURIComponent(id)}`,
        opts,
      );
    } catch (err) {
      if (err instanceof PartnerApiNotFoundError) return null;
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
   * Bounded leaderboard (max 100 entries, no pagination) for one ranking
   * metric. The underlying aggregates move nightly, so the fetch defaults to a
   * 1-hour data-cache revalidate (same reasoning as `getStreamerStats`).
   * NOT best-effort — callers on prerendered routes must catch (never throw
   * during prerender) so they can degrade to an empty list AND noindex the
   * thin page.
   */
  async getRankings(
    metric: RankingMetric,
    opts: FetchOptions & { limit?: number } = {},
  ): Promise<RankingsResponse> {
    const params = new URLSearchParams();
    if (opts.limit !== undefined) params.set('limit', String(opts.limit));
    const qs = params.toString();
    return this.request<RankingsResponse>(
      'GET',
      `/v1/rankings/${metric}${qs ? `?${qs}` : ''}`,
      { revalidate: 3600, ...opts },
    );
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

  private async request<T>(method: string, path: string, opts: FetchOptions): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    const noCache = opts.revalidate === false;

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'User-Agent': USER_AGENT,
          Accept: 'application/json',
        },
        signal: opts.signal ?? controller.signal,
        ...(noCache
          ? { cache: 'no-store' as const }
          : { next: { revalidate: opts.revalidate ?? DEFAULT_REVALIDATE_SECONDS } }),
      });
    } catch (err) {
      const message = err instanceof Error ? `Network error: ${err.message}` : 'Network error';
      throw new PartnerApiNetworkError(message, err);
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
        throw new PartnerApiNotFoundError(message, res.status, code, requestId);
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

export type { PartnerApiClient };
