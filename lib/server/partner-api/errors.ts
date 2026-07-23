export class PartnerApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'PartnerApiError';
  }
}

export class PartnerApiAuthError extends PartnerApiError {
  constructor(message: string, status: number, code: string, requestId?: string) {
    super(message, status, code, requestId);
    this.name = 'PartnerApiAuthError';
  }
}

export class PartnerApiNotFoundError extends PartnerApiError {
  constructor(message: string, status: number, code: string, requestId?: string) {
    super(message, status, code, requestId);
    this.name = 'PartnerApiNotFoundError';
  }
}

export class PartnerApiQuotaError extends PartnerApiError {
  constructor(
    message: string,
    status: number,
    code: string,
    requestId: string | undefined,
    public readonly retryAfterSeconds: number | null,
  ) {
    super(message, status, code, requestId);
    this.name = 'PartnerApiQuotaError';
  }
}

export class PartnerApiServerError extends PartnerApiError {
  constructor(message: string, status: number, code: string, requestId?: string) {
    super(message, status, code, requestId);
    this.name = 'PartnerApiServerError';
  }
}

export class PartnerApiNetworkError extends PartnerApiError {
  /**
   * Whether a retry could plausibly succeed. `true` for transient transport
   * failures (ECONNRESET, "fetch failed", DNS blips). `false` when the failure
   * was our own request timeout firing or a caller-supplied AbortSignal — those
   * mean "we gave up / the caller cancelled", so retrying only doubles latency
   * (or re-cancels) without changing the outcome.
   */
  readonly retryable: boolean;

  constructor(message: string, cause?: unknown, retryable = true) {
    super(message, 0, 'network_error');
    this.name = 'PartnerApiNetworkError';
    this.retryable = retryable;
    if (cause !== undefined) {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}
