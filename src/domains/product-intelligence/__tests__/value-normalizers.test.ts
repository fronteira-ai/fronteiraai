import {
  normalizeCapacityToGb,
  normalizeVoltage,
  normalizePowerW,
  normalizeEan,
  normalizeColorToken,
  normalizeBundleIncludes,
} from "../extraction/value-normalizers";

describe("normalizeCapacityToGb", () => {
  it("normalizes the 3 GB spellings from the mandate example to the same value", () => {
    expect(normalizeCapacityToGb("512GB")).toBe(512);
    expect(normalizeCapacityToGb("512 GB")).toBe(512);
    expect(normalizeCapacityToGb("512 G")).toBe(512);
  });

  it("converts TB to GB (real sample: '1TB')", () => {
    expect(normalizeCapacityToGb("1TB")).toBe(1024);
  });

  it("returns null when no capacity pattern is found", () => {
    expect(normalizeCapacityToGb("Compatível com cartão de memória SD, SDHC e SDXC")).toBeNull();
  });
});

describe("normalizeVoltage", () => {
  it("extracts a single voltage (real sample: '220V')", () => {
    expect(normalizeVoltage("220V")).toBe("220V");
  });

  it("extracts a bivolt range without inventing the word 'bivolt' (real sample: '110 - 220V ~ 50/60 Hz')", () => {
    expect(normalizeVoltage("110 - 220V ~ 50/60 Hz")).toBe("110V-220V");
  });

  it("returns null when no voltage number is present", () => {
    expect(normalizeVoltage("Através da entrada USB-C")).toBeNull();
  });
});

describe("normalizePowerW", () => {
  it("normalizes real watt spellings to the same integer", () => {
    expect(normalizePowerW("900 watts")).toBe(900);
    expect(normalizePowerW("1600W")).toBe(1600);
  });

  it("returns null for non-power text", () => {
    expect(normalizePowerW("Requer 4 pilhas AA")).toBeNull();
  });
});

describe("normalizeEan", () => {
  it("accepts a real 13-digit EAN sample", () => {
    expect(normalizeEan("8801046989869")).toBe("8801046989869");
  });

  it("rejects a value that isn't exactly 13 digits", () => {
    expect(normalizeEan("12345")).toBeNull();
    expect(normalizeEan("A3257")).toBeNull();
  });
});

describe("normalizeColorToken", () => {
  it("normalizes case/diacritics/whitespace but deliberately preserves word order", () => {
    expect(normalizeColorToken("Titânio Preto")).toBe("TITANIO_PRETO");
    expect(normalizeColorToken("Titanium Black")).toBe("TITANIUM_BLACK");
    // "Black Titanium" and "Titanium Black" are NOT collapsed to the same
    // token — reordering words would be inventing an equivalence this
    // function was never given evidence for (see header comment).
    expect(normalizeColorToken("Black Titanium")).not.toBe(normalizeColorToken("Titanium Black"));
  });

  it("is case and diacritic insensitive for real samples", () => {
    expect(normalizeColorToken("Preto")).toBe("PRETO");
    expect(normalizeColorToken("PRETO")).toBe("PRETO");
    expect(normalizeColorToken("preto")).toBe("PRETO");
  });

  it("refuses to guess a compound multi-part color (real sample)", () => {
    expect(normalizeColorToken("Relógio: Red Pink - Pulseira: Mango")).toBeNull();
  });
});

describe("normalizeBundleIncludes", () => {
  it("splits a real INCLUI value into trimmed items", () => {
    expect(normalizeBundleIncludes("Cabo USB-C - Manual")).toEqual(["Cabo USB-C", "Manual"]);
  });

  it("splits a real Incluye value using | as delimiter", () => {
    expect(normalizeBundleIncludes("Cable de audio Jack 3.5mm | AirTag x4")).toEqual(["Cable de audio Jack 3.5mm", "AirTag x4"]);
  });
});
