import path from "path";
import { CsvFileConnector } from "../src/domains/connectors/crawler/reference/CsvFileConnector";
import { createConnectorsServices } from "../lib/connectors-factory";
import { getServiceClient } from "./lib/client";

const EXECUTE = process.argv.includes("--execute");
const DATASET = path.join(__dirname, "datasets/sample-products.csv");

async function main() {
  console.log(`\n[import-csv] Mode: ${EXECUTE ? "EXECUTE" : "DRY-RUN"}`);
  console.log(`[import-csv] Dataset: ${DATASET}\n`);

  const connector = new CsvFileConnector({
    filePath: DATASET,
    storeSlug: "nissei",
    id: "csv-file:sample-script",
    name: "Sample CSV Import",
  });

  const supabase = getServiceClient();
  const { manualSyncTrigger } = createConnectorsServices(supabase);

  const result = await manualSyncTrigger.trigger(connector, { dryRun: !EXECUTE, skipMedia: true, verbose: true });

  if (!result.success) {
    console.error("\n[import-csv] Sync completed with errors:");
    for (const e of result.errors) {
      console.error(`  [${e.stage}] ${e.error}`);
    }
    process.exit(1);
  }

  console.log(`\n[import-csv] Done. ${EXECUTE ? "Data written to Supabase." : "No writes (dry-run). Use --execute to apply."}`);
}

main().catch((err) => {
  console.error("[import-csv] Fatal:", err);
  process.exit(1);
});
