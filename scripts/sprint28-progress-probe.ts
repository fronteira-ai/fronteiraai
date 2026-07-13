import { getServiceClient } from "./lib/client";

async function main() {
  const supabase = getServiceClient();
  const { data: recent } = await supabase
    .from("canonical_products")
    .select("canonical_slug, updated_at")
    .order("updated_at", { ascending: false })
    .limit(5);
  console.log("Most recently updated canonical_products:");
  for (const r of recent ?? []) console.log(`  ${r.updated_at}  ${r.canonical_slug}`);
  console.log("Server now:", new Date().toISOString());

  const { count: mcCount } = await supabase.from("merge_candidates").select("*", { count: "exact", head: true });
  console.log("merge_candidates total (right now):", mcCount);
}
main();
