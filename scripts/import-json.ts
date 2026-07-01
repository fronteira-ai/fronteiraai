import path from "path";
import { JsonFileConnector } from "../src/domains/connectors/crawler/reference/JsonFileConnector";
import { createConnectorsServices } from "../lib/connectors-factory";
import { getServiceClient } from "./lib/client";

const EXECUTE = process.argv.includes("--execute");
const DATASET = path.join(__dirname, "datasets/sample-products.json");

async function main() {
  console.log(`\n[import-json] Mode: ${EXECUTE ? "EXECUTE" : "DRY-RUN"}`);
  console.log(`[import-json] Dataset: ${DATASET}\n`);

  const connector = new JsonFileConnector({
    filePath: DATASET,
    storeSlug: "cellshop",
    id: "json-file:sample-script",
    name: "Sample JSON Import",
  });

  const supabase = getServiceClient();
  const { manualSyncTrigger } = createConnectorsServices(supabase);

  const result = await manualSyncTrigger.trigger(connector, { dryRun: !EXECUTE, skipMedia: true, verbose: true });

  if (!result.success) {
    console.error("\n[import-json] Sync completed with errors:");
    for (const e of result.errors) {
      console.error(`  [${e.stage}] ${e.error}`);
    }
    process.exit(1);
  }

  console.log(`\n[import-json] Done. ${EXECUTE ? "Data written to Supabase." : "No writes (dry-run). Use --execute to apply."}`);
}

main().catch((err) => {
  console.error("[import-json] Fatal:", err);
  process.exit(1);
});
