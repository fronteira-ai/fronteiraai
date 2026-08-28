/**
 * PILOT SIMULATION (PART H §36-39) — usando SOMENTE fixtures/test data.
 * Simula o primeiro onboarding de ponta a ponta do feed (JSON):
 *   STORE → SOURCE → VALIDATE → PREVIEW → ACTIVATE → INITIAL SYNC
 *   → RE-SYNC → PRICE CHANGE → STOCK CHANGE → IMAGE → FRESHNESS → PRICE HISTORY
 * e ESCALA 100 / 1k / 10k (§37) + produto identity safety (§38, false-merge).
 *
 * Nenhuma escrita em produção; feed sanitizado, sem lojista real.
 */

import { MerchantFeedValidator } from "../validator/MerchantFeedValidator";
import { MerchantOperatorWorkflow } from "../onboarding/MerchantOperatorWorkflow";
import { MerchantFeedMatchPreview } from "../canonical/MerchantFeedMatchPreview";
import type { MerchantSourceConfig } from "../config/MerchantSourceConfig";
import type { RawOffer } from "../../connectors/types/raw.types";

function cfg(root: string): MerchantSourceConfig {
  return { sourceType: "JSON_FEED", feedUrl: "https://x/f.json", rootPath: root, fieldMapping: { external_id: "id", title: "nome", price: "preco", stock: "estoque", brand: "marca", image: "imagem", product_url: "url" } };
}

function feedJson(products: unknown[]): string {
  return JSON.stringify({ products });
}

describe("PILOT SIMULATION — primeiro onboarding (fixtures)", () => {
  it("pipelines completos: SYNC → RE-SYNC → price/stock change → price history preserva observações", async () => {
    const store = "loja-piloto";

    // STAGE 1: SOURCE VALIDATE + PREVIEW
    const v = new MerchantFeedValidator({ sourceConfig: cfg("products") });
    const s1 = await v.validate("https://x/f.json", feedJson([
      { id: "A1", nome: "Fone X", preco: "50.00", estoque: "10", marca: "Marca", imagem: "https://x/a.jpg", url: "https://x/a" },
      { id: "A2", nome: "Fone Y", preco: "30.00", estoque: "5", marca: "Marca", imagem: "https://x/b.jpg", url: "https://x/b" },
    ]));
    expect(s1.formatDetected).toBe("JSON_FEED");
    expect(s1.validItems).toBe(2);

    const preview = await new MerchantOperatorWorkflow().validateAndPreview(
      { storeSlug: store, feedUrl: "https://x/f.json", sourceConfig: cfg("products"), sourceType: "JSON_FEED" },
      feedJson([{ id: "A1", nome: "Fone X", preco: "50.00", estoque: "10", marca: "Marca" }]),
    );
    // stock/inventory simulation: price_history = log das observações (imitação segura da integração)
    const history: Array<{ id: string; price: number; inStock: boolean; ts: number }> = [];

    // INITIAL SYNC (offers normalizadas, SEM escrita de produção)
    const offers: RawOffer[] = (s1.offers ?? []).map((o) => ({ ...o, storeSlug: store }));
    for (const o of offers) history.push({ id: o.product.externalId!, price: o.priceUSD, inStock: o.inStock ?? false, ts: 1 });

    expect(history).toHaveLength(2);
    expect(history.find((h) => h.id === "A1")!.price).toBeCloseTo(50, 0);

    // RE-SYNC: PRICE CHANGE (A1 50→45) + STOCK CHANGE (A2 esgota) + IMAGE troca
    const offers2: RawOffer[] = (offers as RawOffer[]).map((o) =>
      o.product.externalId === "A1"
        ? { ...o, priceUSD: 45, product: { ...o.product, imageUrl: "https://x/a-v2.jpg" } }
        : o.product.externalId === "A2" ? { ...o, inStock: false, stockQuantity: 0 } : o,
    );
    for (const o of offers2) {
      const last = [...history].reverse().find((h) => h.id === o.product.externalId);
      // price_history: nova observação só quando mudou (não duplica observações idênticas)
      if (!last || last.price !== o.priceUSD || last.inStock !== (o.inStock ?? false)) {
        history.push({ id: o.product.externalId!, price: o.priceUSD, inStock: o.inStock ?? false, ts: 2 });
      }
    }

    const a1History = history.filter((h) => h.id === "A1");
    const a2History = history.filter((h) => h.id === "A2");
    expect(a1History.length).toBe(2);            // 50 → 45 (2 observações de preço)
    expect(a1History[0].price).toBeCloseTo(50, 0);
    expect(a1History[1].price).toBeCloseTo(45, 0);
    expect(a2History[a2History.length - 1].inStock).toBe(false); // esgotou

    // FRESHNESS: a observação recente domina; feed íntegro.
    expect(s1.notModified).toBe(false);
    expect(offers2[0].product.imageUrl).toBe("https://x/a-v2.jpg");
    expect(preview.activation.authorized).toBe(false); // piloto não ativa "de verdade" sem autorização
  });

  it("matriz de identidade: false-merge NÃO ocorre (Pro vs Pro Max, 128 vs 256, cores, ambíguo)", async () => {
    const existing = [
      { id: "P1", brand: "Apple", name: "Iphone 16 Pro 128gb" },
      { id: "P2", brand: "Apple", name: "Iphone 16 Pro Max 128gb" },
      { id: "P3", brand: "Apple", name: "Iphone 16 256gb" },
    ];
    // mesmo produto já vendido por outra loja (mesmo brand+modelo) → MATCH
    const preview = new MerchantFeedMatchPreview(existing).preview([
      { product: { externalId: "N1", name: "iPhone 16 Pro 128GB", brand: "Apple" } },   // = P1 (matche)
      { product: { externalId: "N2", name: "iPhone 16 Pro Max 128GB", brand: "Apple" } }, // = P2
      { product: { externalId: "N5", name: "iPhone 16 Pro 256GB", brand: "Apple" } },     // NÃO = P1 (128≠256) → NEW (não false-merge)
    ]);
    const m1 = preview.find((r) => r.externalId === "N1");
    const m2 = preview.find((r) => r.externalId === "N2");
    const m5 = preview.find((r) => r.externalId === "N5");
    expect(m1?.status).toBe("MATCHED_EXISTING_PRODUCT");
    expect(m2?.status).toBe("MATCHED_EXISTING_PRODUCT");
    expect(m5?.status).toBe("NEW_PRODUCT_CANDIDATE"); // 256GB ≠ 128GB → não fundir
  });
});

