import { getServiceClient } from "./lib/client";

async function main() {
  const supabase = getServiceClient();
  const { count } = await supabase.from("merge_candidates").select("*", { count: "exact", head: true });
  console.log("merge_candidates total:", count);
}
main();
