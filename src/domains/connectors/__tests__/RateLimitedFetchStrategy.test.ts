import { RateLimitedFetchStrategy } from "../sdk/fetch/RateLimitedFetchStrategy";
import type { IFetchStrategy, FetchResult } from "../sdk/fetch/IFetchStrategy";

function makeInner(): IFetchStrategy {
  const result: FetchResult = { url: "https://x.com", html: "<html></html>", status: 200, ok: true };
  return { fetch: jest.fn().mockResolvedValue(result) };
}

describe("RateLimitedFetchStrategy", () => {
  it("does not delay the first call", async () => {
    const inner = makeInner();
    const limiter = new RateLimitedFetchStrategy(inner, 200);

    const start = Date.now();
    await limiter.fetch("https://x.com/a");
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(100);
    expect(inner.fetch).toHaveBeenCalledTimes(1);
  });

  it("delays a second call to respect the minimum interval", async () => {
    const inner = makeInner();
    const limiter = new RateLimitedFetchStrategy(inner, 200);

    await limiter.fetch("https://x.com/a");
    const start = Date.now();
    await limiter.fetch("https://x.com/b");
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(180); // small tolerance below 200ms
    expect(inner.fetch).toHaveBeenCalledTimes(2);
  });

  it("does not delay when enough time already passed between calls", async () => {
    const inner = makeInner();
    const limiter = new RateLimitedFetchStrategy(inner, 50);

    await limiter.fetch("https://x.com/a");
    await new Promise((r) => setTimeout(r, 80));

    const start = Date.now();
    await limiter.fetch("https://x.com/b");
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(40);
  });

  it("forwards the url and options to the inner strategy", async () => {
    const inner = makeInner();
    const limiter = new RateLimitedFetchStrategy(inner, 0);

    await limiter.fetch("https://x.com/a", { timeoutMs: 5000 });
    expect(inner.fetch).toHaveBeenCalledWith("https://x.com/a", { timeoutMs: 5000 });
  });
});
