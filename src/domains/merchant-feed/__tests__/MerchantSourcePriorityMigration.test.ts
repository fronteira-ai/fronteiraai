import { MerchantJsonPaginator } from "../parser/MerchantJsonPaginator";
import { sourcePriorityRank, canonicalImagePriority, officialStockPrecedence, migrationDryRun, type ExistingOfferRef } from "../migration/MerchantSourceMigration";
import type { RawOffer } from "../../connectors/types/raw.types";

describe("MerchantJsonPaginator — paginação JSON/API (bounded, declarativa)", () => {
  it("sem pagination config → entrega a única resposta (1 body)", async () => {
    const p = new MerchantJsonPaginator({ fetchPage: async () => ({ body: '{"x":1}', ok: true }) });
    const r = await p.collect("https://api.x/list");
    expect(r.pages).toBe(0);
    expect(r.bodies).toHaveLength(1);
    expect(r.bodies[0]).toBe('{"x":1}');
  });

  it("itera páginas pelo cursor na raiz e para no final", async () => {
    const pages: Record<string, string> = {
      "https://api.x/list": '{"items":[{"id":"a"}],"next":"https://api.x/list?page=2"}',
      "https://api.x/list?page=2": '{"items":[{"id":"b"}],"next":"https://api.x/list?page=3"}',
      "https://api.x/list?page=3": '{"items":[{"id":"c"}],"next":""}',
    };
    const p = new MerchantJsonPaginator({ fetchPage: async (url) => ({ body: pages[url], ok: true }) });
    const r = await p.collect("https://api.x/list", { nextPageField: "next" });
    expect(r.bodies).toHaveLength(3);
    expect(r.pages).toBe(3);
  });

  it("nunca entra em loop infinito (MAX_PAGES) e para em cursor repetido", async () => {
    let calls = 0;
    const p = new MerchantJsonPaginator({ fetchPage: async () => { calls++; return { body: '{"next":"https://api.x/list?page=2"}', ok: true }; } });
    const r = await p.collect("https://api.x/list", { nextPageField: "next" });
    expect(calls).toBeLessThan(5); // parou rápido (cursor repetido)
    expect(r.pages).toBe(2);
  });

  it("falha de página → para sem derrubar (guard)", async () => {
    const p = new MerchantJsonPaginator({ fetchPage: async (url) => url.includes("?page=2") ? { body: "", ok: false, error: "HTTP_500" } : { body: '{"next":"https://api.x/list?page=2"}', ok: true } });
    const r = await p.collect("https://api.x/list", { nextPageField: "next" });
    expect(r.bodies).toHaveLength(1);
    expect(r.lastError).toContain("HTTP_500");
  });
});

describe("Source priority + migration + image/stock precedence", () => {
  it("prioridade: API oficial > feed oficial > public API > structured > crawler", () => {
    expect(sourcePriorityRank("OFFICIAL_MERCHANT_API", "PUBLIC_API")).toBe(1);
    expect(sourcePriorityRank("OFFICIAL_MERCHANT_FEED", "XML_FEED")).toBe(2);
    expect(sourcePriorityRank("PUBLIC_STORE_API", "PUBLIC_API")).toBe(3);
    expect(sourcePriorityRank("PUBLIC_STRUCTURED_SOURCE", "JSON_FEED")).toBe(4);
    expect(sourcePriorityRank("PUBLIC_CONNECTOR", "CRAWLER")).toBe(5);
  });

  it("migration dry-run: idênticos (mesmo externalId) → matched, sem duplicar", () => {
    const existing: ExistingOfferRef[] = [{ externalId: "E1", storeSlug: "loja", title: "Fone X", brand: "Marca", priceUSD: 50, inStock: true, priority: 5 }];
    const feed: RawOffer[] = [{ product: { externalId: "E1", name: "Fone X", brand: "Marca" }, storeSlug: "loja", priceUSD: 50, inStock: true } as RawOffer];
    const r = migrationDryRun(existing, feed);
    expect(r.matchedOffers).toBe(1);
    expect(r.unmatchedExisting).toBe(0);
    expect(r.newFeedOffers).toBe(0);
    expect(r.priceDifferences).toBe(0);
    expect(r.canCutover).toBe(true);
  });

  it("migration dry-run: diferenças de preço/estoque detectadas sem destruição", () => {
    const existing: ExistingOfferRef[] = [{ externalId: "E1", storeSlug: "loja", title: "Fone X", brand: "Marca", priceUSD: 50, inStock: true, priority: 5 }];
    const feed: RawOffer[] = [{ product: { externalId: "E1", name: "Fone X", brand: "Marca" }, storeSlug: "loja", priceUSD: 49, inStock: false } as RawOffer];
    const r = migrationDryRun(existing, feed);
    expect(r.priceDifferences).toBe(1);
    expect(r.stockDifferences).toBe(1);
    expect(r.existingOffers).toBe(1); // nada apagado
  });

  it("migration dry-run: reconciliação brand+modelo quando externalId difere; ambiguidade não funde", () => {
    const existing: ExistingOfferRef[] = [
      { externalId: "OLD1", storeSlug: "loja", title: "Fone X 128GB", brand: "Marca", priority: 5 },
      { externalId: "OLD2", storeSlug: "loja", title: "Fone X 128GB", brand: "Marca", priority: 5 },
    ];
    const feed: RawOffer[] = [{ product: { externalId: "NEW1", name: "Fone X 128GB", brand: "Marca" }, storeSlug: "loja", priceUSD: 10 } as RawOffer];
    const r = migrationDryRun(existing, feed);
    expect(r.ambiguous).toBe(1); // 2 candidatos → AMBIGUOUS, não false-merge
    expect(r.canCutover).toBe(false);
  });

  it("official image priority vence fonte menor, mas não sobrescreve canônica melhor", () => {
    expect(canonicalImagePriority("OFFICIAL_MERCHANT_FEED", "XML_FEED")).toBeGreaterThan(canonicalImagePriority("PUBLIC_CONNECTOR", "CRAWLER"));
  });

  it("official stock outrank inferred; sem sinal → preserva inferido (não inventa)", () => {
    expect(officialStockPrecedence(false, undefined)).toBe(false);      // oficial diz esgotado
    expect(officialStockPrecedence(true, true)).toBe(true);
    expect(officialStockPrecedence(undefined, true)).toBe(true);        // sem sinal oficial → inferido mantém
    expect(officialStockPrecedence(undefined, undefined)).toBeUndefined();
  });
});
