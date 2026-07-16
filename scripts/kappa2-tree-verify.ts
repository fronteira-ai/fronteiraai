import { getServiceClient } from "./lib/client";
import { flattenTree } from "../src/domains/taxonomy";

async function main() {
  const supabase = getServiceClient();
  const { data: categories } = await supabase.from("categories").select("slug");
  const realSlugs = new Set((categories ?? []).map((c) => c.slug as string));

  let totalMapped = 0;
  let found = 0;
  const missing: string[] = [];
  for (const node of flattenTree()) {
    for (const slug of node.realCategorySlugs) {
      totalMapped++;
      if (realSlugs.has(slug)) found++;
      else missing.push(`${node.slug} <- ${slug}`);
    }
  }
  console.log("Total realCategorySlugs claimed in tree:", totalMapped);
  console.log("Actually exist in categories table:", found);
  console.log("Missing (claimed but not real):", missing.length);
  missing.forEach((m) => console.log("  " + m));
}

main().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});
