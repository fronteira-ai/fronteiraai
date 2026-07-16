import { getServiceClient } from "./lib/client";

async function main() {
  const supabase = getServiceClient();
  const { error } = await supabase.from("universal_categories").select("id").limit(1);
  console.log(error ? `NOT APPLIED — ${error.message}` : "APPLIED — universal_categories table exists and is queryable.");
}

main();
