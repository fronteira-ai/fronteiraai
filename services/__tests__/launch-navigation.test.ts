/**
 * Mission 01 (B) — contrato de URL do CTA "Ver todos os produtos" da página
 * da loja. O bug era `/products?store=${store.id}` (UUID), enquanto
 * `/products` resolve o filtro por `stores.slug` — o guard P2 devolvia
 * catálogo VAZIO. Este teste fixa a forma correta da URL.
 *
 * A outra metade do contrato ("o catálogo resolve esse slug" e "um slug
 * inexistente devolve vazio") já está coberta por
 * services/__tests__/public-catalog-visibility.test.ts:
 *   - "(FIX 1) storeSlug de loja ATIVA continua filtrando normalmente"
 *   - "(FIX 1) storeSlug de loja inativa → catálogo vazio"
 */

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.NEXT_PUBLIC_SITE_URL = "https://www.fronteiraai.com";

let productsPath: (params?: { store?: string; category?: string }) => string;

beforeAll(async () => {
  productsPath = (await import("@/constants/routes")).productsPath;
});

describe("Mission 01 (B) — CTA da loja → catálogo", () => {
  it("usa o SLUG da loja na URL do catálogo", () => {
    expect(productsPath({ store: "shopping-china" })).toBe("/products?store=shopping-china");
  });

  it("funciona para os slugs reais das lojas onboardadas", () => {
    for (const slug of ["shopping-china", "mega-eletronicos", "roma-shopping", "atacado-connect"]) {
      expect(productsPath({ store: slug })).toBe(`/products?store=${slug}`);
    }
  });

  it("o mesmo builder é o que o filtro de /products usa (fonte única)", () => {
    // ProductFilters monta a URL com `store.slug`; a página da loja agora usa
    // o MESMO helper — não há segunda forma de montar a URL a manter.
    expect(productsPath({ store: "loja-ativa", category: "eletronicos" })).toBe(
      "/products?category=eletronicos&store=loja-ativa"
    );
  });
});
