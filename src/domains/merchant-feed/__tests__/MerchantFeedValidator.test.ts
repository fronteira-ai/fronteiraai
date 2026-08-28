import { MerchantFeedValidator } from "../validator/MerchantFeedValidator";
import { assertSafeFeedUrl } from "../fetcher/SecureFeedFetcher";
import type { FeedFetchResult } from "../fetcher/SecureFeedFetcher";

const GOOD_XML = `<?xml version="1.0"?><rss><channel><item><codigo>1</codigo><preco>10.00</preco><title>Produto A</title><marca>X</marca><link_imagem>https://x/img.jpg</link_imagem></item><item><codigo>2</codigo><preco>abc</preco><title>Produto B</title></item></channel></rss>`;

/** Constrói um validator com fetch fake tipado (FeedFetchResult). */
function makeValidator(result: Partial<FeedFetchResult>) {
  const full: FeedFetchResult = {
    ok: true,
    status: 200,
    bytes: 0,
    body: GOOD_XML,
    notModified: false,
    finalUrl: "https://x",
    etag: null,
    lastModified: null,
    ...result,
  };
  return new MerchantFeedValidator({
    fetch: { fetch: async () => full },
  });
}

describe("MerchantFeedValidator — stats sem ingestão", () => {
  it("valida feed bem-formado e reporta stats (sem prejuízo de preço/estoque)", async () => {
    const v = makeValidator({ body: GOOD_XML, bytes: GOOD_XML.length });
    const s = await v.validate("https://x/feed.xml");
    expect(s.fetchStatus).toBe("OK");
    expect(s.formatDetected).toBe("XML_FEED");
    expect(s.totalItems).toBe(2);
    expect(s.validItems).toBe(1);
    expect(s.invalidItems).toBe(1);
    expect(s.priceErrors).toBe(1);
    expect(s.externalIdCoverage).toBe(1);
    // só o item válido entra como oferta; ele tem marca e imagem → cobertura 1
    expect(s.brandCoverage).toBe(1);
    expect(s.imageCoverage).toBe(1);
  });

  it("distingue 304 (no-change) de erro", async () => {
    const v = makeValidator({ ok: false, status: 304, notModified: true, body: "" });
    const s = await v.validate("https://x/feed.xml");
    expect(s.fetchStatus).toBe("NOT_MODIFIED");
    expect(s.httpStatus).toBe(304);
    expect(s.notModified).toBe(true);
  });

  it("feed indisponível → FAILED (não assume loop fora de estoque)", async () => {
    const v = makeValidator({ ok: false, status: 503, error: "HTTP_503", body: "" });
    const s = await v.validate("https://x/feed.xml");
    expect(s.fetchStatus).toBe("FAILED");
    expect(s.httpStatus).toBe(503);
  });
});

describe("SecureFeedFetcher — SSRF e rede (regras de segurança)", () => {
  it("bloqueia protocolo não-HTTP", () => {
    expect(() => assertSafeFeedUrl("file:///etc/passwd")).toThrow(/PROTOCOL/);
    expect(() => assertSafeFeedUrl("ftp://x/y")).toThrow(/PROTOCOL/);
  });
  it("bloqueia localhost / redes privadas / metadata", () => {
    expect(() => assertSafeFeedUrl("http://localhost/feed")).toThrow(/BLOCKED/);
    expect(() => assertSafeFeedUrl("http://127.0.0.1/feed")).toThrow(/BLOCKED|PRIVATE/);
    expect(() => assertSafeFeedUrl("http://10.0.0.1/feed")).toThrow(/PRIVATE/);
    expect(() => assertSafeFeedUrl("http://192.168.1.1/feed")).toThrow(/PRIVATE/);
    expect(() => assertSafeFeedUrl("http://169.254.169.254/latest/meta-data/")).toThrow(/BLOCKED|PRIVATE/);
  });
  it("aceita URL HTTP/HTTPS pública", () => {
    expect(() => assertSafeFeedUrl("https://cdn.example.com/feed.xml")).not.toThrow();
    expect(() => assertSafeFeedUrl("http://example.com/feed.xml")).not.toThrow();
  });
});
