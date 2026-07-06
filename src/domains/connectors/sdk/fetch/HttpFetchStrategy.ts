import type { IFetchStrategy, FetchOptions, FetchResult } from "./IFetchStrategy";

// Connector SDK — User-Agent policy centralized here (Wave 5, Connector
// Platform V2): every sitemap/HTML-driven connector identifies itself the
// same honest way, rather than each connector picking its own string.
const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 500;

function isRetryableStatus(status: number): boolean {
  return status >= 500 || status === 429;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Retry/backoff added Release 1.8 — Program A — Wave 4, same linear-backoff
// policy already used by exchange/infrastructure/ExchangeRateApiHttpClient.ts's
// fetchJson. Relocated into sdk/ in Wave 5 (Connector Platform V2) — this is
// the one HTTP client every HTML/sitemap-driven connector shares.
export class HttpFetchStrategy implements IFetchStrategy {
  async fetch(url: string, options: FetchOptions = {}): Promise<FetchResult> {
    const {
      timeoutMs = 15_000,
      userAgent = DEFAULT_UA,
      headers = {},
      retries = DEFAULT_RETRIES,
      retryDelayMs = DEFAULT_RETRY_DELAY_MS,
    } = options;

    let lastError: string | undefined;
    let lastStatus = 0;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent": userAgent,
            Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
            "Accept-Language": "es-PY,es;q=0.9,en;q=0.8",
            "Cache-Control": "no-cache",
            ...headers,
          },
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (!response.ok) {
          lastError = `HTTP ${response.status}`;
          lastStatus = response.status;
          if (!isRetryableStatus(response.status) || attempt === retries) {
            return { url, html: "", status: response.status, ok: false, error: lastError };
          }
        } else {
          const html = await response.text();
          return { url, html, status: response.status, ok: true };
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        lastStatus = 0;
        if (attempt === retries) {
          return { url, html: "", status: 0, ok: false, error: lastError };
        }
      }

      await sleep(retryDelayMs * (attempt + 1));
    }

    return { url, html: "", status: lastStatus, ok: false, error: lastError ?? "unknown_error" };
  }
}
