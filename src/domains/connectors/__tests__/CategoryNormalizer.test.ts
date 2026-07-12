import { normalizeCategoryName } from "../normalization/CategoryNormalizer";

describe("normalizeCategoryName", () => {
  it("maps known celular/smartphone synonyms to the canonical name", () => {
    expect(normalizeCategoryName("Smartphones")).toBe("Celulares e Smartphones");
    expect(normalizeCategoryName("Celular")).toBe("Celulares e Smartphones");
    expect(normalizeCategoryName("Celulares")).toBe("Celulares e Smartphones");
    expect(normalizeCategoryName("iPhone")).toBe("Celulares e Smartphones");
    expect(normalizeCategoryName("iPhone SWAP")).toBe("Celulares e Smartphones");
  });

  it("maps known headphone synonyms to the canonical name", () => {
    expect(normalizeCategoryName("Auriculares")).toBe("Fones de Ouvido");
    expect(normalizeCategoryName("Headset")).toBe("Fones de Ouvido");
    expect(normalizeCategoryName("Fone de Ouvido Sem Fio")).toBe("Fones de Ouvido");
  });

  it("is case- and accent-insensitive", () => {
    expect(normalizeCategoryName("CELULARES")).toBe("Celulares e Smartphones");
    expect(normalizeCategoryName("  celulares  ")).toBe("Celulares e Smartphones");
  });

  it("leaves unmapped categories (including GENERAL/Outros) unchanged", () => {
    expect(normalizeCategoryName("Outros")).toBe("Outros");
    expect(normalizeCategoryName("GENERAL")).toBe("GENERAL");
    expect(normalizeCategoryName("PlayStation")).toBe("PlayStation");
  });
});
