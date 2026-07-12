import { getServiceClient } from "./lib/client";

async function fetchAllOfferProductIds(supabase: ReturnType<typeof getServiceClient>, storeId: string) {
  const rows: string[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("offers")
      .select("product_id")
      .eq("store_id", storeId)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    rows.push(...data.map((r) => r.product_id as string));
    if (data.length < PAGE) break;
  }
  return rows;
}

async function main() {
  const supabase = getServiceClient();
  const { data: stores } = await supabase.from("stores").select("id, slug").in("slug", ["mega-eletronicos", "mobile-zone"]);

  for (const s of stores ?? []) {
    const productIds = await fetchAllOfferProductIds(supabase, s.id as string);
    let withSpecs = 0;
    for (let i = 0; i < productIds.length; i += 300) {
      const chunk = productIds.slice(i, i + 300);
      const { data: prods, error } = await supabase
        .from("products")
        .select("specifications")
        .in("id", chunk)
        .not("specifications", "is", null);
      if (error) {
        console.log("chunk error:", error.message);
        continue;
      }
      withSpecs += (prods ?? []).length;
    }
    console.log(`${s.slug} — total offers: ${productIds.length} — products with specifications: ${withSpecs} (${((withSpecs / productIds.length) * 100).toFixed(1)}%)`);
  }
}

main().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});
