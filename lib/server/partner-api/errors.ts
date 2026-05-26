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
  constructor(message: string, cause?: unknown) {
    super(message, 0, 'network_error');
    this.name = 'PartnerApiNetworkError';
    if (cause !== undefined) {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}
