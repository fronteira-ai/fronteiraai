import { SupabaseCatalogRepository } from "../infrastructure/SupabaseCatalogRepository";
import type { UpsertOfferInput } from "../repositories/ICatalogRepository";

// Regression ADR-008 (§9 Catalog Convergence): `available` é semântica de
// ARQUIVO, NUNCA derivada de `in_stock`. Out-of-stock é `in_stock=false` com
// `available=true` (esgotada, visível "Sem estoque", histórico intacto).
// O bug `available: input.inStock` escondia ofertas válidas de /product/[slug].

function makeCapturingRepo() {
  const captured: Record<string, unknown>[] = [];
  const upsert = jest.fn((payload: Record<string, unknown>) => {
    captured.push(payload);
    return {
      select: () => ({ single: () => Promise.resolve({ data: { id: "o1" }, error: null }) }),
    };
  });
  const client = { from: () => ({ upsert }) };
  const repo = new SupabaseCatalogRepository(client as never);
  return { repo, captured };
}

function baseInput(overrides: Partial<UpsertOfferInput> = {}): UpsertOfferInput {
  return {
    productId: "p1",
    storeId: "s1",
    currency: "USD",
    priceUSD: 500,
    priceBRL: null,
    oldPriceUSD: null,
    inStock: true,
    stockQuantity: null,
    condition: null,
    warranty: null,
    cashback: null,
    productUrl: "https://example.com/x",
    ...overrides,
  };
}

describe("SupabaseCatalogRepository.upsertOffer — available semantics (ADR-008)", () => {
  it("NUNCA deriva available de in_stock: oferta esgotada fica available=true e in_stock=false", async () => {
    const { repo, captured } = makeCapturingRepo();
    await repo.upsertOffer(baseInput({ inStock: false }));
    expect(captured[0]).toMatchObject({ in_stock: false, available: true });
  });

  it("oferta em estoque fica available=true e in_stock=true", async () => {
    const { repo, captured } = makeCapturingRepo();
    await repo.upsertOffer(baseInput({ inStock: true }));
    expect(captured[0]).toMatchObject({ in_stock: true, available: true });
  });
});
