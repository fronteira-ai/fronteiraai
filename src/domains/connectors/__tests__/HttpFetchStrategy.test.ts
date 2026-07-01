import { HttpFetchStrategy } from "../crawler/fetch/HttpFetchStrategy";

describe("HttpFetchStrategy", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns ok:false with the HTTP status when the response is not ok", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404, text: async () => "" }) as unknown as typeof fetch;
    const strategy = new HttpFetchStrategy();
    const result = await strategy.fetch("https://example.com/missing");
    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
    expect(result.error).toBe("HTTP 404");
  });

  it("returns the HTML body when the response is ok", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => "<html></html>" }) as unknown as typeof fetch;
    const strategy = new HttpFetchStrategy();
    const result = await strategy.fetch("https://example.com/ok");
    expect(result.ok).toBe(true);
    expect(result.html).toBe("<html></html>");
  });

  it("returns ok:false with the error message on a network failure", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;
    const strategy = new HttpFetchStrategy();
    const result = await strategy.fetch("https://example.com/fail");
    expect(result.ok).toBe(false);
    expect(result.status).toBe(0);
    expect(result.error).toBe("network down");
  });
});
