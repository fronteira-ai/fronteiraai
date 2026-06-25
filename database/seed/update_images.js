/**
 * update_images.js — Sprint Release 0.8
 *
 * Popula image_url (products), cover_image + logo_url (stores) e
 * logo_url (brands) com URLs do placehold.co enquanto imagens reais
 * não estão disponíveis no Supabase Storage.
 *
 * Quando imagens reais forem carregadas no bucket "catalog", atualize
 * os registros com as URLs do Storage e esta etapa deixa de ser necessária.
 *
 * Uso: node database/seed/update_images.js
 *      node database/seed/update_images.js --dry-run
 */

const path = require("path");
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

const DRY_RUN = process.argv.includes("--dry-run");

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

function placeholder(w, h, bg, text, fg = "94a3b8") {
  const encoded = encodeURIComponent(text);
  return `https://placehold.co/${w}x${h}/${bg}/${fg}/png?text=${encoded}`;
}

// Images for each product — descriptive, branded
const PRODUCT_IMAGES = {
  "iphone-16-pro-256gb-titanio-preto": placeholder(600, 600, "1e293b", "iPhone 16 Pro"),
  "macbook-air-m3-13-256gb": placeholder(600, 600, "1e293b", "MacBook Air M3"),
  "galaxy-s25-ultra-256gb": placeholder(600, 600, "0f172a", "Galaxy S25 Ultra", "60a5fa"),
  "smart-tv-samsung-55-4k-qled": placeholder(800, 600, "0f172a", "Smart TV 55\" QLED", "60a5fa"),
  "dji-mini-4-pro": placeholder(600, 600, "1e293b", "DJI Mini 4 Pro"),
  "playstation-5-slim": placeholder(600, 600, "1e293b", "PlayStation 5 Slim"),
};

// Store cover images — wide banner format
const STORE_COVERS = {
  cellshop: placeholder(1200, 400, "0f172a", "Cellshop", "60a5fa"),
  nissei: placeholder(1200, 400, "1e293b", "Nissei"),
  "shopping-china": placeholder(1200, 400, "0f172a", "Shopping China", "f59e0b"),
  "mega-eletronicos": placeholder(1200, 400, "1e293b", "Mega Eletronicos"),
  "atacado-games": placeholder(1200, 400, "0f172a", "Atacado Games", "a855f7"),
};

// Brand logos — square format
const BRAND_LOGOS = {
  apple: placeholder(200, 200, "1e293b", "Apple"),
  samsung: placeholder(200, 200, "0f172a", "Samsung", "60a5fa"),
  xiaomi: placeholder(200, 200, "1e293b", "Xiaomi", "f59e0b"),
  sony: placeholder(200, 200, "1e293b", "Sony"),
  dji: placeholder(200, 200, "1e293b", "DJI", "6ee7b7"),
};

async function run() {
  loadEnv();
  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log(DRY_RUN ? "🔍  Dry-run — nenhuma escrita será feita\n" : "✏️   Executando atualizações de imagem...\n");

  let updated = 0;
  let skipped = 0;

  // Products
  console.log("── Produtos ──");
  for (const [slug, url] of Object.entries(PRODUCT_IMAGES)) {
    if (DRY_RUN) {
      console.log(`  [DRY] ${slug} → ${url}`);
      continue;
    }
    const { data, error } = await svc
      .from("products")
      .update({ image_url: url })
      .eq("slug", slug)
      .select("id");

    if (error) { console.log(`  ❌  ${slug}: ${error.message}`); continue; }
    if (!data || data.length === 0) { console.log(`  ⚠️   ${slug}: não encontrado`); skipped++; continue; }
    console.log(`  ✅  ${slug}`);
    updated++;
  }

  // Stores — cover_image
  console.log("\n── Lojas (cover_image) ──");
  for (const [slug, url] of Object.entries(STORE_COVERS)) {
    if (DRY_RUN) {
      console.log(`  [DRY] ${slug} → ${url}`);
      continue;
    }
    const { data, error } = await svc
      .from("stores")
      .update({ cover_image: url })
      .eq("slug", slug)
      .select("id");

    if (error) { console.log(`  ❌  ${slug}: ${error.message}`); continue; }
    if (!data || data.length === 0) { console.log(`  ⚠️   ${slug}: não encontrado`); skipped++; continue; }
    console.log(`  ✅  ${slug}`);
    updated++;
  }

  // Brands — logo_url
  console.log("\n── Marcas (logo_url) ──");
  for (const [slug, url] of Object.entries(BRAND_LOGOS)) {
    if (DRY_RUN) {
      console.log(`  [DRY] ${slug} → ${url}`);
      continue;
    }
    const { data, error } = await svc
      .from("brands")
      .update({ logo_url: url })
      .eq("slug", slug)
      .select("id");

    if (error) { console.log(`  ❌  ${slug}: ${error.message}`); continue; }
    if (!data || data.length === 0) { console.log(`  ⚠️   ${slug}: não encontrado`); skipped++; continue; }
    console.log(`  ✅  ${slug}`);
    updated++;
  }

  if (!DRY_RUN) {
    console.log(`\n📊  Resultado: ${updated} atualizados, ${skipped} não encontrados`);
    if (updated === 16) console.log("🎉  Todas as 16 imagens atualizadas com sucesso.");
  }
}

run().catch((err) => { console.error("❌  Erro fatal:", err); process.exit(1); });
