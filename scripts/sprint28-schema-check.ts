/**
 * Sprint 2.8 — Objetivo 1 support. Read-only. Lists actual live columns for
 * products and canonical_products via a real row (information_schema needs
 * elevated grants not always present on the service role in Supabase's
 * default setup, so we read one row of each and report keys/types instead).
 *
 * Uso: npx tsx scripts/sprint28-schema-check.ts
 */
import { getServiceClient } from "./lib/client";

async function main() {
  const supabase = getServiceClient();
  const { data: p } = await supabase.from("products").select("*").limit(1);
  const { data: cp } = await supabase.from("canonical_products").select("*").limit(1);
  console.log("products columns:", p && p[0] ? Object.keys(p[0]) : "no rows");
  console.log("canonical_products columns:", cp && cp[0] ? Object.keys(cp[0]) : "no rows");
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
