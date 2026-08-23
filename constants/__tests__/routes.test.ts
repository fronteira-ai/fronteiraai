// Sprint 39B — route generation. `searchPath` é a fonte canônica do destino
// da busca (/search?q=...) usado por useSearch/SearchBar.
//
// Import dinâmico em beforeAll: constants/routes.ts importa lib/env.ts, que
// lança se as env vars obrigatórias não existirem — definimos antes de
// importar (import estático no topo rodaria env.ts cedo demais).

describe("searchPath (route generation)", () => {
  let searchPath: (query?: string) => string;

  beforeAll(async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    const routes = await import("@/constants/routes");
    searchPath = routes.searchPath;
  });

  it("gera /search sem query", () => {
    expect(searchPath()).toBe("/search");
    expect(searchPath("")).toBe("/search");
    expect(searchPath(undefined)).toBe("/search");
  });

  it("gera /search?q= com encoding de URL", () => {
    expect(searchPath("iPhone 17 Pro")).toBe("/search?q=iPhone%2017%20Pro");
    expect(searchPath("perfume lattafa")).toBe("/search?q=perfume%20lattafa");
    expect(searchPath("100%")).toBe("/search?q=100%25");
  });
});
