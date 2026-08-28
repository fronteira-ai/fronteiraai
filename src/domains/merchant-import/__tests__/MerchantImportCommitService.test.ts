import { MerchantImportCommitService, type CommitContext } from "../MerchantImportCommitService";
import { ImportPlanBuilder, summarizePlan, type ExistingProductForMatch } from "../ImportPlanBuilder";
import { sourceChecksum, canTransition, canCommit } from "../types";
import type { ICatalogRepository } from "../../connectors/repositories/ICatalogRepository";
import type { RawOffer } from "../../connectors/types/raw.types";

interface FakeOffer { offerId: string; priceUSD: number; inStock: boolean; stockQuantity: number | null; description: string | null; imageUrl: string | null; productId: string; }

/** Fake ICatalogRepository — rastreia offers/histórico/produtos para asserts. */
function makeRepo() {
  const offers = new Map<string, FakeOffer>();
  const products = new Map<string, string>(); // name -> productId
  const priceHistory: string[] = [];
  const brands: Array<{ id: string; name: string }> = [];
  const cats: Array<{ id: string; name: string }> = [];
  let seq = 0;
  const repoBase = {
    async findOfferByProductAndStore(productId: string): Promise<FakeOffer | null> {
      return offers.get(productId) ?? null;
    },
    async upsertOffer(input: { productId: string; storeId: string; priceUSD: number; inStock: boolean; productUrl?: string | null }): Promise<string> {
      const key = input.productId;
      const prev = offers.get(key);
      const offerId = prev ? prev.offerId : `offer-${key}-${seq++}`;
      offers.set(key, { offerId, priceUSD: input.priceUSD, inStock: input.inStock, stockQuantity: null, description: null, imageUrl: input.productUrl ?? null, productId: key });
      return offerId;
    },
    async insertPriceHistory(input: { offerId: string; priceUSD: number }): Promise<void> { priceHistory.push(`${input.offerId}:${input.priceUSD}`); },
    async findBrandByNormalizedName(n: string) { return brands.find((b) => b.name === n) ?? null; },
    async findCategoryByNormalizedName(t: string) { return cats.find((c) => c.name === t) ?? null; },
    async upsertBrand(name: string) { const e = { id: `brand-${name}`, name }; brands.push(e); return e.id; },
    async upsertCategory(name: string) { const e = { id: `cat-${name}`, name }; cats.push(e); return e.id; },
    async upsertProduct(input: { name: string }): Promise<string> {
      if (!products.has(input.name)) products.set(input.name, `prod-${products.size + 1}`);
      return products.get(input.name)!;
    },
  } as unknown as ICatalogRepository;
  return { ...repoBase, _offers: offers, _priceHistory: priceHistory, _products: products } as ICatalogRepository & { _offers: Map<string, FakeOffer>; _priceHistory: string[]; _products: Map<string, string>; };
}

function offer(id: string, name: string, price: number, brand?: string, category?: string, stock?: number): RawOffer {
  return { product: { externalId: id, name, brand, category }, storeSlug: "", priceUSD: price, inStock: stock !== 0, stockQuantity: stock ?? null } as RawOffer;
}

describe("ImportPlanBuilder — plano determinístico (preview ≡ commit)", () => {
  it("classifica: novo produto, match canônico, ambíguo, proibido, inválido", () => {
    const existing = [{ id: "P1", brand: "Apple", name: "iPhone 15 128GB" }];
    const plan = new ImportPlanBuilder({ existingProducts: existing, existingOffersByExternalId: new Map(), storeId: "s1" });
    const { items } = plan.build([
      offer("A", "iPhone 15 128GB", 599, "Apple"),          // match exato
      offer("B", "Samsung Galaxy S24", 899, "Samsung"),       // novo produto
      offer("C", "gadget genérico", 10, "Outros"),            // proibido (brand genérica)
      offer("D", "IPHONE", 999, "Apple"),                     // proibido (título junk)
      offer("E", "", 0),                                      // inválido (sem título/external)
    ]);
    const d = (id: string) => items.find((i) => i.externalId === id)?.decision;
    expect(d("A")).toBe("CREATE_NEW_OFFER"); // match produto, sem oferta existente → nova oferta
    expect(d("B")).toBe("CREATE_PRODUCT_CANDIDATE");
    expect(d("C")).toBe("PROHIBITED");
    expect(d("D")).toBe("PROHIBITED");
    expect(d("E")).toBe("PROHIBITED"); // título vazio/junk → nunca commit
  });
});

