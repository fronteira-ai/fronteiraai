import { formatOfferCondition } from "../offerPresentation";

describe("formatOfferCondition", () => {
  it("returns null for null or empty condition", () => {
    expect(formatOfferCondition(null)).toBeNull();
    expect(formatOfferCondition("")).toBeNull();
    expect(formatOfferCondition("   ")).toBeNull();
  });

  it("translates the three known admin-form values", () => {
    expect(formatOfferCondition("new")).toBe("Novo");
    expect(formatOfferCondition("used")).toBe("Usado");
    expect(formatOfferCondition("refurbished")).toBe("Recondicionado");
  });

  it("is case-insensitive against known values", () => {
    expect(formatOfferCondition("New")).toBe("Novo");
  });

  it("shows an unrecognized merchant-supplied value verbatim rather than guessing", () => {
    expect(formatOfferCondition("Seminovo")).toBe("Seminovo");
  });
});
