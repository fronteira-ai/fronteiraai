import { parseAmount, parseAmountUSFormat, cleanText, findFirstCurrencyAmount } from "../sdk/parsing/textParsing";

describe("textParsing", () => {
  describe("parseAmount", () => {
    it("parses a thousands-separated integer", () => {
      expect(parseAmount("91.000")).toBe(91000);
    });

    it("parses a value with both thousands separator and decimal comma", () => {
      expect(parseAmount("1.234.567,89")).toBeCloseTo(1234567.89);
    });

    it("parses a plain decimal comma value", () => {
      expect(parseAmount("13,00")).toBe(13);
    });

    it("returns 0 for unparseable input", () => {
      expect(parseAmount("abc")).toBe(0);
    });
  });

  describe("parseAmountUSFormat", () => {
    it("parses a comma-thousands, dot-decimal value (megaeletronicos.com live example)", () => {
      expect(parseAmountUSFormat("1,031.55")).toBeCloseTo(1031.55);
    });

    it("parses a plain decimal value with no thousands separator", () => {
      expect(parseAmountUSFormat("146.75")).toBeCloseTo(146.75);
    });

    it("returns 0 for unparseable input", () => {
      expect(parseAmountUSFormat("abc")).toBe(0);
    });
  });

  describe("cleanText", () => {
    it("collapses whitespace and trims", () => {
      expect(cleanText("  hello   world  \n")).toBe("hello world");
    });
  });

  describe("findFirstCurrencyAmount", () => {
    it("prioritizes USD over PYG and BRL", () => {
      const result = findFirstCurrencyAmount("Precio: Gs. 500.000 / U$ 65,00 / R$ 320,00");
      expect(result).toEqual({ amount: 65, currency: "USD" });
    });

    it("falls back to PYG when no USD is present", () => {
      const result = findFirstCurrencyAmount("Precio: Gs. 500.000");
      expect(result).toEqual({ amount: 500000, currency: "PYG" });
    });

    it("falls back to BRL when neither USD nor PYG is present", () => {
      const result = findFirstCurrencyAmount("Preço: R$ 320,50");
      expect(result).toEqual({ amount: 320.5, currency: "BRL" });
    });

    it("returns null when no recognized currency pattern is found", () => {
      expect(findFirstCurrencyAmount("no price here")).toBeNull();
    });
  });
});
