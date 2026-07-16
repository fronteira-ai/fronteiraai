import { getServiceClient } from "./lib/client";

async function count(supabase: ReturnType<typeof getServiceClient>, table: string) {
  const { count } = await supabase.from(table).select("*", { count: "exact", head: true });
  return count ?? 0;
}

async function main() {
  const supabase = getServiceClient();
  for (const t of ["universal_categories", "category_universal_map", "canonical_brands", "brand_universal_map", "model_aliases", "attribute_dictionary"]) {
    console.log(`${t}: ${await count(supabase, t)} rows`);
  }
}

main();
