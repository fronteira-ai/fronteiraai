// Orquestrador do seed oficial do ParaguAI.
//
// Modo padrão: DRY-RUN — só imprime o que faria, nenhuma escrita real.
// Para executar de verdade contra o Supabase: `node database/seed/index.js --execute`.
//
// Esse default existe de propósito: popular dados de produção exige
// aprovação explícita (.ai/CLAUDE_SYSTEM.md, Restrições Absolutas) — a
// segurança fica embutida no próprio script, não só em uma instrução
// verbal, para que rodar o comando por engano nunca escreva nada.
//
// Idempotente por design: cada entidade é resolvida por uma chave natural
// (slug para brands/categories/products; name para a loja já existente;
// par product_id+store_id para offers) antes de decidir inserir — roda
// quantas vezes for preciso sem duplicar.
const { getClient } = require("./lib/client");

const brands = require("./brands/data");
const categories = require("./categories/data");
const storesBackfill = require("./stores/data");
const products = require("./products/data");
const offers = require("./offers/data");

const EXECUTE = process.argv.includes("--execute");

function log(...args) {
  console.log(...args);
}

async function upsertBySlug(supabase, table, slug, payload, label) {
  const { data: existing, error: selectError } = await supabase
    .from(table)
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (selectError) {
    log(`  [ERRO] select ${table}.${slug}: ${selectError.message}`);
    return null;
  }
  if (existing) {
    log(`  [SKIP] ${label} "${slug}" já existe (id=${existing.id})`);
    return existing.id;
  }
  if (!EXECUTE) {
    log(`  [DRY-RUN] criaria ${label} "${slug}"`);
    return null;
  }

  const { data, error } = await supabase.from(table).insert(payload).select("id").single();
  if (error) {
    log(`  [ERRO] insert ${table}.${slug}: ${error.message}`);
    return null;
  }
  log(`  [OK] ${label} "${slug}" criado (id=${data.id})`);
  return data.id;
}

async function main() {
  log(`Modo: ${EXECUTE ? "EXECUÇÃO REAL" : "DRY-RUN (nenhuma escrita será feita — use --execute para aplicar)"}`);
  const supabase = getClient();

  log("\n=== 1/5 Backfill de stores.slug/active (não cria lojas novas) ===");
  const storeIdBySlug = {};
  for (const store of storesBackfill) {
    const { data: existing, error } = await supabase
      .from("stores")
      .select("id, slug, active")
      .eq("name", store.name)
      .maybeSingle();

    if (error) {
      log(`  [ERRO] buscar loja "${store.name}": ${error.message}`);
      continue;
    }
    if (!existing) {
      log(`  [AVISO] loja real "${store.name}" não encontrada — o seed não cria lojas novas`);
      continue;
    }

    storeIdBySlug[store.slug] = existing.id;

    if (existing.slug === store.slug && existing.active === store.active) {
      log(`  [SKIP] "${store.name}" já tem slug/active corretos`);
      continue;
    }
    if (!EXECUTE) {
      log(`  [DRY-RUN] atualizaria "${store.name}" -> slug=${store.slug}, active=${store.active}`);
      continue;
    }
    const { data: updateData, error: updateError } = await supabase
      .from("stores")
      .update({ slug: store.slug, active: store.active })
      .eq("id", existing.id)
      .select("id");
    if (updateError) log(`  [ERRO] atualizar "${store.name}": ${updateError.message}`);
    else if (!updateData || updateData.length === 0)
      log(`  [AVISO] "${store.name}" não foi atualizada — RLS bloqueou a escrita silenciosamente (0 linhas afetadas). Use SUPABASE_SERVICE_ROLE_KEY ou revise a policy de UPDATE da tabela.`);
    else log(`  [OK] "${store.name}" atualizada -> slug=${store.slug}`);
  }

  log("\n=== 2/5 Brands ===");
  const brandIdBySlug = {};
  for (const brand of brands) {
    const id = await upsertBySlug(supabase, "brands", brand.slug, brand, "marca");
    if (id) brandIdBySlug[brand.slug] = id;
  }

  log("\n=== 3/5 Categories ===");
  const categoryIdBySlug = {};
  for (const category of categories) {
    const id = await upsertBySlug(supabase, "categories", category.slug, category, "categoria");
    if (id) categoryIdBySlug[category.slug] = id;
  }

  log("\n=== 4/5 Products ===");
  const productIdBySlug = {};
  for (const product of products) {
    const payload = {
      name: product.name,
      slug: product.slug,
      description: product.description,
      image_url: product.image_url,
      specifications: product.specifications,
      brand_id: brandIdBySlug[product.brand_slug] ?? null,
      category_id: categoryIdBySlug[product.category_slug] ?? null,
      active: true,
    };
    const id = await upsertBySlug(supabase, "products", product.slug, payload, "produto");
    if (id) productIdBySlug[product.slug] = id;
  }

  log("\n=== 5/5 Offers (chave natural: product_id + store_id) ===");
  for (const offer of offers) {
    const productId = productIdBySlug[offer.product_slug];
    const storeId = storeIdBySlug[offer.store_slug];
    if (!productId || !storeId) {
      log(`  [AVISO] pulei oferta ${offer.product_slug}@${offer.store_slug} (produto/loja não resolvidos nesta execução, normal em dry-run)`);
      continue;
    }

    const { data: existing, error: selectError } = await supabase
      .from("offers")
      .select("id")
      .eq("product_id", productId)
      .eq("store_id", storeId)
      .maybeSingle();

    if (selectError) {
      log(`  [ERRO] select offers ${offer.product_slug}@${offer.store_slug}: ${selectError.message}`);
      continue;
    }
    if (existing) {
      log(`  [SKIP] oferta ${offer.product_slug}@${offer.store_slug} já existe`);
      continue;
    }
    if (!EXECUTE) {
      log(`  [DRY-RUN] criaria oferta ${offer.product_slug}@${offer.store_slug}`);
      continue;
    }

    const { error } = await supabase.from("offers").insert({
      product_id: productId,
      store_id: storeId,
      currency: offer.currency,
      price_usd: offer.price_usd,
      price_brl: offer.price_brl,
      old_price: offer.old_price ?? null,
      in_stock: offer.in_stock,
      available: offer.available,
      stock_quantity: offer.stock_quantity ?? null,
      condition: offer.condition ?? null,
      warranty: offer.warranty ?? null,
      cashback: offer.cashback ?? null,
      product_url: offer.product_url ?? null,
    });
    if (error) log(`  [ERRO] insert oferta ${offer.product_slug}@${offer.store_slug}: ${error.message}`);
    else log(`  [OK] oferta ${offer.product_slug}@${offer.store_slug} criada`);
  }

  log(
    `\nConcluído. Modo: ${EXECUTE ? "execução real" : "dry-run — nenhuma escrita foi feita, rode com --execute para aplicar"}`
  );
}

main().catch((err) => {
  console.error("FALHA GERAL:", err);
  process.exit(1);
});