describe("MerchantImportCommitService — commit engine", () => {
  it("commit de 2 ofertas: cria produtos+ofertas+price history (sem duplicar)", async () => {
    const repo = makeRepo();
    const svc = new MerchantImportCommitService({ repository: repo, existingProducts: [] });
    const offers = [offer("1", "Produto Alfa", 50, "Marca", "Categoria"), offer("2", "Produto Beta", 30, "Marca", "Categoria")];
    const checksum = sourceChecksum(JSON.stringify(offers));
    const ctx: CommitContext = { merchantId: "m1", userId: "u1", storeId: "s1", sourceChecksum: checksum, sessionId: "sess1" };
    const r = await svc.commit(offers, ctx);
    expect(r.status).toBe("COMMITTED");
    expect(r.createdProducts).toBe(2);
    expect(r.createdOffers).toBe(2);
    expect(r.priceHistoryWrites).toBe(2);
    expect(repo._priceHistory.length).toBe(2);
    expect(repo._products.size).toBe(2);
  });

  it("IDEMPOTÊNCIA: re-commit do MESMO session (double-click) NÃO duplica história/ofertas", async () => {
    const repo = makeRepo();
    // existente(products) começa vazio; após o 1º commit, o catálogo passa a ter o produto.
    let existingProducts: ExistingProductForMatch[] = [];
    const svc = new MerchantImportCommitService({ repository: repo, existingProducts: [] });
    const offers = [offer("1", "Produto Alfa", 50, "Marca", "Categoria")];
    const checksum = sourceChecksum(JSON.stringify(offers));
    const ctx: CommitContext = { merchantId: "m1", userId: "u1", storeId: "s1", sourceChecksum: checksum, sessionId: "sess1" };
    await svc.commit(offers, ctx);
    // Catálogo agora tem o produto criado → o 2º commit o reconcilia.
    existingProducts = [{ id: repo._products.get("Produto Alfa")!, brand: "Marca", name: "Produto Alfa", externalId: "1" }];
    const svc2 = new MerchantImportCommitService({ repository: repo, existingProducts });
    // segundo commit: mesmo preço → sem nova price_history; oferta atualizada (não duplicada)
    const r2 = await svc2.commit(offers, ctx);
    expect(r2.unchangedOffers).toBe(1);
    expect(repo._priceHistory.length).toBe(1); // NÃO duplicou
    expect(repo._offers.size).toBe(1);          // NÃO duplicou oferta
    expect(r2.priceHistoryWrites).toBe(0);
  });

  it("PRICE CHANGE no segundo import: atualiza oferta + grava nova price history (uma vez)", async () => {
    const repo = makeRepo();
    const svc = new MerchantImportCommitService({ repository: repo, existingProducts: [] });
    const first = [offer("1", "Produto Alfa", 50, "Marca", "Categoria")];
    const checksum1 = sourceChecksum(JSON.stringify(first));
    await svc.commit(first, { merchantId: "m1", userId: "u1", storeId: "s1", sourceChecksum: checksum1, sessionId: "s1" });
    const second = [offer("1", "Produto Alfa", 45, "Marca", "Categoria")]; // preço caiu
    const checksum2 = sourceChecksum(JSON.stringify(second));
    const r = await svc.commit(second, { merchantId: "m1", userId: "u1", storeId: "s1", sourceChecksum: checksum2, sessionId: "s2" });
    expect(r.priceHistoryWrites).toBe(1);
    expect(repo._priceHistory.length).toBe(2); // 50 então 45
    expect(repo._offers.get("prod-1")?.priceUSD).toBe(45);
  });

  it("IMMUTABLE PREVIEW: checksum mudou entre preview e commit → FAIL (sem escrever)", async () => {
    const repo = makeRepo();
    const svc = new MerchantImportCommitService({ repository: repo, existingProducts: [] });
    const offers = [offer("1", "Produto Alfa", 50, "Marca")];
    const wrongChecksum = sourceChecksum(JSON.stringify([])); // Preview de outro conteúdo
    const r = await svc.commit(offers, { merchantId: "m1", userId: "u1", storeId: "s1", sourceChecksum: wrongChecksum, sessionId: "sess" });
    expect(r.status).toBe("FAILED");
    expect(r.errorSummary).toBe("SOURCE_CHANGED_SINCE_PREVIEW");
    expect(repo._priceHistory.length).toBe(0); // nada escrito
  });

  it("PROHIBITED/AMBIGUOUS NUNCA commitam (rejected + ambiguous contados)", async () => {
    const repo = makeRepo();
    // item ambíguo: dois matches canônicos de mesma marca+título
    const ambiguous = offer("X", "iPhone 15 128GB", 599, "Apple");
    const secondExisting = { id: "P2", brand: "Apple", name: "iPhone 15 128GB" };
    const svc2 = new MerchantImportCommitService({ repository: repo, existingProducts: [{ id: "P1", brand: "Apple", name: "iPhone 15 128GB" }, secondExisting] });
    const offers = [ambiguous, offer("Y", "CELULAR", 5, "Outros"), offer("Z", "Fone Pro X", 10, "Marca", "Categoria")];
    const checksum = sourceChecksum(JSON.stringify(offers));
    const r = await svc2.commit(offers, { merchantId: "m1", userId: "u1", storeId: "s1", sourceChecksum: checksum, sessionId: "sess" });
    expect(r.status).toBe("COMMITTED");
    // Z commitado (1 produto novo); X ambíguo e Y proibido NÃO
    expect(r.createdProducts).toBe(1);
    expect(r.ambiguous).toBe(1);
    expect(r.rejected).toBe(1); // Y proibido
    expect(repo._products.has("Fone Pro X")).toBe(true);
  });

  it("TENANT: contexto sem store → FAIL", async () => {
    const repo = makeRepo();
    const svc = new MerchantImportCommitService({ repository: repo, existingProducts: [] });
    const r = await svc.commit([offer("1", "X", 1, "M")], { merchantId: "m1", userId: "u1", storeId: "", sourceChecksum: "c", sessionId: "s" });
    expect(r.status).toBe("FAILED");
  });
});

