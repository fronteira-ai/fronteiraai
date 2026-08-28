import { parseMerchantPrice } from "../parser/MerchantPriceParser";

describe("MerchantPriceParser — formatos legítimos de preço", () => {
  it.each<[string, number, string?]>([
    ["199.50", 199.5, undefined],
    ["1,199.50", 1199.5, undefined],
    ["1199.50", 1199.5, undefined],
    ["199.50 USD", 199.5, "USD"],
    ["USD 199.50", 199.5, "USD"],
    ["1.199,50", 1199.5, undefined],
    ["1.006,5", 1006.5, undefined],
    ["0", 0, undefined],
    ["219.45 USD", 219.45, "USD"],
  ])("parse %s → %s%s", (raw, value, cur) => {
    const r = parseMerchantPrice(raw);
    expect(r?.value).toBeCloseTo(value, 2);
    expect(r?.currency).toBe(cur ?? undefined);
  });

  it("rejeita preços inválidos (NUNCA zero), não os converte", () => {
    for (const bad of ["", "abc", "   ", "-5", "12a.5", "USD", "..", NaN as unknown as string]) {
      expect(parseMerchantPrice(bad)).toBeNull();
    }
    expect(parseMerchantPrice(undefined)).toBeNull();
    expect(parseMerchantPrice(null)).toBeNull();
  });
});
