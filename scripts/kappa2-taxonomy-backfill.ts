/**
 * PROGRAM Κ — MISSION Κ-2 — Backfill das 5 tabelas novas.
 *
 * NÃO EXECUTAR sem autorização explícita do CTO — escreve em produção.
 * Requer a migration 20260715140000_universal_taxonomy.sql já aplicada.
 *
 * Popula as 5 tabelas novas (universal_categories, category_universal_map,
 * canonical_brands, brand_universal_map, attribute_dictionary) a partir dos
 * dados puros já definidos em src/domains/taxonomy/. Idempotente — upsert
 * por slug/chave única em todas as tabelas, seguro rodar mais de uma vez.
 * model_aliases é populado separadamente (poucas linhas, ver
 * KNOWN_MODEL_ALIASES) porque não depende de nenhuma query real, só do
 * dicionário já definido.
 *
 * Não escreve em categories/products/canonical_products/brands/
 * merge_candidates — só nas 5 tabelas novas desta migration.
 *
 * Uso: npx tsx scripts/kappa2-taxonomy-backfill.ts
 */
import { getServiceClient } from "./lib/client";
import {
  UNIVERSAL_TAXONOMY,
  flattenTree,
  normalizeBrandName,
  KNOWN_MODEL_ALIASES,
  ATTRIBUTE_DICTIONARY,
} from "../src/domains/taxonomy";
import type { UniversalCategoryNode } from "../src/domains/taxonomy";

async function backfillUniversalCategories(supabase: ReturnType<typeof getServiceClient>) {
  const slugToId = new Map<string, string>();

  async function upsertNode(node: UniversalCategoryNode, parentId: string | null) {
    const { data, error } = await supabase
      .from("universal_categories")
      .upsert({ name: node.name, slug: node.slug, parent_id: parentId, level: node.level }, { onConflict: "slug" })
      .select("id")
      .single();
    if (error) throw new Error(`universal_categories upsert "${node.slug}": ${error.message}`);
    slugToId.set(node.slug, data.id as string);
    for (const child of node.children ?? []) await upsertNode(child, data.id as string);
  }

  for (const dept of UNIVERSAL_TAXONOMY) await upsertNode(dept, null);
  return slugToId;
}

async function backfillCategoryMap(supabase: ReturnType<typeof getServiceClient>, universalIdBySlug: Map<string, string>) {
  const { data: categories, error } = await supabase.from("categories").select("id, slug");
  if (error) throw new Error(`categories fetch: ${error.message}`);
  const categoryIdBySlug = new Map((categories ?? []).map((c) => [c.slug as string, c.id as string]));

  let mapped = 0;
  let skippedNoRealCategory = 0;
  for (const node of flattenTree(UNIVERSAL_TAXONOMY)) {
    const universalId = universalIdBySlug.get(node.slug);
    if (!universalId) continue;
    for (const realSlug of node.realCategorySlugs) {
      const categoryId = categoryIdBySlug.get(realSlug);
      if (!categoryId) {
        skippedNoRealCategory++;
        continue;
      }
      const { error: upsertError } = await supabase
        .from("category_universal_map")
        .upsert(
          { category_id: categoryId, universal_category_id: universalId, confidence: "alta", source: "kappa2-universal-tree" },
          { onConflict: "category_id" }
        );
      if (upsertError) throw new Error(`category_universal_map upsert "${realSlug}": ${upsertError.message}`);
      mapped++;
    }
  }
  return { mapped, skippedNoRealCategory };
}

async function backfillBrands(supabase: ReturnType<typeof getServiceClient>) {
  const { data: brands, error } = await supabase.from("brands").select("id, name, slug");
  if (error) throw new Error(`brands fetch: ${error.message}`);

  const normalizedToCanonicalId = new Map<string, string>();
  let canonicalCreated = 0;
  let mapped = 0;

  for (const b of brands ?? []) {
    const norm = normalizeBrandName(b.name as string);
    let canonicalId = normalizedToCanonicalId.get(norm);
    if (!canonicalId) {
      const { data, error: upsertError } = await supabase
        .from("canonical_brands")
        .upsert({ name: b.name, slug: b.slug }, { onConflict: "slug" })
        .select("id")
        .single();
      if (upsertError) throw new Error(`canonical_brands upsert "${b.name}": ${upsertError.message}`);
      canonicalId = data.id as string;
      normalizedToCanonicalId.set(norm, canonicalId);
      canonicalCreated++;
    }
    const { error: mapError } = await supabase
      .from("brand_universal_map")
      .upsert({ brand_id: b.id, canonical_brand_id: canonicalId }, { onConflict: "brand_id" });
    if (mapError) throw new Error(`brand_universal_map upsert "${b.name}": ${mapError.message}`);
    mapped++;
  }
  return { canonicalCreated, mapped };
}

async function backfillModelAliases(supabase: ReturnType<typeof getServiceClient>) {
  const { error } = await supabase
    .from("model_aliases")
    .upsert(
      KNOWN_MODEL_ALIASES.map((m) => ({ brand_slug: m.brandSlug, raw_token: m.rawToken, canonical_model: m.canonicalModel })),
      { onConflict: "brand_slug,raw_token" }
    );
  if (error) throw new Error(`model_aliases upsert: ${error.message}`);
  return KNOWN_MODEL_ALIASES.length;
}

async function backfillAttributeDictionary(supabase: ReturnType<typeof getServiceClient>) {
  const { error } = await supabase
    .from("attribute_dictionary")
    .upsert(
      ATTRIBUTE_DICTIONARY.map((a) => ({ key: a.key, label_pt: a.labelPt, label_es: a.labelEs, category: a.category, description: a.description })),
      { onConflict: "key" }
    );
  if (error) throw new Error(`attribute_dictionary upsert: ${error.message}`);
  return ATTRIBUTE_DICTIONARY.length;
}

async function main() {
  const supabase = getServiceClient();

  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  MISSION Κ-2 — Taxonomy Backfill                           ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  const universalIdBySlug = await backfillUniversalCategories(supabase);
  console.log(`universal_categories: ${universalIdBySlug.size} nós criados/atualizados (árvore completa).`);

  const { mapped: categoriesMapped, skippedNoRealCategory } = await backfillCategoryMap(supabase, universalIdBySlug);
  console.log(`category_universal_map: ${categoriesMapped} categorias reais mapeadas (${skippedNoRealCategory} slugs do dicionário sem categoria real correspondente hoje).`);

  const { canonicalCreated, mapped: brandsMapped } = await backfillBrands(supabase);
  console.log(`canonical_brands: ${canonicalCreated} marcas canônicas (de ${brandsMapped} marcas reais).`);

  const modelAliasCount = await backfillModelAliases(supabase);
  console.log(`model_aliases: ${modelAliasCount} entradas.`);

  const attrCount = await backfillAttributeDictionary(supabase);
  console.log(`attribute_dictionary: ${attrCount} atributos oficiais.`);

  console.log("\n[kappa2-taxonomy-backfill] done.");
}

main().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});
