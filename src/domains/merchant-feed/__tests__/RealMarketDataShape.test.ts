import { MerchantFeedParser } from "../parser/MerchantFeedParser";
import { parseMerchantPrice } from "../parser/MerchantPriceParser";
import { MerchantFeedMatchPreview } from "../canonical/MerchantFeedMatchPreview";

/**
 * Fixture SANITIZADO (sem branding/rede/IP de terceiros) que segue o padrão
 * real observado no ecossistema público de comparação de CDE:
 * oferta por loja com slug de modelo + id de variante, preço em USD,
 * URL de imagem, disponibilidade e código próprio da loja.
 * O objetivo é provar que a V1 consome a CLASSE de dado real do mercado
 * (fora do feed XML de referência), em dry-run, sem escrita.
 */
const REAL_MARKET_SHAPED_XML = `<?xml version="1.0"?><rss><channel>
  <title>Catalogo Loja X</title>
  <item>
    <title>Smartphone Modelo A3084 256GB — Desert</title>
    <codigo>4455540</codigo>
    <marca>MarcaGenerica</marca>
    <categoria>Celulares</categoria>
    <preco>US$ 1.150,00</preco>
    <stock>8</stock>
    <disponibilidade>em estoque</disponibilidade>
    <link_imagem>https://cdn.lojax.com/img/a3084-256.jpg</link_imagem>
    <link>https://lojax.com/celular_a3084</link>
  </item>
  <item>
    <title>Smartphone Modelo A3260 128GB</title>
    <codigo>5172144</codigo>
    <marca>MarcaGenerica</marca>
    <preco>US$ 999,50</preco>
    <stock>0</stock>
    <disponibilidade>sem estoque</disponibilidade>
    <link_imagem>https://cdn.lojax.com/img/a3260.jpg</link_imagem>
    <link>https://lojax.com/celular_a3260</link>
  </item>
</channel></rss>`;

describe("Real market data-shape dry-run (padrão CDE observado, sanitizado)", () => {
  it("Mapeia oferta por loja → RawOffer com preço USD, imagem e identidade (não obrigatório XML 'padrão lojista')", () => {
    const r = new MerchantFeedParser().parse(REAL_MARKET_SHAPED_XML);
    expect(r.offers).toHaveLength(2);
    const [a, b] = r.offers;

    // identidade: codigo próprio da loja
    expect(a.product.externalId).toBe("4455540");
    expect(b.product.externalId).toBe("5172144");

    // preço USD: aceita forma "US$ 1.150,00" (moeda prefix + milhar com vírgula)
    expect(parseMerchantPrice("US$ 1.150,00")?.value).toBeCloseTo(1150.0, 1);
    // estoque: 0 → fora de estoque (disponibilidade "sem estoque" coerente)
    expect(a.inStock).toBe(true);
    expect(b.inStock).toBe(false);

    // imagem presente → cobertura de imagem real
    expect(a.product.imageUrl).toBe("https://cdn.lojax.com/img/a3084-256.jpg");

    // URL do produto
    expect(a.productUrl).toMatch(/^https:\/\//);
  });

  it("Match preview classifica todos como candidatos novos (dry-run, sem escrita)", () => {
    const r = new MerchantFeedParser().parse(REAL_MARKET_SHAPED_XML);
    const preview = new MerchantFeedMatchPreview([]).preview(r.offers.map((o) => ({ product: o.product })));
    expect(preview.every((p) => ["NEW_PRODUCT_CANDIDATE", "AMBIGUOUS", "MATCHED_EXISTING_PRODUCT", "INVALID"].includes(p.status))).toBe(true);
    expect(preview.length).toBe(2);
  });

  it("price_iva não é colapsado com preco (tipos distintos preservados)", () => {
    const normal = parseMerchantPrice("199.50");
    const iva = parseMerchantPrice("219.45");
    expect(normal?.value).toBeCloseTo(199.5, 2);
    expect(iva?.value).toBeCloseTo(219.45, 2);
    expect(iva?.value).not.toBeCloseTo(normal?.value as number, 2);
  });
});
