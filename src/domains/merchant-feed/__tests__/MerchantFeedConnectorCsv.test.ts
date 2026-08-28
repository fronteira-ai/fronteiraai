import { MerchantFeedConnector } from "../connector/MerchantFeedConnector";
import type { MerchantSourceConfig, MerchantFeedConfig } from "..";

const CSV_TEXT = "codigo,produto,marca,preco,estoque,imagem,url\n1,Smartphone A,LG,199.50,8,https://x/a.jpg,https://x/a\n2,Smartphone B,Samsung,abc,0,https://x/b.jpg,https://x/b";

const CSV_SRC: MerchantSourceConfig = { sourceType: "CSV_FEED", feedUrl: "https://x/f.csv", fieldMapping: {} };

function cfgCsv(): MerchantFeedConfig {
  return { feedUrl: "https://x/f.csv", sourceType: "CSV_FEED", trust: "OFFICIAL_MERCHANT_FEED", preferredTier: "WARM", enabled: true, sourceConfig: CSV_SRC };
}

describe("MerchantFeedConnector — CSV_FEED (mesmo pipeline do XML/JSON)", () => {
  it("fetchStream produz RawOffer de CSV (contrato único downstream)", async () => {
    const conn = new MerchantFeedConnector(cfgCsv(), "minhaloja", { fetchBody: async () => ({ body: CSV_TEXT }) });
    const offers = [];
    for await (const o of conn.fetchStream()) offers.push(o);
    expect(offers).toHaveLength(1); // preço 'abc' inválido isolado
    expect(offers[0].product.externalId).toBe("1");
    expect(offers[0].storeSlug).toBe("minhaloja");
    expect(offers[0].product.brand).toBe("LG");
    expect(offers[0].priceUSD).toBeCloseTo(199.5, 2);
    expect(offers[0].product.imageUrl).toBe("https://x/a.jpg");
  });
});
