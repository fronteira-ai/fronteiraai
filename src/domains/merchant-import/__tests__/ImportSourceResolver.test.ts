import { SourceParserResolver } from "../ImportSourceResolver";

const CSV = "codigo,produto,marca,preco,estoque,imagem\n1,Produto Alfa,LG,199.50,8,https://x/a.jpg\n2,Produto Beta,Samsung,abc,0,https://x/b.jpg";
const XML = `<?xml version="1.0"?><rss><channel><item><codigo>1</codigo><preco>50.00</preco><title>Produto Alfa</title><marca>LG</marca></item></channel></rss>`;
const JSON_ROOT = JSON.stringify({ products: [{ id: "1", nome: "Produto Alfa", preco: "50.00", estoque: "8", marca: "LG" }] });

describe("SourceParserResolver — CSV/XML/JSON reusam Merchant Feed (sem 2º pipeline)", () => {
  const r = new SourceParserResolver();
  it("CSV → RawOffer (via MerchantCsvFeedParser)", () => {
    const offers = r.resolveOffers(CSV, "CSV", { codigo: "external_id", produto: "title", marca: "brand", preco: "price", estoque: "stock", imagem: "image" }, "products");
    expect(offers.length).toBe(1); // preço 'abc' inválido isolado
    expect(offers[0].product.externalId).toBe("1");
    expect(offers[0].priceUSD).toBeCloseTo(199.5, 2);
  });
  it("XML → RawOffer (via MerchantFeedParser)", () => {
    const offers = r.resolveOffers(XML, "XML", {}, "products");
    expect(offers.length).toBe(1);
    expect(offers[0].product.externalId).toBe("1");
    expect(offers[0].product.name).toBe("Produto Alfa");
  });
  it("JSON → RawOffer (via MerchantJsonFeedParser)", () => {
    const offers = r.resolveOffers(JSON_ROOT, "JSON", { id: "external_id", nome: "title", preco: "price", estoque: "stock", marca: "brand" }, "products");
    expect(offers.length).toBe(1);
    expect(offers[0].product.externalId).toBe("1");
    expect(offers[0].product.brand).toBe("LG");
  });
});
