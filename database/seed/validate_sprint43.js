/**
 * Validação Sprint 4.3 — Data Integrity & Storage Foundation
 *
 * Valida:
 * 1. Integridade total do catálogo (slugs, orphans, preços, FKs)
 * 2. Storage Foundation (bucket catalog acessível publicamente)
 * 3. Instruções para validar constraints e índices (SQL Editor)
 *
 * Uso: node database/seed/validate_sprint43.js
 *      npm run db:validate:43
 */

const path = require("path");
const fs = require("fs");
const https = require("https");
const { createClient } = require("@supabase/supabase-js");

function loadEnv() {
  const envPath = path.join(__dirname, "../../.env.local");
  if (!fs.existsSync(envPath)) { console.error("❌  .env.local não encontrado"); process.exit(1); }
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^"(.*)"$/, "$1");
    if (!(key in process.env)) process.env[key] = val;
  }
}

function ok(msg) { console.log(`  ✅  ${msg}`); }
function fail(msg) { console.log(`  ❌  ${msg}`); }
function warn(msg) { console.log(`  ⚠️   ${msg}`); }
function section(title) { console.log(`\n${"─".repeat(56)}\n${title}\n${"─".repeat(56)}`); }

async function fetchUrl(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => resolve(res.statusCode)).on("error", () => resolve(null));
  });
}

async function run() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const anon = createClient(url, anonKey);
  const svc = createClient(url, serviceKey);

  let passed = 0;
  let failed = 0;

  function assert(cond, msgOk, msgFail) {
    if (cond) { ok(msgOk); passed++; } else { fail(msgFail); failed++; }
  }

  // ─── 1. Contagem de catálogo ───────────────────────────────
  section("1/5  Contagem de catálogo");
  const tables = ["brands", "categories", "products", "offers", "price_history", "stores"];
  for (const t of tables) {
    const { count, error } = await anon.from(t).select("*", { count: "exact", head: true });
    assert(!error && count > 0, `${t}: ${count} linhas`, `${t}: erro ou vazio — ${error?.message}`);
  }

  // ─── 2. Integridade de slugs ───────────────────────────────
  section("2/5  Unicidade e preenchimento de slugs");
  for (const t of ["stores", "products", "brands", "categories"]) {
    const { data } = await svc.from(t).select("slug");
    const vals = (data ?? []).map((r) => r.slug).filter(Boolean);
    const nulls = (data ?? []).length - vals.length;
    const dups = vals.filter((v, i) => vals.indexOf(v) !== i);
    assert(nulls === 0, `${t}.slug: 0 nulos`, `${t}.slug: ${nulls} nulo(s)`);
    assert(dups.length === 0, `${t}.slug: 0 duplicatas`, `${t}.slug: duplicatas — ${dups.join(", ")}`);
  }

  // ─── 3. Integridade referencial (FKs) ─────────────────────
  section("3/5  Integridade referencial");
  const { data: offers } = await svc.from("offers").select("id, product_id, store_id");
  const { data: products } = await svc.from("products").select("id, brand_id, category_id");
  const { data: storesData } = await svc.from("stores").select("id");
  const { data: brands } = await svc.from("brands").select("id");
  const { data: cats } = await svc.from("categories").select("id");

  const pids = new Set((products ?? []).map((p) => p.id));
  const sids = new Set((storesData ?? []).map((s) => s.id));
  const bids = new Set((brands ?? []).map((b) => b.id));
  const cids = new Set((cats ?? []).map((c) => c.id));

  const orphanOfferProd = (offers ?? []).filter((o) => !pids.has(o.product_id));
  const orphanOfferStore = (offers ?? []).filter((o) => !sids.has(o.store_id));
  const orphanProdBrand = (products ?? []).filter((p) => p.brand_id && !bids.has(p.brand_id));
  const orphanProdCat = (products ?? []).filter((p) => p.category_id && !cids.has(p.category_id));

  assert(orphanOfferProd.length === 0, "offers.product_id: 0 órfãs", `offers.product_id: ${orphanOfferProd.length} órfã(s)`);
  assert(orphanOfferStore.length === 0, "offers.store_id: 0 órfãs", `offers.store_id: ${orphanOfferStore.length} órfã(s)`);
  assert(orphanProdBrand.length === 0, "products.brand_id: 0 órfãs", `products.brand_id: ${orphanProdBrand.length} órfã(s)`);
  assert(orphanProdCat.length === 0, "products.category_id: 0 órfãs", `products.category_id: ${orphanProdCat.length} órfã(s)`);

  // ─── 4. Sanidade de preços ─────────────────────────────────
  section("4/5  Sanidade de preços");
  const { data: badUsd } = await svc.from("offers").select("id,price_usd").lte("price_usd", 0);
  const { data: nullUsd } = await svc.from("offers").select("id").is("price_usd", null);
  assert((badUsd ?? []).length === 0, "offers.price_usd: 0 ofertas com preço ≤ 0", `${(badUsd ?? []).length} ofertas com price_usd ≤ 0`);
  assert((nullUsd ?? []).length === 0, "offers.price_usd: 0 valores nulos", `${(nullUsd ?? []).length} ofertas com price_usd nulo`);

  // ─── 5. Storage Foundation ────────────────────────────────
  section("5/5  Storage Foundation");
  const { data: buckets, error: bErr } = await svc.storage.listBuckets();
  const catalog = (buckets ?? []).find((b) => b.name === "catalog");
  assert(!bErr && !!catalog, "Bucket 'catalog' existe", `Bucket 'catalog' não encontrado — ${bErr?.message}`);
  assert(catalog?.public === true, "Bucket 'catalog' é público", "Bucket 'catalog' não é público");

  // Testa URL pública do bucket (HEAD request)
  const publicUrl = `${url}/storage/v1/object/public/catalog/`;
  const statusCode = await fetchUrl(publicUrl.replace(/\/$/, ""));
  // 400 ou 200 significa que o bucket existe e é acessível (400 = path vazio, comportamento normal)
  assert(statusCode !== null && statusCode < 500, `URL pública acessível (HTTP ${statusCode})`, "URL pública do bucket inacessível");

  // ─── Resumo ────────────────────────────────────────────────
  section("RESULTADO");
  console.log(`  Total: ${passed + failed} asserções`);
  console.log(`  ✅  ${passed} OK`);
  if (failed > 0) console.log(`  ❌  ${failed} FALHA(S)`);
  else console.log("  ❌  0 falhas\n\n  🎉  Sprint 4.3 — Data Integrity: APROVADO");

  // ─── Instruções pós-migration (SQL Editor) ─────────────────
  console.log(`
${"─".repeat(56)}
Verificação de constraints e índices (SQL Editor Supabase)
${"─".repeat(56)}
Após aplicar 0008_data_integrity.sql, execute:

SELECT constraint_name, table_name
FROM information_schema.table_constraints
WHERE constraint_type = 'UNIQUE'
  AND table_name IN ('stores','products','brands','categories')
  AND constraint_name LIKE '%slug_unique'
ORDER BY table_name;
-- Esperado: 4 linhas

SELECT indexname, tablename
FROM pg_indexes
WHERE indexname IN (
  'offers_product_id_idx','offers_store_id_idx','offers_price_usd_idx',
  'products_brand_id_idx','products_category_id_idx',
  'price_history_offer_id_recorded_at_idx'
)
ORDER BY tablename, indexname;
-- Esperado: 6 linhas
`);

  if (failed > 0) process.exit(1);
}

run().catch((err) => { console.error("❌  Erro fatal:", err); process.exit(1); });
