export interface FetchOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
  userAgent?: string;
  /** Retries on 5xx/429/network error, linear backoff — same policy as
   * exchange's fetchJson. Defaults live in the implementation. */
  retries?: number;
  retryDelayMs?: number;
}

export interface FetchResult {
  url: string;
  html: string;
  status: number;
  ok: boolean;
  error?: string;
}

export interface IFetchStrategy {
  fetch(url: string, options?: FetchOptions): Promise<FetchResult>;
}