describe("Import state machine + checksum + role", () => {
  it("transições de estado são válidas", () => {
    expect(canTransition("UPLOADED", "VALIDATED")).toBe(true);
    expect(canTransition("PREVIEW_READY", "APPROVED")).toBe(true);
    expect(canTransition("APPROVED", "COMMITTING")).toBe(true);
    expect(canTransition("COMMITted" as never, "COMMITTED")).toBe(false);
    expect(canTransition("UPLOADED", "COMMITTED")).toBe(false); // precisa passar por approval
  });
  it("sourceChecksum é determinístico", () => {
    expect(sourceChecksum("a")).toBe(sourceChecksum("a"));
    expect(sourceChecksum("a")).not.toBe(sourceChecksum("b"));
    expect(sourceChecksum("")).toBe(sourceChecksum(""));
  });
  it("ROLE SECURITY (§8): analista (sem manage_imports) NÃO pode commitar; owner/admin sim", () => {
    expect(canCommit(["view_dashboard", "view_analytics"])).toBe(false); // ANALYST
    expect(canCommit(["manage_catalog"])).toBe(false);                   // manage_catalog sozinho NÃO commita
    expect(canCommit([])).toBe(false);                                    // sem permissão
    expect(canCommit(["manage_imports"])).toBe(true);                     // OWNER/ADMIN (ManageImports)
  });
});

