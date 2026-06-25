/**
 * Storage Foundation Init — Sprint 4.3
 *
 * Cria o bucket "catalog" no Supabase Storage com política pública de leitura.
 * Requer SUPABASE_SERVICE_ROLE_KEY (.env.local).
 *
 * Uso: node database/storage/init.js
 *
 * Estrutura de pastas (não requer criação explícita — Supabase Storage
 * cria pastas on-demand no primeiro upload):
 *
 *   catalog/
 *     products/{slug}/main.webp
 *     products/{slug}/gallery/{0..n}.webp
 *     stores/{slug}/cover.webp
 *     stores/{slug}/logo.webp
 *     brands/{slug}/logo.webp
 *
 * URL pública de acesso:
 *   {SUPABASE_URL}/storage/v1/object/public/catalog/{path}
 */

const path = require("path");
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

function loadEnv() {
  const envPath = path.join(__dirname, "../../.env.local");
  if (!fs.existsSync(envPath)) {
    console.error("❌  .env.local não encontrado");
    process.exit(1);
  }
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

async function run() {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error("❌  NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes");
    process.exit(1);
  }

  const svc = createClient(url, serviceKey);
  const BUCKET = "catalog";

  // Verifica se o bucket já existe
  const { data: buckets, error: listErr } = await svc.storage.listBuckets();
  if (listErr) {
    console.error("❌  Erro ao listar buckets:", listErr.message);
    process.exit(1);
  }

  const exists = (buckets ?? []).some((b) => b.name === BUCKET);
  if (exists) {
    console.log(`✅  Bucket "${BUCKET}" já existe — nenhuma ação necessária.`);
  } else {
    const { error: createErr } = await svc.storage.createBucket(BUCKET, {
      public: true,
      allowedMimeTypes: ["image/webp", "image/jpeg", "image/png", "image/avif"],
      fileSizeLimit: 5 * 1024 * 1024, // 5 MB por arquivo
    });
    if (createErr) {
      console.error("❌  Erro ao criar bucket:", createErr.message);
      process.exit(1);
    }
    console.log(`✅  Bucket "${BUCKET}" criado com sucesso.`);
  }

  // Lista buckets após criação para confirmação
  const { data: after } = await svc.storage.listBuckets();
  const catalog = (after ?? []).find((b) => b.name === BUCKET);
  if (catalog) {
    console.log("📦  Detalhes do bucket:");
    console.log("    name     :", catalog.name);
    console.log("    public   :", catalog.public);
    console.log("    id       :", catalog.id);
    console.log("");
    console.log("🔗  URL base de acesso:");
    console.log(`    ${url}/storage/v1/object/public/${BUCKET}/`);
    console.log("");
    console.log("📁  Estrutura de pastas esperada:");
    console.log(`    ${BUCKET}/products/{slug}/main.webp`);
    console.log(`    ${BUCKET}/products/{slug}/gallery/0.webp`);
    console.log(`    ${BUCKET}/stores/{slug}/cover.webp`);
    console.log(`    ${BUCKET}/stores/{slug}/logo.webp`);
    console.log(`    ${BUCKET}/brands/{slug}/logo.webp`);
  }

  console.log("\n🎉  Storage Foundation inicializado com sucesso.");
}

run().catch((err) => {
  console.error("❌  Erro inesperado:", err);
  process.exit(1);
});
