// Auditoria de qualidade de dados — somente leitura, segura para rodar a
// qualquer momento (`node database/seed/validate.js`). Não corrige nada
// automaticamente: só reporta. Ver docs/TECH_DEBT.md para o histórico de
// achados e docs/DECISIONS.md para o que fica de fora deste script hoje
// (detecção de FK "órfã" por anti-join real, que não escala via fetch-and-diff
// e exige um RPC/SQL dedicado quando houver volume).
const { getClient } = require("./lib/client");

async function findDuplicateSlugs(supabase, table) {
  const { data, error } = await supabase.from(table).select("slug");
  if (error) return { error };
  const counts = new Map();
  for (const row of data ?? []) {
    if (row.slug == null) continue;
    counts.set(row.slug, (counts.get(row.slug) ?? 0) + 1);
  }
  return { duplicates: [...counts.entries()].filter(([, count]) => count > 1) };
}

async function countWhereNull(supabase, table, column) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .is(column, null);
  return { count, error };
}

async function main() {
  const supabase = getClient();
  const lines = [];

  for (const table of ["products", "stores", "brands", "categories"]) {
    const { duplicates, error } = await findDuplicateSlugs(supabase, table);
    if (error) lines.push(`[ERRO] ${table}.slug: ${error.message}`);
    else if (duplicates.length) lines.push(`[FALHA] ${table}: slugs duplicados -> ${JSON.stringify(duplicates)}`);
    else lines.push(`[OK] ${table}: nenhum slug duplicado`);
  }

  {
    const { count, error } = await countWhereNull(supabase, "products", "category_id");
    lines.push(error ? `[ERRO] products.category_id: ${error.message}` : `[${count > 0 ? "AVISO" : "OK"}] produtos sem categoria: ${count}`);
  }
  {
    const { count, error } = await countWhereNull(supabase, "products", "brand_id");
    lines.push(error ? `[ERRO] products.brand_id: ${error.message}` : `[${count > 0 ? "AVISO" : "OK"}] produtos sem marca: ${count}`);
  }
  {
    const { count, error } = await countWhereNull(supabase, "offers", "store_id");
    lines.push(error ? `[ERRO] offers.store_id: ${error.message}` : `[${count > 0 ? "FALHA" : "OK"}] ofertas sem loja: ${count}`);
  }
  {
    const { count, error } = await countWhereNull(supabase, "offers", "product_id");
    lines.push(error ? `[ERRO] offers.product_id: ${error.message}` : `[${count > 0 ? "FALHA" : "OK"}] ofertas sem produto: ${count}`);
  }
  {
    const { count, error } = await supabase
      .from("offers")
      .select("*", { count: "exact", head: true })
      .lte("price_usd", 0);
    lines.push(error ? `[ERRO] offers.price_usd: ${error.message}` : `[${count > 0 ? "FALHA" : "OK"}] ofertas com price_usd <= 0: ${count}`);
  }
  {
    const { count, error } = await countWhereNull(supabase, "offers", "price_usd");
    lines.push(error ? `[ERRO] offers.price_usd (null): ${error.message}` : `[${count > 0 ? "AVISO" : "OK"}] ofertas sem price_usd: ${count}`);
  }
  {
    const { count, error } = await countWhereNull(supabase, "stores", "slug");
    lines.push(error ? `[ERRO] stores.slug: ${error.message}` : `[${count > 0 ? "AVISO" : "OK"}] lojas sem slug: ${count}`);
  }

  console.log(lines.join("\n"));
}

main().catch((err) => {
  console.error("FALHA GERAL:", err);
  process.exit(1);
});
