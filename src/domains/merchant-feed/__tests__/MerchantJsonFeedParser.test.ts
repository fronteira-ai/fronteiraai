import { MerchantJsonFeedParser } from "../parser/MerchantJsonFeedParser";
import { validateMerchantSourceConfig, resolvePath, extractItems, normalizeFieldMapping, DEFAULT_FIELD_MAPPING } from "../config/MerchantSourceConfig";
import type { MerchantSourceConfig } from "../config/MerchantSourceConfig";

/** Feed onde o campo já usa os nomes de referência (como o XML). */
const REF_JSON = {
  products: [
    { codigo: "1", title: "Smartphone A", preco: "199.50", estoque: "8", marca: "LG", link_imagem: "https://x/img1.jpg", link: "https://x/p1" },
    { codigo: "2", title: "Smartphone B", preco: "abc", estoque: "0", link_imagem: "https://x/img2.jpg" },
  ],
};

const REF_CFG: MerchantSourceConfig = { sourceType: "JSON_FEED", feedUrl: "https://x/f.json", rootPath: "products", fieldMapping: DEFAULT_FIELD_MAPPING };

describe("MerchantJsonFeedParser — JSON_FEED", () => {
  it("array raiz e objeto com lista (rootPath) produzem RawOffer no contrato XML", () => {
    const array = JSON.stringify([REF_JSON.products[0]]);
    const r1 = new MerchantJsonFeedParser({ ...REF_CFG, rootPath: "$", fieldMapping: DEFAULT_FIELD_MAPPING }).parse(array);
    expect(r1.validItems).toBe(1);
    expect(r1.offers[0].product.externalId).toBe("1");
    expect(r1.offers[0].priceUSD).toBeCloseTo(199.5, 2);

    const r2 = new MerchantJsonFeedParser(REF_CFG).parse(JSON.stringify(REF_JSON));
    expect(r2.totalItems).toBe(2);
    expect(r2.validItems).toBe(1);
    expect(r2.invalidItems).toBe(1);
    expect(r2.errors[0].reason).toContain("INVALID_PRICE");
  });

  it("suporta field mapping alternativo (id/sku/variant_id, product.name) e nested paths", () => {
    const cfg: MerchantSourceConfig = {
      sourceType: "JSON_FEED", feedUrl: "https://x/f.json", rootPath: "data.items",
      fieldMapping: { external_id: "product.sku", title: "product.title_es", price: "pricing.usd", stock: "inventory.quantity", availability: "availability", image: "images.primary.url", product_url: "links.store" },
    };
    const json = JSON.stringify({ data: { items: [
      { product: { sku: "SKU1", title_es: "Fone X" }, pricing: { usd: "49.90" }, inventory: { quantity: 3 }, availability: "em estoque", images: { primary: { url: "https://img/fone.jpg" } }, links: { store: "https://x/fone" } },
    ] } });
    const r = new MerchantJsonFeedParser(cfg).parse(json);
    expect(r.validItems).toBe(1);
    const o = r.offers[0];
    expect(o.product.externalId).toBe("SKU1");
    expect(o.product.name).toBe("Fone X");
    expect(o.priceUSD).toBeCloseTo(49.9, 1);
    expect(o.stockQuantity).toBe(3);
    expect(o.inStock).toBe(true);
    expect(o.product.imageUrl).toBe("https://img/fone.jpg");
    expect(o.productUrl).toBe("https://x/fone");
  });

  it("sem external_id → item isolado (MISSING_EXTERNAL_ID), bom não derruba", () => {
    const cfg: MerchantSourceConfig = { sourceType: "JSON_FEED", feedUrl: "https://x/f.json", rootPath: "$", fieldMapping: { external_id: "id", title: "name", price: "price" } };
    const json = JSON.stringify([{ name: "Sem ID", price: "10.00" }, { id: "ok", name: "Com ID", price: "10.00" }]);
    const r = new MerchantJsonFeedParser(cfg).parse(json);
    expect(r.offers.length).toBe(1);
    expect(r.offers[0].product.externalId).toBe("ok");
    expect(r.invalidItems).toBe(1);
    expect(r.errors[0].reason).toBe("MISSING_EXTERNAL_ID");
  });

  it("estoque: 0 → fora de estoque; UNKNOWN ≠ AVAILABLE (sem inventar)", () => {
    const cfg: MerchantSourceConfig = { sourceType: "JSON_FEED", feedUrl: "https://x/f.json", rootPath: "$", fieldMapping: { external_id: "id", price: "price", stock: "stock" } };
    const r = new MerchantJsonFeedParser(cfg).parse(JSON.stringify([
      { id: "a", price: "10.00", stock: "0" },
      { id: "b", price: "10.00" }, // sem estoque → UNKNOWN (undefined)
    ]));
    expect(r.offers[0].inStock).toBe(false);
    expect(r.offers[1].inStock).toBeUndefined();
  });

  it("currency forçada (force_usd) e moeda do feed em forma US$ 1.150,00", () => {
    const cfg: MerchantSourceConfig = { sourceType: "JSON_FEED", feedUrl: "https://x/f.json", rootPath: "$", currency: "force_usd", fieldMapping: { external_id: "id", price: "price" } };
    const r = new MerchantJsonFeedParser(cfg).parse(JSON.stringify([{ id: "a", price: "1150" }]));
    expect(r.offers[0].currency).toBe("USD");

    const cfg2: MerchantSourceConfig = { sourceType: "JSON_FEED", feedUrl: "https://x/f.json", rootPath: "$", fieldMapping: { external_id: "id", price: "preco" } };
    const r2 = new MerchantJsonFeedParser(cfg2).parse(JSON.stringify([{ id: "a", preco: "US$ 1.150,00" }]));
    expect(r2.offers[0].priceUSD).toBeCloseTo(1150, 1);
    expect(r2.offers[0].currency).toBe("USD");
  });

  it("JSON malformado → erro JSON_PARSE_ERROR sem tratar como 0 ofertas falsas de preço", () => {
    const cfg: MerchantSourceConfig = { sourceType: "JSON_FEED", feedUrl: "https://x/f.json", rootPath: "$", fieldMapping: { external_id: "id", price: "price" } };
    const r = new MerchantJsonFeedParser(cfg).parse("{ nope ");
    expect(r.validItems).toBe(0);
    expect(r.errors[0].reason).toContain("JSON_PARSE_ERROR");
  });
});

