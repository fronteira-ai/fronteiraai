import type { SupabaseClient } from "@supabase/supabase-js";

// Universal thenable stub — any chain of Supabase query-builder method calls
// (`.select().eq().not().order().limit()...`) resolves, on await, to the
// same fixed result, regardless of chain shape. Mirrors connectors/__tests__/helpers.ts's
// role for this domain — not itself a test file (no *.test.ts suffix), so Jest's
// testMatch doesn't pick it up as a suite.
export function makeStubQuery(result: { data?: unknown; count?: number | null; error?: unknown }) {
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === "then") {
        return (resolve: (v: unknown) => void) => resolve(result);
      }
      return () => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
}

// Keyed by table name — every call to client.from(table) (regardless of the
// specific .select()/.eq()/... chain that follows) resolves to that table's
// configured stub result. Tables not listed fall back to `{ data: [], count: 0 }`.
export function makeMockClient(perTable: Record<string, { data?: unknown; count?: number | null }> = {}) {
  return {
    from: jest.fn((table: string) => makeStubQuery(perTable[table] ?? { data: [], count: 0 })),
  } as unknown as SupabaseClient;
}
