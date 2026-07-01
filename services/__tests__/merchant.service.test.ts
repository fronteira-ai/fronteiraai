import type { SupabaseClient } from "@supabase/supabase-js";
import { getMerchantStoreIds, merchantOwnsStoreSlug, checkImportEntitlement } from "../merchant.service";

function makeQueryBuilder(result: { data?: unknown; count?: number | null; error?: unknown }) {
  const builder: Record<string, unknown> = {};
  builder.select = jest.fn(() => builder);
  builder.eq = jest.fn(() => builder);
  builder.gte = jest.fn(() => builder);
  builder.maybeSingle = jest.fn(() => Promise.resolve(result));
  builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
}

function makeMockSupabase(perTable: Record<string, { data?: unknown; count?: number | null }>): SupabaseClient {
  return {
    from: jest.fn((table: string) => makeQueryBuilder(perTable[table] ?? { data: null })),
  } as unknown as SupabaseClient;
}

describe("getMerchantStoreIds", () => {
  it("returns an empty array when the merchant has no linked stores", async () => {
    const supabase = makeMockSupabase({ merchant_stores: { data: [] } });
    const ids = await getMerchantStoreIds("merchant-1", supabase);
    expect(ids).toEqual([]);
  });

  it("maps store_id out of each row", async () => {
    const supabase = makeMockSupabase({
      merchant_stores: { data: [{ store_id: "store-1" }, { store_id: "store-2" }] },
    });
    const ids = await getMerchantStoreIds("merchant-1", supabase);
    expect(ids).toEqual(["store-1", "store-2"]);
  });
});

describe("merchantOwnsStoreSlug", () => {
  it("returns false when the store slug doesn't exist", async () => {
    const supabase = makeMockSupabase({ stores: { data: null } });
    expect(await merchantOwnsStoreSlug("merchant-1", "missing-store", supabase)).toBe(false);
  });

  it("returns false when the store exists but the merchant has no link", async () => {
    const supabase = makeMockSupabase({
      stores: { data: { id: "store-1" } },
      merchant_stores: { data: null },
    });
    expect(await merchantOwnsStoreSlug("merchant-1", "some-store", supabase)).toBe(false);
  });

  it("returns true when a merchant_stores link exists", async () => {
    const supabase = makeMockSupabase({
      stores: { data: { id: "store-1" } },
      merchant_stores: { data: { id: "link-1" } },
    });
    expect(await merchantOwnsStoreSlug("merchant-1", "some-store", supabase)).toBe(true);
  });
});

describe("checkImportEntitlement", () => {
  it("blocks when the plan has no connector access", async () => {
    const supabase = makeMockSupabase({
      merchant_plans: { data: { has_connectors: false, max_imports_month: 5 } },
    });
    const result = await checkImportEntitlement("merchant-1", "free", supabase);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/não inclui conectores/);
  });

  it("blocks when the monthly quota is already used up", async () => {
    const supabase = makeMockSupabase({
      merchant_plans: { data: { has_connectors: true, max_imports_month: 5 } },
      connector_sync_runs: { count: 5 },
    });
    const result = await checkImportEntitlement("merchant-1", "pro", supabase);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/Limite mensal/);
  });

  it("allows when under quota and the plan has connector access", async () => {
    const supabase = makeMockSupabase({
      merchant_plans: { data: { has_connectors: true, max_imports_month: 30 } },
      connector_sync_runs: { count: 2 },
    });
    const result = await checkImportEntitlement("merchant-1", "pro", supabase);
    expect(result.allowed).toBe(true);
    expect(result.used).toBe(2);
    expect(result.max).toBe(30);
  });
});
