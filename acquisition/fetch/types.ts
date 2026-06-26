export interface FetchOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
  userAgent?: string;
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