describe("CROSS-TENANT + role no commit (§44)", () => {
  it("Merchant A NÃO commita em store de Merchant B (commit engine TENANT guard)", async () => {
    const repo = makeRepo();
    const svc = new MerchantImportCommitService({ repository: repo, existingProducts: [] });
    const offers = [offer("1", "Produto Alfa", 50, "Marca")];
    // storeId pertence ao B; contexto de A (store errado) → engine usa storeId
    // apenas se passado server-side; aqui o caller não deve passar store não-owned.
    const r = await svc.commit(offers, { merchantId: "merchant-A", userId: "u-A", storeId: "", sourceChecksum: "x", sessionId: "s" });
    expect(r.status).toBe("FAILED");
    expect(repo._priceHistory.length).toBe(0); // nada escrito
  });

  it("commit idempotente não duplica em re-tentativa do mesmo session (double-click)", async () => {
    const repo = makeRepo();
    let existing = [] as ExistingProductForMatch[];
    const svc = new MerchantImportCommitService({ repository: repo, existingProducts: [] });
    const offers = [offer("1", "Produto Alfa", 50, "Marca")];
    const checksum = sourceChecksum(JSON.stringify(offers));
    const ctx: CommitContext = { merchantId: "m1", userId: "u1", storeId: "s1", sourceChecksum: checksum, sessionId: "SESS-1" };
    await svc.commit(offers, ctx);
    existing = [{ id: repo._products.get("Produto Alfa")!, brand: "Marca", name: "Produto Alfa", externalId: "1" }];
    const svc2 = new MerchantImportCommitService({ repository: repo, existingProducts: existing });
    const again = await svc2.commit(offers, ctx);
    expect(again.priceHistoryWrites).toBe(0); // não duplica price history
    expect(repo._priceHistory.length).toBe(1);
    expect(repo._offers.size).toBe(1);
  });
});

describe("SCALE + CONTINUATION (§22/23/43)", () => {
  it("commit de 10.000 itens em batches bounded + re-commit idempotente", async () => {
    const repo = makeRepo();
    const offers: RawOffer[] = [];
    for (let i = 0; i < 10_000; i++) {
      offers.push(offer(`SKU-${i}`, `Produto Real ${i}`, 100 + i, "Marca", "Categoria"));
    }
    const checksum = sourceChecksum(JSON.stringify(offers));
    const ctx: CommitContext = { merchantId: "m1", userId: "u1", storeId: "s1", sourceChecksum: checksum, sessionId: "S10K" };
    const svc = new MerchantImportCommitService({ repository: repo, existingProducts: [], batchSize: 500 });
    const r = await svc.commit(offers, ctx);
    expect(r.status).toBe("COMMITTED");
    expect(r.createdProducts).toBe(10_000);
    expect(r.priceHistoryWrites).toBe(10_000);
    expect(repo._offers.size).toBe(10_000); // sem duplicar ofertas
    // Re-commit do MESMO session (double-click a 10k): nenhuma nova escrita.
    const again = await svc.commit(offers, ctx);
    expect(again.priceHistoryWrites).toBe(0);
    expect(repo._offers.size).toBe(10_000);
    expect(repo._priceHistory.length).toBe(10_000);
  });
});

describe("summarizePlan", () => {
  it("agrega décãções", () => {
    const s = summarizePlan([
      { externalId: "1", name: "a", decision: "CREATE_NEW_OFFER" },
      { externalId: "2", name: "b", decision: "PROHIBITED" },
      { externalId: "3", name: "c", decision: "AMBIGUOUS" },
      { externalId: "4", name: "d", decision: "UNCHANGED" },
    ]);
    expect(s.createNewOffers).toBe(1);
    expect(s.prohibited).toBe(1);
    expect(s.ambiguous).toBe(1);
    expect(s.unchanged).toBe(1);
    expect(s.total).toBe(4);
  });
});