describe("MerchantSourceConfig — validação declarativa (sem eval)", () => {
  it("rejeita config inválida antes da ativação", () => {
    expect(() => validateMerchantSourceConfig({ sourceType: "JSON_FEED", feedUrl: "x", fieldMapping: {} } as MerchantSourceConfig)).toThrow();
    expect(() => validateMerchantSourceConfig({ sourceType: "JSON_FEED", feedUrl: "x", fieldMapping: { external_id: "id", price: "p", evil: "user()" } as never })).toThrow(/CONFIG_INVALID/);
    expect(() => validateMerchantSourceConfig({ sourceType: "JSON_FEED", feedUrl: "x", currency: "force_brl" as never, fieldMapping: { external_id: "id", price: "p" } })).toThrow(/moeda/);
  });

  it("aceita config válida de linha de comando (declarativa)", () => {
    expect(() => validateMerchantSourceConfig({ sourceType: "JSON_FEED", feedUrl: "https://x/f.json", rootPath: "products", fieldMapping: { external_id: "product.codigo", price: "preco", stock: "estoque" } })).not.toThrow();
  });

  it("normalizeFieldMapping resolve aliases comuns (id/sku/codigo → external_id, name → title, preco → price)", () => {
    const m = normalizeFieldMapping({ product_id: "id", name: "nome", preco: "price" } as never);
    expect(m.external_id).toBe("id");
    expect(m.title).toBe("nome");
    expect(m.price).toBe("price");
  });

  it("resolvePath lê nested paths sem executar código", () => {
    expect(resolvePath({ product: { codigo: "X" } }, "product.codigo")).toBe("X");
    expect(resolvePath({ a: { b: { c: 1 } } }, "a.b.c")).toBe(1);
    expect(resolvePath({ a: 1 }, "a.constructor")).toBeUndefined();
    expect(resolvePath({}, "product")).toBeUndefined();
  });

  it("extractItems: array raiz e objeto com lista", () => {
    expect(extractItems([{ a: 1 }], "$")).toHaveLength(1);
    expect(extractItems({ products: [{ a: 1 }] }, "products")).toHaveLength(1);
    expect(extractItems({ data: { items: [1, 2] } }, "data.items")).toHaveLength(2);
  });
});
