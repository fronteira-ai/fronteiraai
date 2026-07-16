import { getServiceClient } from "./lib/client";
import { extractManufacturerCode } from "../src/domains/product-intelligence";

async function main() {
  const supabase = getServiceClient();
  const { data } = await supabase.from("canonical_products").select("name").limit(2000);
  const rows = (data ?? []) as { name: string }[];
  const shuffled = [...rows].sort(() => Math.random() - 0.5).slice(0, 40);

  for (const r of shuffled) {
    const result = extractManufacturerCode(r.name);
    console.log(`${result ? result.code.padEnd(16) : "—".padEnd(16)} | ${r.name}`);
  }
}

main();
