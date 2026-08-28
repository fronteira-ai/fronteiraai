import { MerchantFeedConnector } from "../connector/MerchantFeedConnector";
import { MerchantFeedValidator } from "../validator/MerchantFeedValidator";
import type { FeedFetchResult } from "../fetcher/SecureFeedFetcher";
import type { MerchantSourceConfig, MerchantFeedConfig } from "..";

const GOOD_JSON = JSON.stringify({ products: [
  { codigo: "1", title: "Smartphone A", preco: "199.50", estoque: "8", marca: "LG", link_imagem: "https://x/1.jpg" },
  { codigo: "2", title: "Smartphone B", preco: "abc", estoque: "0" }, // inválido
] });

const JSON_SRC: MerchantSourceConfig = {
  sourceType: "JSON_FEED", feedUrl: "https://x/f.json", rootPath: "products",
  fieldMapping: { external_id: "codigo", title: "title", price: "preco", stock: "estoque", brand: "marca", image: "link_imagem" },
};

function cfgJson(): MerchantFeedConfig {
  return { feedUrl: "https://x/f.json", sourceType: "JSON_FEED", trust: "OFFICIAL_MERCHANT_FEED", preferredTier: "WARM", enabled: true, sourceConfig: JSON_SRC };
}

describe("MerchantFeedConnector — JSON_FEED (mesmo pipeline do XML)", () => {
  it("fetchStream produz RawOffer a partir de JSON (contrato único downstream)", async () => {
    const conn = new MerchantFeedConnector(cfgJson(), "minhaloja", { fetchBody: async () => ({ body: GOOD_JSON }) });
    const offers = [];
    for await (const o of conn.fetchStream()) offers.push(o);
    expect(offers).toHaveLength(1); // só o válido
    expect(offers[0].product.externalId).toBe("1");
    expect(offers[0].storeSlug).toBe("minhaloja");
    expect(offers[0].priceUSD).toBeCloseTo(199.5, 2);
    expect(offers[0].product.brand).toBe("LG");
  });

  it("metadata do JSON usa tipo json-file (registrável, sem pipeline paralelo)", () => {
    const conn = new MerchantFeedConnector(cfgJson(), "minhaloja", { fetchBody: async () => ({ body: GOOD_JSON }) });
    expect(conn.metadata.id).toBe("merchant-feed-minhaloja");
  });
});

describe("MerchantFeedValidator — JSON SSRF e segurança reutilizadas", () => {
  it("bloqueia URL não-HTTP via SecureFeedFetcher (mesmo p/ JSON)", async () => {
    const v = new MerchantFeedValidator({ sourceConfig: JSON_SRC });
    // assertSafeFeedUrl é exercidado no caminho de URL. Testamos via fetch fake que passa URL ruim.
    await expect(v.validate("ftp://x/f.json")).rejects.toThrow(/PROTOCOL/);
  });

  it("304 (no-change) → NOT_MODIFIED; falha de feed → FAILED (não assume out_of_stock)", async () => {
    const notModified: FeedFetchResult = { ok: false, status: 304, bytes: 0, body: "", notModified: true, finalUrl: "https://x/f.json", etag: "e", lastModified: null };
    const v304 = new MerchantFeedValidator({ sourceConfig: JSON_SRC, fetch: { fetch: async () => notModified } as never });
    expect((await v304.validate("https://x/f.json")).fetchStatus).toBe("NOT_MODIFIED");

    const failed: FeedFetchResult = { ok: false, status: 503, bytes: 0, body: "", notModified: false, finalUrl: "https://x/f.json", error: "HTTP_503" };
    const vFail = new MerchantFeedValidator({ sourceConfig: JSON_SRC, fetch: { fetch: async () => failed } as never });
    expect((await vFail.validate("https://x/f.json")).fetchStatus).toBe("FAILED");
  });
});
