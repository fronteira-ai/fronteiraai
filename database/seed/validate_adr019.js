// Validação definitiva do ADR-019 — chave anônima lendo todos os domínios
// Executa todos os cenários usando SOMENTE a chave anônima (sem service role).
// Se tudo passar: ADR-019 está resolvido.

const path = require("path");
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim()
      .replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error("ERRO: NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY ausentes.");
  process.exit(1);
}

const anon = createClient(url, anonKey);

let passed = 0;
let failed = 0;

function ok(label, detail) {
  console.log(`  [OK] ${label}${detail ? " — " + detail : ""}`);
  passed++;
}

function fail(label, detail) {
  console.error(`  [FAIL] ${label}${detail ? " — " + detail : ""}`);
  failed++;
}

async function section(title, fn) {
  console.log(`\n${title}`);
  await fn();
}

async function main() {
  console.log("=".repeat(60));
  console.log("VALIDAÇÃO ADR-019 — chave anônima (NEXT_PUBLIC_SUPABASE_ANON_KEY)");
  console.log("URL:", url.slice(0, 40) + "...");
  console.log("=".repeat(60));

  // ──────────────────────────────────────────────
  // 1. LEITURA DIRETA DAS TABELAS (policies RLS)
  // ──────────────────────────────────────────────
  await section("1. Leitura direta das tabelas (ADR-019 core)", async () => {
    const tables = ["brands", "categories", "products", "offers", "price_history", "stores"];
    for (const table of tables) {
      const { data, error } = await anon.from(table).select("*").limit(3);
      if (error) {
        fail(`${table} — erro de query`, error.message);
      } else if (!Array.isArray(data)) {
        fail(`${table} — retorno inesperado`, JSON.stringify(data));
      } else if (data.length === 0) {
        fail(`${table} — retornou 0 linhas (RLS bloqueando ou tabela vazia)`);
      } else {
        ok(`${table}`, `${data.length} linha(s) retornada(s)`);
      }
    }
  });

  // ──────────────────────────────────────────────
  // 2. HOME — stores + brands + categories + products
  // ──────────────────────────────────────────────
  await section("2. Home — dados das seções principais", async () => {
    const { data: stores } = await anon.from("stores").select("id, name, slug, rating").order("rating", { ascending: false }).limit(3);
    if (stores && stores.length > 0) {
      ok("stores (FeaturedStores)", `${stores.length} lojas — ${stores.map(s => s.name).join(", ")}`);
    } else {
      fail("stores (FeaturedStores)", "0 lojas");
    }

    const { data: brands } = await anon.from("brands").select("id, name, slug").limit(5);
    if (brands && brands.length > 0) {
      ok("brands (Brands section)", `${brands.length} marcas — ${brands.map(b => b.name).join(", ")}`);
    } else {
      fail("brands (Brands section)", "0 marcas");
    }

    const { data: categories } = await anon.from("categories").select("id, name, slug").limit(5);
    if (categories && categories.length > 0) {
      ok("categories (Categories section)", `${categories.length} categorias — ${categories.map(c => c.name).join(", ")}`);
    } else {
      fail("categories (Categories section)", "0 categorias");
    }

    const { data: products } = await anon
      .from("products")
      .select("id, name, slug, brand:brands(name), category:categories(name)")
      .limit(4);
    if (products && products.length > 0) {
      ok("products (Offers section)", `${products.length} produto(s) — ${products.map(p => p.name).join(", ")}`);
    } else {
      fail("products (Offers section)", "0 produtos");
    }
  });

  // ──────────────────────────────────────────────
  // 3. PRODUTO — /product/[slug]
  // ──────────────────────────────────────────────
  await section("3. Produto — /product/[slug]", async () => {
    const { data: product } = await anon
      .from("products")
      .select("id, name, slug, description, brand:brands(*), category:categories(*)")
      .eq("slug", "iphone-16-pro-256gb-titanio-preto")
      .single();

    if (product) {
      ok("getProductBySlug", `"${product.name}" | marca: ${product.brand?.name ?? "null"} | categoria: ${product.category?.name ?? "null"}`);
    } else {
      fail("getProductBySlug", "produto não encontrado com a chave anônima");
    }

    if (product) {
      const { data: offers } = await anon
        .from("offers")
        .select("id, price_usd, in_stock, store:stores(name)")
        .eq("product_id", product.id)
        .order("price_usd", { ascending: true });
      if (offers && offers.length > 0) {
        ok("getOffersByProduct", `${offers.length} oferta(s) — menor preço: $${offers[0].price_usd} @ ${offers[0].store?.name}`);
      } else {
        fail("getOffersByProduct", "0 ofertas para este produto");
      }
    }

    const { data: related } = await anon
      .from("products")
      .select("id, name, slug")
      .neq("slug", "iphone-16-pro-256gb-titanio-preto")
      .limit(4);
    if (related && related.length > 0) {
      ok("getRelatedProducts", `${related.length} produto(s) relacionado(s)`);
    } else {
      fail("getRelatedProducts", "0 produtos relacionados");
    }
  });

  // ──────────────────────────────────────────────
  // 4. COMPARE — /compare/[slug] + /api/compare
  // ──────────────────────────────────────────────
  await section("4. Compare Engine — /compare/[slug]", async () => {
    const { data: product } = await anon
      .from("products")
      .select("id, slug")
      .eq("slug", "iphone-16-pro-256gb-titanio-preto")
      .single();

    if (!product) {
      fail("produto base para compare", "não encontrado");
      return;
    }
    ok("produto base encontrado", product.slug);

    const { data: offers } = await anon
      .from("offers")
      .select("id, price_usd, in_stock, store:stores(*)")
      .eq("product_id", product.id);

    if (offers && offers.length > 0) {
      ok("ofertas para comparação", `${offers.length} oferta(s)`);

      const offerIds = offers.map(o => o.id);
      const { data: history } = await anon
        .from("price_history")
        .select("offer_id, price_usd, old_price_usd, recorded_at")
        .in("offer_id", offerIds);

      if (history) {
        ok("price_history (batch .in())", `${history.length} entrada(s) de histórico`);
      } else {
        fail("price_history (batch .in())", "erro na query");
      }
    } else {
      fail("ofertas para comparação", "0 ofertas");
    }
  });

  // ──────────────────────────────────────────────
  // 5. STORE — /store/[slug]
  // ──────────────────────────────────────────────
  await section("5. Loja — /store/[slug]", async () => {
    const { data: store } = await anon
      .from("stores")
      .select("id, name, slug, city, country, rating, is_verified")
      .eq("slug", "cellshop")
      .single();

    if (store) {
      ok("getStoreBySlug", `"${store.name}" | ${store.city}, ${store.country} | rating: ${store.rating}`);
    } else {
      fail("getStoreBySlug", "loja não encontrada");
    }

    if (store) {
      const { data: storeOffers } = await anon
        .from("offers")
        .select("id, price_usd, in_stock, product:products(name, slug)")
        .eq("store_id", store.id);
      if (storeOffers && storeOffers.length > 0) {
        ok("getOffersByStore", `${storeOffers.length} oferta(s) desta loja`);
      } else {
        fail("getOffersByStore", "0 ofertas para esta loja");
      }
    }

    const { data: related } = await anon
      .from("stores")
      .select("id, name, slug")
      .neq("slug", "cellshop")
      .limit(3);
    if (related && related.length > 0) {
      ok("getRelatedStores", `${related.length} loja(s) relacionada(s)`);
    } else {
      fail("getRelatedStores", "0 lojas relacionadas");
    }
  });

  // ──────────────────────────────────────────────
  // 6. SEARCH — /search
  // ──────────────────────────────────────────────
  await section("6. Busca — /search", async () => {
    const { data: products } = await anon
      .from("products")
      .select("id, name, slug")
      .ilike("name", "%iPhone%")
      .limit(8);
    if (products && products.length > 0) {
      ok("searchProducts (ilike 'iPhone')", `${products.length} resultado(s) — ${products.map(p => p.name).join(", ")}`);
    } else {
      fail("searchProducts", "0 resultados para 'iPhone'");
    }

    const { data: stores } = await anon
      .from("stores")
      .select("id, name, slug")
      .ilike("name", "%cell%")
      .limit(8);
    if (stores && stores.length > 0) {
      ok("searchStores (ilike 'cell')", `${stores.length} loja(s) — ${stores.map(s => s.name).join(", ")}`);
    } else {
      fail("searchStores", "0 resultados para 'cell'");
    }
  });

  // ──────────────────────────────────────────────
  // 7. PRODUTOS — /products (catalog + joins)
  // ──────────────────────────────────────────────
  await section("7. Catálogo — /products (join offers + brands + categories)", async () => {
    const { data, count, error } = await anon
      .from("products")
      .select("id, name, slug, brand:brands(name), category:categories(name), offers!left(price_usd, in_stock)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(0, 3);

    if (error) {
      fail("getProductsCatalog", error.message);
    } else if (data && data.length > 0) {
      ok("getProductsCatalog (join completo)", `${count} produto(s) total, ${data.length} retornado(s) na página`);
      for (const p of data) {
        const prices = (p.offers ?? []).map(o => o.price_usd).filter(Boolean);
        const min = prices.length ? Math.min(...prices) : null;
        console.log(`    • ${p.name} | marca: ${p.brand?.name ?? "-"} | preço mínimo: ${min ? "$" + min : "sem oferta"}`);
      }
    } else {
      fail("getProductsCatalog", "0 produtos retornados");
    }
  });

  // ──────────────────────────────────────────────
  // RESULTADO FINAL
  // ──────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log(`RESULTADO: ${passed} OK | ${failed} FAIL`);
  if (failed === 0) {
    console.log("ADR-019 RESOLVIDO ✅ — chave anônima lê todos os domínios.");
  } else {
    console.log("ADR-019 NÃO RESOLVIDO ❌ — veja os itens [FAIL] acima.");
  }
  console.log("=".repeat(60));

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error("Erro inesperado:", err);
  process.exit(1);
});
