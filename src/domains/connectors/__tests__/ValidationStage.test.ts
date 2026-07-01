import { validateOffer } from "../services/stages/ValidationStage";
import { makeRawOffer } from "./helpers";

describe("validateOffer", () => {
  it("passes a valid offer with no errors", () => {
    const result = validateOffer(makeRawOffer());
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it("fails when product name is missing", () => {
    const result = validateOffer(makeRawOffer({ product: { name: "" } }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "product.name")).toBe(true);
  });

  it("fails when priceUSD is zero", () => {
    const result = validateOffer(makeRawOffer({ priceUSD: 0 }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "priceUSD")).toBe(true);
  });

  it("fails when priceUSD is negative", () => {
    const result = validateOffer(makeRawOffer({ priceUSD: -50 }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "priceUSD")).toBe(true);
  });

  it("fails when storeSlug is not a valid slug", () => {
    const result = validateOffer(makeRawOffer({ storeSlug: "Not A Slug!" }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "storeSlug")).toBe(true);
  });

  it("warns but stays valid when brand/category are missing", () => {
    const result = validateOffer(makeRawOffer({ product: { name: "Generic Product" } }));
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.field === "product.brand")).toBe(true);
    expect(result.warnings.some((w) => w.field === "product.category")).toBe(true);
  });

  it("warns but stays valid when the image URL is malformed", () => {
    const result = validateOffer(makeRawOffer({ product: { name: "Test Product", imageUrl: "not-a-url" } }));
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.field === "product.imageUrl")).toBe(true);
  });
});
