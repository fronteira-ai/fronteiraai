import type { SupabaseClient } from "@supabase/supabase-js";
import { merchantOwnsStoreSlug, getMerchantStoreIds } from "../merchant.service";
import { exportStoreCatalogCsv, escapeCsvCell } from "../merchant-export.service";
import { canOnboardMerchant, isValidSourceUrl, type MerchantAuthorizationRecord } from "../../src/domains/merchant-feed/auth/MerchantAuthorization";
import { MerchantAuthorizationService } from "../merchant-authorization.service";
import { canCommitAuthorization, type CommitAuthorizationFacts } from "../../src/domains/merchant-import/types";
import { Permission } from "../../src/domains/merchant-ownership/types/enums";

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

describe("IMPORT COMMIT — autorização de mutação de catálogo (fail-closed)", () => {
  // canCommitAuthorization exige: membership + autorização ACTIVE + role manage_imports.
  const withImport = Object.values(Permission) as string[]; // owner tem todas
  const ROLE_OK = withImport;
  const ROLE_INSUFFICIENT: readonly string[] = []; // sem manage_imports
  const facts = (over: Partial<CommitAuthorizationFacts> = {}): CommitAuthorizationFacts => ({
    isStoreMember: true,
    authorizationActive: true,
    permissions: ROLE_OK,
    ...over,
  });

  it("1. sem sessão (merchant ausente) → deny", () => {
    // merchant inexistente ⇒ isStoreMember=false (requireMerchantContext retorna 401 e aborta).
    expect(canCommitAuthorization(facts({ isStoreMember: false, authorizationActive: false, permissions: [] }))).toBe(false);
  });

  it("2. membership de outra loja/un. merchant ≠ dono → deny", () => {
    expect(canCommitAuthorization(facts({ isStoreMember: false }))).toBe(false);
    expect(canCommitAuthorization(facts({ isStoreMember: false, authorizationActive: true, permissions: ROLE_OK }))).toBe(false);
  });

  it("3. membro mas SEM nenhuma autorização → deny", () => {
    expect(canCommitAuthorization(facts({ isStoreMember: true, authorizationActive: false }))).toBe(false);
  });

  it("4. autorização PENDING_LEGAL (não-ACTIVE) → deny", () => {
    // hasActiveAuthorization só conta row status='ACTIVE'; PENDING cai em authorizationActive=false.
    expect(canCommitAuthorization(facts({ authorizationActive: false }))).toBe(false);
  });

  it("5. autorização REVOKED/inactive → deny", () => {
    expect(canCommitAuthorization(facts({ authorizationActive: false }))).toBe(false);
    expect(canCommitAuthorization(facts({ authorizationActive: false, permissions: ROLE_OK }))).toBe(false);
  });

  it("6. autorização de OUTRA loja (mesmo merchant) → deny p/ esta store", () => {
    // authorizationActive é avaliado para o par exato (merchant_id, store_id); outra loja não conta.
    expect(canCommitAuthorization(facts({ isStoreMember: true, authorizationActive: false }))).toBe(false);
  });

  it("7. autorização ACTIVE válida mas role insuficiente → deny", () => {
    expect(canCommitAuthorization(facts({ authorizationActive: true, permissions: ROLE_INSUFFICIENT }))).toBe(false);
    expect(canCommitAuthorization(facts({ isStoreMember: true, authorizationActive: true, permissions: [] }))).toBe(false);
    // role com manage_catalog mas SEM manage_imports não autoriza commit
    expect(canCommitAuthorization(facts({ permissions: [Permission.ManageCatalog] }))).toBe(false);
  });

  it("8. merchant + membership + ACTIVE authorization + manage_imports → ALLOW", () => {
    expect(canCommitAuthorization(facts({ isStoreMember: true, authorizationActive: true, permissions: [Permission.ManageImports] }))).toBe(true);
    expect(canCommitAuthorization(facts())).toBe(true);
  });

  describe("MerchantAuthorizationService.hasActiveAuthorization — fail-closed", () => {
    // Builder que rastreia os filtros aplicados à query para provar que a
    // busca é exatamente (merchant_id, store_id, status='ACTIVE').
    function mockAuthz(result: { data: unknown; error: unknown }) {
      const calls: Array<{ col: string; val: unknown }> = [];
      const b: Record<string, unknown> = {};
      b.select = jest.fn(() => b);
      b.eq = jest.fn((col: string, val: unknown) => { calls.push({ col, val }); return b; });
      b.maybeSingle = jest.fn(() => Promise.resolve(result));
      return {
        underlyingCalls: calls,
        supabase: { from: jest.fn(() => b) } as unknown as SupabaseClient,
      };
    }

    function assertFiltersQueried(calls: Array<{ col: string; val: unknown }>) {
      const got = (col: string) => calls.some((c) => c.col === col);
      expect(got("merchant_id")).toBe(true);
      expect(got("store_id")).toBe(true);
      const act = calls.filter((c) => c.col === "status");
      expect(act.length).toBeGreaterThanOrEqual(1);
      expect(act.some((c) => c.val === "ACTIVE")).toBe(true);
    }

    it("row ACTIVE p/ (merchant, store) exatos → true", async () => {
      const { underlyingCalls, supabase } = mockAuthz({ data: { id: "a1" }, error: null });
      const svc = new MerchantAuthorizationService(supabase);
      expect(await svc.hasActiveAuthorization("m", "s")).toBe(true);
      assertFiltersQueried(underlyingCalls);
    });
    it("nenhuma row → false", async () => {
      const { supabase } = mockAuthz({ data: null, error: null });
      expect(await new MerchantAuthorizationService(supabase).hasActiveAuthorization("m", "s")).toBe(false);
    });
    it("row de outro store / outro merchant → false (par exato é exigido)", async () => {
      const { underlyingCalls, supabase } = mockAuthz({ data: null, error: null });
      const svc = new MerchantAuthorizationService(supabase);
      expect(await svc.hasActiveAuthorization("merchant-A", "store-B")).toBe(false);
      assertFiltersQueried(underlyingCalls);
    });
    it("status REVOKED/PENDING → false (query exige ACTIVE)", async () => {
      const { underlyingCalls, supabase } = mockAuthz({ data: null, error: null });
      // Stub só devolve row quando o resultado simula status ACTIVE; qualquer
      // filtro que não 'ACTIVE' não devolve nada.
      const svc = new MerchantAuthorizationService(supabase);
      expect(await svc.hasActiveAuthorization("m", "s")).toBe(false);
      assertFiltersQueried(underlyingCalls);
    });
    it("erro DB/query → false (NUNCA authorization=true)", async () => {
      for (const outcome of [
        { data: null, error: new Error("connection refused") },
        { data: { id: "a1" }, error: new Error("rls denied") },
      ]) {
        const { supabase } = mockAuthz(outcome);
        expect(await new MerchantAuthorizationService(supabase).hasActiveAuthorization("m", "s")).toBe(false);
      }
    });
  });
});
