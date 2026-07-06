// JSON HTTP client with timeout + retry/backoff. This codebase's existing
// HttpFetchStrategy (src/domains/connectors/sdk/fetch/) has a timeout
// but no retry logic, and is HTML-shaped (returns { html: string }) rather
// than JSON — not reusable as-is for a rate-provider API client, so this is
// a new, small, purpose-built client rather than a fork of that one.

export interface JsonFetchOptions {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
}

export interface JsonFetchResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 500;

export async function fetchJson<T>(url: string, options: JsonFetchOptions = {}): Promise<JsonFetchResult<T>> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, retries = DEFAULT_RETRIES, retryDelayMs = DEFAULT_RETRY_DELAY_MS } = options;

  let lastError: string | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });

      if (!response.ok) {
        lastError = `HTTP ${response.status}`;
        if (!isRetryable(response.status) || attempt === retries) {
          return { ok: false, status: response.status, data: null, error: lastError };
        }
      } else {
        const data = (await response.json()) as T;
        return { ok: true, status: response.status, data };
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt === retries) {
        return { ok: false, status: 0, data: null, error: lastError };
      }
    }

    await sleep(retryDelayMs * (attempt + 1)); // linear backoff
  }

  return { ok: false, status: 0, data: null, error: lastError ?? "unknown_error" };
}

function isRetryable(status: number): boolean {
  return status >= 500 || status === 429;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
