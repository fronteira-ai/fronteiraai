import { NextRequest } from "next/server";
import { requireCronSecret } from "../cron-auth";

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/cron/connectors/sync", { headers });
}

describe("requireCronSecret", () => {
  const originalSecret = process.env.CRON_SECRET;

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it("passes (returns null) when the bearer token matches CRON_SECRET", async () => {
    process.env.CRON_SECRET = "test-secret";
    const result = requireCronSecret(makeRequest({ authorization: "Bearer test-secret" }));
    expect(result).toBeNull();
  });

  it("rejects with 401 when the Authorization header is missing", async () => {
    process.env.CRON_SECRET = "test-secret";
    const result = requireCronSecret(makeRequest());
    expect(result).not.toBeNull();
    expect(result?.status).toBe(401);
  });

  it("rejects with 401 when the token is wrong", async () => {
    process.env.CRON_SECRET = "test-secret";
    const result = requireCronSecret(makeRequest({ authorization: "Bearer wrong" }));
    expect(result?.status).toBe(401);
  });

  it("fails closed (401) when CRON_SECRET is unset, even with a matching-looking header", async () => {
    delete process.env.CRON_SECRET;
    const result = requireCronSecret(makeRequest({ authorization: "Bearer undefined" }));
    expect(result?.status).toBe(401);
  });
});
