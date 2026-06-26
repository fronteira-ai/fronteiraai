import type { IFetchStrategy, FetchOptions, FetchResult } from "./types";

const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export class HttpFetchStrategy implements IFetchStrategy {
  async fetch(url: string, options: FetchOptions = {}): Promise<FetchResult> {
    const { timeoutMs = 15_000, userAgent = DEFAULT_UA, headers = {} } = options;

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
        return { url, html: "", status: response.status, ok: false, error: `HTTP ${response.status}` };
      }

      const html = await response.text();
      return { url, html, status: response.status, ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { url, html: "", status: 0, ok: false, error: message };
    }
  }
}
