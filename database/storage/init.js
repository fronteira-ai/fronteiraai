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

const { createClient } = require("@supabase/supabase-js");


async function run() {
  // Sprint 3D: antes lia .env.local por conta própria e criava buckets em
  // PRODUÇÃO sem trava alguma. Agora passa pelo resolvedor de alvo comum
  // (LOCAL por padrão; produção exige SUPABASE_TARGET=production +
  // SUPABASE_ALLOW_PRODUCTION=yes).
  const { resolveSupabaseTarget } = require("../seed/lib/target");
  const resolved = resolveSupabaseTarget();

  if (!resolved.usingServiceRole) {
    console.error("❌  SUPABASE_SERVICE_ROLE_KEY necessária para criar buckets");
    process.exit(1);
  }

  const svc = createClient(resolved.url, resolved.key);
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
