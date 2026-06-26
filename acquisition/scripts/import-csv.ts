import path from "path";
import { CsvFileConnector } from "../connectors/csv-file.connector";
import { AcquisitionPipeline } from "../core/pipeline";
import { getServiceClient } from "../lib/client";

const EXECUTE = process.argv.includes("--execute");
const DATASET = path.join(__dirname, "../datasets/sample-products.csv");

async function main() {
  console.log(`\n[import-csv] Mode: ${EXECUTE ? "EXECUTE" : "DRY-RUN"}`);
  console.log(`[import-csv] Dataset: ${DATASET}\n`);

  const connector = new CsvFileConnector({
    filePath: DATASET,
    storeSlug: "nissei",
    id: "csv-file:sample",
    name: "Sample CSV Import",
  });

  const batch = await connector.fetch();
  console.log(`[import-csv] Fetched ${batch.items.length} items from connector`);

  const supabase = getServiceClient();
  const pipeline = new AcquisitionPipeline({ skipMedia: true });

  const result = await pipeline.run(
    connector.metadata.id,
    batch.items,
    supabase,
    { dryRun: !EXECUTE, verbose: true }
  );

  if (!result.success) {
    console.error("\n[import-csv] Pipeline completed with errors:");
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
