import type { IFetchStrategy, FetchOptions, FetchResult } from "./IFetchStrategy";

/**
 * Connector SDK — politeness policy as a composable decorator, not an inline
 * `sleep()` scattered per connector (the pattern ShoppingChinaConnector used
 * before Wave 5). Wraps any `IFetchStrategy` and enforces a minimum interval
 * between calls to `fetch()` — first call goes through immediately, every
 * call after waits out whatever's left of `minIntervalMs` since the last one
 * started. Sequential connectors (one `fetch()` at a time, this codebase's
 * only usage pattern today) get a real fixed request pace for free; nothing
 * here assumes or requires concurrency.
 */
export class RateLimitedFetchStrategy implements IFetchStrategy {
  private lastRequestAt = 0;

  constructor(
    private readonly inner: IFetchStrategy,
    private readonly minIntervalMs: number
  ) {}

  async fetch(url: string, options?: FetchOptions): Promise<FetchResult> {
    const elapsed = Date.now() - this.lastRequestAt;
    const waitMs = this.minIntervalMs - elapsed;
    if (waitMs > 0) await sleep(waitMs);

    this.lastRequestAt = Date.now();
    return this.inner.fetch(url, options);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
