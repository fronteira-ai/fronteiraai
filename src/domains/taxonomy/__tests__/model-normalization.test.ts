import { normalizeAppleModelToken, KNOWN_MODEL_ALIASES } from "../data/model-normalization";

describe("normalizeAppleModelToken", () => {
  it("normalizes real iPhone name variants (production text) to the same canonical model", () => {
    expect(normalizeAppleModelToken("iPhone 16 Pro 256GB Titânio Preto")).toBe("IPHONE_16_PRO");
    expect(normalizeAppleModelToken("Apple iPhone 17 Pro Max A3257 eSIM 1TB")).toBe("IPHONE_17_PRO_MAX");
    expect(normalizeAppleModelToken("Apple iPhone 17e A3575 LL 256GB")).toBe("IPHONE_17E");
  });

  it("distinguishes iPhone 17 from iPhone 17 Pro Max — never collapses different models", () => {
    const plain = normalizeAppleModelToken("Apple iPhone 17 A3519 eSIM 256GB");
    const proMax = normalizeAppleModelToken("Apple iPhone 17 Pro Max A3257 eSIM 256GB");
    expect(plain).toBe("IPHONE_17");
    expect(proMax).toBe("IPHONE_17_PRO_MAX");
    expect(plain).not.toBe(proMax);
  });

  it("normalizes MacBook Air chip variants (production text)", () => {
    expect(normalizeAppleModelToken('MacBook Air M3 13" 256GB')).toBe("MACBOOK_AIR_M3");
  });

  it("returns null for a non-Apple / unrecognized name", () => {
    expect(normalizeAppleModelToken("Speaker JBL Flip 7 Bluetooth")).toBeNull();
  });

  it("every seeded KNOWN_MODEL_ALIASES entry is reproducible from its raw token", () => {
    for (const entry of KNOWN_MODEL_ALIASES) {
      if (entry.brandSlug !== "apple") continue;
      const result = normalizeAppleModelToken(entry.rawToken);
      expect(result).toBe(entry.canonicalModel);
    }
  });
});
