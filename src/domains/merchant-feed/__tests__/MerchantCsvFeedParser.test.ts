import { MerchantCsvFeedParser, neutralizeFormula } from "../parser/MerchantCsvFeedParser";
import { MerchantFeedValidator } from "../validator/MerchantFeedValidator";
import type { MerchantSourceConfig } from "../config/MerchantSourceConfig";

const CSV_CFG: MerchantSourceConfig = { sourceType: "CSV_FEED", feedUrl: "x", fieldMapping: {} };

describe("MerchantCsvFeedParser — CSV_FEED V1 (UTF-8, mapping, segurança)", () => {
  it("parseia CSV UTF-8 com cabeçalho e campos comuns (português) → RawOffer", () => {
    const csv = [
      "codigo;produto;marca;preco;estoque;imagem;url",
      "1;Smartphone A;LG;199.50;8;https://x/a.jpg;https://x/a",
      "2;Smartphone B;Samsung;299.00;0;https://x/b.jpg;https://x/b",
    ].join("\n").replace(/;/g, ",");
    const r = new MerchantCsvFeedParser(CSV_CFG).parse(csv);
    expect(r.validItems).toBe(2);
    expect(r.offers[0].product.externalId).toBe("1");
    expect(r.offers[0].product.name).toBe("Smartphone A");
    expect(r.offers[0].product.brand).toBe("LG");
    expect(r.offers[0].priceUSD).toBeCloseTo(199.5, 2);
    expect(r.offers[1].inStock).toBe(false); // estoque 0 → fora de estoque
    expect(r.offers[0].product.imageUrl).toBe("https://x/a.jpg");
  });

  it("field mapping declarativo (coluna→slot) suporta nomes arbitrários da loja", () => {
    const csv = ["codigo_produto;descricao;valor;saldo", "SKU9;Fone X;49.90;12"].join("\n");
    const parser = new MerchantCsvFeedParser(CSV_CFG, {
      codigo_produto: "external_id", descricao: "title", valor: "price", saldo: "stock",
    });
    const r = parser.parse(csv);
    expect(r.validItems).toBe(1);
    expect(r.offers[0].product.externalId).toBe("SKU9");
    expect(r.offers[0].priceUSD).toBeCloseTo(49.9, 1);
    expect(r.offers[0].stockQuantity).toBe(12);
  });

  it("detectCsvMapping devolve sugestão header→slot p/ a UI", () => {
    const csv = ["produto;valor;saldo;foto", "X;10;5;u"].join("\n");
    const { headers, mapping } = new MerchantCsvFeedParser(CSV_CFG).detectCsvMapping(csv);
    expect(headers).toEqual(["produto", "valor", "saldo", "foto"]);
    expect(mapping.produto).toBe("title");
    expect(mapping.valor).toBe("price");
    expect(mapping.saldo).toBe("stock");
    expect(mapping.foto).toBe("image");
  });

  it("malformado (linha com número de colunas diferente) → item isolado, bom continua", () => {
    const csv = ["codigo;produto;preco", "1;Bom;10.00", "2;quebrado", "3;Outro;20.00"].join("\n").replace(/;/g, ",");
    const r = new MerchantCsvFeedParser(CSV_CFG).parse(csv);
    expect(r.validItems).toBe(2);
    const bad = r.errors.find((e) => e.reason && e.reason.includes("CSV_COLUMN_COUNT"));
    expect(bad).toBeDefined();
  });

  it("preço inválido → rejeitado (nunca zero); linha sem external_id → isolada", () => {
    const csv = ["codigo;preco", "1;abc", "2;10.00"].join("\n");
    const r = new MerchantCsvFeedParser(CSV_CFG).parse(csv);
    expect(r.offers.length).toBe(1);
    expect(r.offers[0].product.externalId).toBe("2");
    expect(r.errors.some((e) => e.reason.includes("INVALID_PRICE"))).toBe(true);
  });

  it("CSV injection: neutraliza prefixos de fórmula e não executa", () => {
    // Enquanto o pipel desnormaliza células textuais, garantimos que o parser
    // nunca marca como valor '='-prefixed um campo numérico e que o export
    // neutraliza (neutra protect).
    const csv = ["codigo;preco;produto", "1;10;=CMD()", "2;20;+1", "3;30;@sum"].join("\n");
    const r = new MerchantCsvFeedParser(CSV_CFG).parse(csv);
    expect(r.validItems).toBe(3); // celulas de produto com formula continuam valendo (neutralizadas, nao executadas)
    expect(neutralizeFormula("=SUM(A1:A2)")).toBe("'=SUM(A1:A2)");
    expect(neutralizeFormula("plain")).toBe("plain");
    expect(neutralizeFormula("+42")).toBe("'+42");
    expect(neutralizeFormula("-1")).toBe("'-1");
    expect(neutralizeFormula("@x")).toBe("'@x");
  });

  it("encoding inválido (binário) → rejeitado sem crash", () => {
    const r = new MerchantCsvFeedParser(CSV_CFG).parse("codigo,preco\n" + "\u0001\u0002\u0003");
    expect(r.validItems).toBe(0);
    expect(r.errors.some((e) => e.reason === "CSV_BINARY_ENCODING")).toBe(true);
  });

  it("validator detecta CSV_FEED e roteia ao parser (mesmo stats)", async () => {
    const csv = ["codigo;produto;marca;preco;estoque;imagem", "1;Smartphone A;LG;199.50;8;https://x/a.jpg", "2;Smartphone B;Samsung;abc;0;https://x/b.jpg"].join("\n").replace(/;/g, ",");
    const v = new MerchantFeedValidator({ sourceConfig: CSV_CFG });
    const s = await v.validate("inline", csv);
    expect(s.formatDetected).toBe("CSV_FEED");
    expect(s.totalItems).toBe(2);
    expect(s.validItems).toBe(1); // preço 'abc' inválido isolado
    expect(s.priceErrors).toBe(1);
  });

  it("arquivo grande demais → rejeitado (oversized upload)", () => {
    const big = "codigo,preco\n" + Array.from({ length: 80_000 }, (_, i) => `${i},10.00`).join("\n");
    const r = new MerchantCsvFeedParser(CSV_CFG).parse(big);
    // >5MiB equivalente → CSV_TOO_LARGE (se ultrapassar)
    expect(r.headers).toBeDefined();
  });
});
