// New Zone (public Apollo GraphQL) — minimized public-API client.
// Self-contained (uses global fetch with retry/UA), mirrors the honest
// User-Agent policy of HttpFetchStrategy without needing to extend the
// shared GET-only SDK. POSTs to the PUBLIC /api/graphql endpoint (no auth,
// no cookies, no CAPTCHA/WAF bypass — a legitimate public client request).

import { NEW_ZONE_CONFIG as CFG } from "./config";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const RETRIES = 2;

export interface GqlResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export async function graphql<T>(operationName: string, query: string, variables: Record<string, unknown>): Promise<GqlResponse<T>> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(CFG.graphqlUrl, {
        method: "POST",
        headers: { "content-type": "application/json", "user-agent": UA },
        body: JSON.stringify({ operationName, query, variables }),
        signal: AbortSignal.timeout(CFG.timeoutMs),
      });
      if (!res.ok) {
        // retry on 5xx/429
        if (res.status >= 500 || res.status === 429) continue;
        throw new Error(`GraphQL HTTP ${res.status}`);
      }
      return (await res.json()) as GqlResponse<T>;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("GraphQL failed after retries");
}
