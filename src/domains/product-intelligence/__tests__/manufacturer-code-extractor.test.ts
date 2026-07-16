import { extractManufacturerCode } from "../extraction/manufacturer-code-extractor";

describe("extractManufacturerCode", () => {
  it("extracts a real Apple model code from a real product name", () => {
    const result = extractManufacturerCode("Apple iPhone 17 Pro Max A3257 eSIM 1TB 12GB RAM de 6.9\" 48+48+48MP 18MP - Silver");
    expect(result?.code).toBe("A3257");
  });

  it("extracts a real Keepdata code from a real product name", () => {
    const result = extractManufacturerCode("Memória RAM para PC 8GB Keepdata KD32N22 8G DDR4 de 3200MHz - Verde");
    expect(result?.candidates).toContain("KD32N22");
  });

  it("extracts a real Cuisinart hyphenated code", () => {
    const result = extractManufacturerCode("Sorveteira Cuisinart ICE-21RP1 1.5L Vermelho 110V");
    expect(result?.candidates).toContain("ICE-21RP1");
  });

  it("does not treat known non-code tokens (4K, 5G, connectivity standards) as a manufacturer code", () => {
    const result = extractManufacturerCode("Smart TV 4K 55 polegadas Wi-Fi");
    expect(result).toBeNull();
  });

  it("returns null for a name with no alphanumeric code-shaped token", () => {
    expect(extractManufacturerCode("Perfume Feminino Floral 100ml")).toBeNull();
  });

  it("extracts a real 19-char Razer code without truncating it (found via spot-check, scripts/kappa3-code-spotcheck.ts)", () => {
    const result = extractManufacturerCode("Mouse Gamer Razer Basilisk V3 X HyperSpeed 18.000 DPI RGB Wireless – Preto RZ01-04870100-R3U1");
    expect(result?.candidates).toContain("RZ01-04870100-R3U1");
  });
});
