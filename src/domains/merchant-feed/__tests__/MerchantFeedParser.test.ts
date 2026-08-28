import { readFileSync } from "fs";
import { MerchantFeedParser } from "../parser/MerchantFeedParser";
import { normalizeTitleForMatch } from "../canonical/MerchantFeedMatchPreview";

const REFERENCE = readFileSync("docs/operations/MERCHANT_FEED_EXAMPLE.xml", "utf8");

describe("MerchantFeedParser — REFERENCE XML feed (V1)", () => {
  it("parseia o feed de referência (codigo=123456, price 199.50 USD, stock 109, LG, em estoque)", () => {
    const r = new MerchantFeedParser().parse(REFERENCE);
    expect(r.totalItems).toBe(4);
    expect(r.validItems).toBe(4);
    expect(r.invalidItems).toBe(0);

    const lg = r.offers.find((o) => o.product.externalId === "123456")!;
    expect(lg).toBeDefined();
    expect(lg.product.name).toContain("LG"); // title_es preferido
    expect(lg.priceUSD).toBeCloseTo(199.5, 2);
    expect(lg.currency).toBe("USD");
    expect(lg.stockQuantity).toBe(109);
    expect(lg.inStock).toBe(true);
    expect(lg.product.brand).toBe("LG");
    expect(lg.product.imageUrl).toContain("http");
    expect(lg.oldPriceUSD).toBeCloseTo(249.9, 2);
    expect(lg.productUrl).toContain("buy/123456");
  });

  it("parseia preço com vírgula de milhar (1,199.50 → 1199.50)", () => {
    const r = new MerchantFeedParser().parse(REFERENCE);
    const tv = r.offers.find((o) => o.product.externalId === "778899")!;
    expect(tv.priceUSD).toBeCloseTo(1199.5, 2);
  });

  it("mapeia sem estoque → in_stock false (visor 'Sem estoque'), stock 0", () => {
    const r = new MerchantFeedParser().parse(REFERENCE);
    const aur = r.offers.find((o) => o.product.externalId === "102030")!;
    expect(aur.inStock).toBe(false);
    expect(aur.stockQuantity).toBe(0);
  });

  it("isola item malformado sem derrubar o feed inteiro", () => {
    const xml = `<?xml version="1.0"?><rss><channel>
      <item><codigo>OK1</codigo><preco>10.00</preco><title>Bom</title><marca>A</marca></item>
      <item><codigo>BAD</codigo><preco><bogus>not a price</bogus></preco><title>Quebrado</title></item>
      <item><codigo>OK2</codigo><preco>20.00</preco><title>Também</title><marca>A</marca></item>
    </channel></rss>`;
    const r = new MerchantFeedParser().parse(xml);
    expect(r.validItems).toBe(2);
    expect(r.offers.map((o) => o.product.externalId)).toEqual(["OK1", "OK2"]);
    expect(r.invalidItems).toBeGreaterThanOrEqual(1);
  });

  it("rejeita item sem codigo (MISSING_CODIGO)", () => {
    const xml = `<?xml version="1.0"?><rss><channel><item><preco>10.00</preco><title>Sem codigo</title></item></channel></rss>`;
    const r = new MerchantFeedParser().parse(xml);
    expect(r.validItems).toBe(0);
    expect(r.errors.some((e) => e.reason === "MISSING_CODIGO")).toBe(true);
  });

  it("rejeita preço inválido (INVALID_PRICE), não vira zero", () => {
    const xml = `<?xml version="1.0"?><rss><channel><item><codigo>X1</codigo><preco>abc</preco><title>T</title></item></channel></rss>`;
    const r = new MerchantFeedParser().parse(xml);
    expect(r.validItems).toBe(0);
    expect(r.errors.some((e) => e.reason.startsWith("INVALID_PRICE"))).toBe(true);
  });

  it("remove price_iva corretamente quando presente", () => {
    const xml = `<?xml version="1.0"?><rss><channel><item><codigo>C1</codigo><preco>199.50 USD</preco><price_iva>219.45 USD</price_iva><title>x</title></item></channel></rss>`;
    const r = new MerchantFeedParser().parse(xml);
    expect(r.offers[0].priceUSD).toBeCloseTo(199.5, 2);
  });

  it("entende UTF-8 e acentos pt/es", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?><rss><channel><item><codigo>8</codigo><preco>5.00</preco><title>Televisão 4K — muy êxito</title><description>á é í ó ú ñ</description></item></channel></rss>`;
    const r = new MerchantFeedParser().parse(xml);
    expect(r.validItems).toBe(1);
    expect(r.offers[0].product.name).toContain("Televisão");
  });
});

describe("MerchantFeedParser — segurança e limites", () => {
  it("não explode em XML malformado grosseiramente (bounded)", () => {
    const r = new MerchantFeedParser().parse("<rss><channel><item>...");
    // não deve lançar; retorna 0+ itens com erro registrado (sem derrubar)
    expect(r).toBeDefined();
    expect(Array.isArray(r.offers)).toBe(true);
  });

  it("normalizes títulos p/ match (case, acento, pontuação)", () => {
    expect(normalizeTitleForMatch("Lavarropas LG 11kg - Blanco")).toBe("lavarropas lg 11kg blanco");
    expect(normalizeTitleForMatch("Lavarropas  LG  11kg")).toBe("lavarropas lg 11kg");
  });
});

// Idempotência / mudança de preço: o PARSE é determinístico — mesmas entradas
// produzem mesmos RawOffer (externalId estável → upsert no lugar em vez de novo).
describe("MerchantFeedParser — idempotência e estabilidade de identidade", () => {
  it("mesmo XML parseado duas vezes → mesma identidade externalId (não duplica)", () => {
    const a = new MerchantFeedParser().parse(REFERENCE);
    const b = new MerchantFeedParser().parse(REFERENCE);
    expect(a.offers.map((o) => o.product.externalId)).toEqual(b.offers.map((o) => o.product.externalId));
    expect(a.offers.length).toBe(b.offers.length);
  });

  it("mudança de preço no mesmo codigo → mesmo externalId, priceUSB atualizado (upsert)", () => {
    const base = new MerchantFeedParser().parse(REFERENCE).offers.find((o) => o.product.externalId === "123456")!;
    const changed = `<?xml version="1.0"?><rss><channel><item><codigo>123456</codigo><preco>249.90 USD</preco><title>Lavarropas LG 11kg</title><marca>LG</marca></item></channel></rss>`;
    const upd = new MerchantFeedParser().parse(changed).offers[0];
    expect(upd.product.externalId).toBe(base.product.externalId); // mesma identidade
    expect(upd.priceUSD).toBeCloseTo(249.9, 2); // preço atualizado
  });
});
