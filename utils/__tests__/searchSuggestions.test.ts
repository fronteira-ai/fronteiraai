import {
  DEFAULT_SUGGESTION_LIMIT,
  normalizeSearchQuery,
  rankSearchSuggestions,
} from "@/utils/searchSuggestions";

describe("normalizeSearchQuery", () => {
  it("normaliza espaços e trim", () => {
    expect(normalizeSearchQuery("  iPhone   17  Pro  ")).toBe("iPhone 17 Pro");
  });

  it("rejeita vazias, muito curtas e muito longas", () => {
    expect(normalizeSearchQuery("")).toBeNull();
    expect(normalizeSearchQuery("   ")).toBeNull();
    expect(normalizeSearchQuery("a")).toBeNull();
    expect(normalizeSearchQuery("x".repeat(61))).toBeNull();
  });

  it("rejeita URL, e-mail e caminho (PII/heurística)", () => {
    expect(normalizeSearchQuery("https://exemplo.com")).toBeNull();
    expect(normalizeSearchQuery("www.exemplo.com")).toBeNull();
    expect(normalizeSearchQuery("fulano@email.com")).toBeNull();
    expect(normalizeSearchQuery("comprar em loja/promocao")).toBeNull();
    expect(normalizeSearchQuery("C:\\Users\\x")).toBeNull();
  });
});

describe("rankSearchSuggestions", () => {
  it("ordena por frequência e deduplica por lowercase (mantém primeira grafia)", () => {
    const rows = [
      { search_query: "iPhone 17 Pro" },
      { search_query: "iphone 17 pro" },
      { search_query: "Notebook Gamer" },
    ];
    const result = rankSearchSuggestions(rows);
    expect(result).toEqual(["iPhone 17 Pro", "Notebook Gamer"]);
  });

  it("descarta linhas inválidas e sem query", () => {
    const result = rankSearchSuggestions([
      { search_query: null },
      { search_query: "x" },
      { search_query: "https://evil.com" },
      { search_query: "perfume" },
    ]);
    expect(result).toEqual(["perfume"]);
  });

  it("respeita o limite", () => {
    const rows = ["aa", "bb", "cc", "dd", "ee", "ff", "gg", "hh", "ii", "jj"].map((q) => ({ search_query: q }));
    expect(rankSearchSuggestions(rows, 3)).toHaveLength(3);
    expect(rankSearchSuggestions(rows, 3)).toEqual(["aa", "bb", "cc"]);
  });

  it("desempate alfabético para mesma frequência", () => {
    const rows = [
      { search_query: "zeta" },
      { search_query: "alfa" },
      { search_query: "beta" },
    ];
    expect(rankSearchSuggestions(rows)).toEqual(["alfa", "beta", "zeta"]);
  });

  it("limite padrão é 8", () => {
    expect(DEFAULT_SUGGESTION_LIMIT).toBe(8);
  });

  it("retorna [] para entrada vazia", () => {
    expect(rankSearchSuggestions([])).toEqual([]);
  });
});
