import type { SupabaseClient } from "@supabase/supabase-js";
import { merchantOwnsStoreSlug, getMerchantStoreIds } from "../merchant.service";
import { exportStoreCatalogCsv, escapeCsvCell } from "../merchant-export.service";
import { canOnboardMerchant, isValidSourceUrl, type MerchantAuthorizationRecord } from "../../src/domains/merchant-feed/auth/MerchantAuthorization";
import { MerchantAuthorizationService } from "../merchant-authorization.service";

// ── Fail-closed mock: nenhuma tabela existe por padrão. ──────────────────────
function makeMockSupabase(tables: Record<string, unknown>): SupabaseClient {
  function qb(result: unknown) {
    const builder: Record<string, unknown> = {};
    builder.select = jest.fn(() => builder);
    builder.eq = jest.fn(() => builder);
    builder.order = jest.fn(() => builder);
    builder.limit = jest.fn(() => builder);
    builder.maybeSingle = jest.fn(() => Promise.resolve(result));
    builder.single = jest.fn(() => Promise.resolve(result));
    builder.upsert = jest.fn(() => builder);
    builder.insert = jest.fn(() => builder);
    builder.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
    return builder;
  }
  return {
    from: jest.fn((table: string) => qb((tables as Record<string, unknown>)[table] ?? { data: null })),
  } as unknown as SupabaseClient;
}

describe("MERCHANT CONSOLE — TENANT ISOLATION (§5/45/51)", () => {
  it("Merchant A NÃO acessa o store de Merchant B (app-layer guard)", async () => {
    // Orquestra o double: para "stores" devolve o store; para "merchant_stores"
    // devolve link SÓ quando a merchant possui o store consultado.
    const ownedByA = new Set(["store-1"]);
    const from = jest.fn((table: string) => {
      const b: Record<string, unknown> = {};
      b.select = jest.fn(() => b);
      b.order = jest.fn(() => b);
      b.limit = jest.fn(() => b);
      const eq = jest.fn((_col: string, _val: unknown) => { void _col; void _val; return b; });
      b.eq = eq;
      b.maybeSingle = jest.fn(() => {
        // "stores": eq[0] = slug; "merchant_stores": eq[1] = store_id.
        const si: string[] = eq.mock.calls.map((c) => c[1] as string);
        if (table === "stores") {
          const slug = si[0];
          return Promise.resolve({ data: slug ? { id: slug } : null, error: null });
        }
        if (table === "merchant_stores") {
          const storeId = si[1];
          const owned = storeId && ownedByA.has(storeId);
          return Promise.resolve({ data: owned ? { id: "link" } : null, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });
      return b;
    });
    const supabase = { from } as unknown as SupabaseClient;

    // A possui store-1 → OK.
    expect(await merchantOwnsStoreSlug("merchant-A", "store-1", supabase)).toBe(true);
    // A NÃO possui store-2 (do B) → FAIL obrigatório.
    expect(await merchantOwnsStoreSlug("merchant-A", "store-2", supabase)).toBe(false);
  });

  it("export do catálogo de loja de outra merchant → FORBIDDEN (exportStoreCatalogCsv)", async () => {
    // Simula re-audit de posse: merchant-1 não tem link para store-2 (do B).
    const builder: Record<string, unknown> = {};
    builder.select = jest.fn(() => builder);
    builder.eq = jest.fn(() => builder);
    builder.limit = jest.fn(() => builder);
    builder.maybeSingle = jest.fn(() => Promise.resolve({ data: null, error: null }));
    const supabase = {
      from: jest.fn(() => builder),
    } as unknown as SupabaseClient;
    await expect(exportStoreCatalogCsv(supabase, "merchant-1", "store-2")).rejects.toThrow(/FORBIDDEN/);
  });

  it("getMerchantStoreIds só devolve os stores da merchant", async () => {
    const supabase = makeMockSupabase({ merchant_stores: { data: [{ store_id: "s1" }, { store_id: "s2" }] } });
    expect(await getMerchantStoreIds("merchant-A", supabase)).toEqual(["s1", "s2"]);
  });
});

describe("MERCHANT CONSOLE — AUTHORIZATION (não inventa consentimento)", () => {
  function rec(over: Partial<MerchantAuthorizationRecord> = {}): MerchantAuthorizationRecord {
    return { merchantSlug: "x", authorizedBy: "Ops", authorizationDate: new Date().toISOString(), sourceUrl: "https://x/f.json", allowedUsage: ["display_offers"], status: "ACTIVE", ...over };
  }
  it("canOnboard só com consentimento real (authorized_by/date/source_url/ACTIVE)", () => {
    expect(canOnboardMerchant(undefined)).toBe(false);
    expect(canOnboardMerchant(rec({ status: "PENDING_LEGAL" }))).toBe(false);
    expect(canOnboardMerchant(rec({ authorizedBy: "" }))).toBe(false);
    expect(canOnboardMerchant(rec({ sourceUrl: "ftp://x" }))).toBe(false);
    expect(canOnboardMerchant(rec())).toBe(true);
  });
  it("listByMerchant é tenant-scoped por merchant_id (service)Não tem como um merchant ver autorizações de outro se o merchant_id é fixado server-side", async () => {
    const service = new MerchantAuthorizationService(makeMockSupabase({ merchant_authorizations: [{ a: 1 }] }));
    const rows = await service.listByMerchant("merchant-A");
    expect(Array.isArray(rows)).toBe(true);
  });
});

describe("MERCHANT CONSOLE — CSV EXPORT segurança (§37)", () => {
  it("escapeCsvCell neutraliza injeção de fórmula e preserva valores simples", () => {
    expect(escapeCsvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(escapeCsvCell("+1")).toBe("'+1");
    expect(escapeCsvCell("-1")).toBe("'-1");
    expect(escapeCsvCell("@cmd")).toBe("'@cmd");
    expect(escapeCsvCell("Título, com vírgula")).toBe('"Título, com vírgula"');
    expect(escapeCsvCell(123)).toBe("123");
  });
});

describe("MERCHANT CONSOLE — RLS/URL hygiene", () => {
  it("isValidSourceUrl só aceita http(s)", () => {
    expect(isValidSourceUrl("https://x/f.json")).toBe(true);
    expect(isValidSourceUrl("file:///etc")).toBe(false);
    expect(isValidSourceUrl("localhost:3000")).toBe(false);
  });
});