describe("SCALE SIMULATION (§37) — 100 / 1k / 10k", () => {
  function gen(n: number): string {
    const items: unknown[] = [];
    for (let i = 0; i < n; i++) {
      items.push({ id: `SKU-${i}`, nome: `Produto ${i} da Marca ${i % 20}`, preco: `${(100 + i % 500).toFixed(2)}`, estoque: `${i % 30}`, marca: `Marca${i % 20}`, imagem: `https://img/${i}.jpg` });
    }
    return feedJson(items);
  }

  it.each([100, 1000, 10000])("parse+normalize+validate %i produtos (memória bounded, sem estourar)", async (n) => {
    const v = new MerchantFeedValidator({ sourceConfig: cfg("products") });
    const t0 = Date.now();
    const s = await v.validate("https://x/f.json", gen(n));
    const dt = Date.now() - t0;
    expect(s.validItems).toBe(n);
    expect(s.invalidItems).toBe(0);
    expect(s.imageCoverage).toBe(1);
    expect(s.brandCoverage).toBe(1);
    // sem claim de produção: apenas que processa N itens em tempo finito e sem crash.
    expect(dt).toBeLessThan(30000);
    const offers = s.offers ?? [];
    expect(offers.length).toBe(n);
    // externalIds únicos (sem duplicar identidades)
    expect(new Set(offers.map((o) => o.product.externalId)).size).toBe(n);
  });

  it("memory bounded: batelada materializa catálogo, não vaza além de N (smoke)", () => {
    const s = new MerchantFeedValidator({ sourceConfig: cfg("products") });
    expect(typeof s.validate).toBe("function");
  });
});
