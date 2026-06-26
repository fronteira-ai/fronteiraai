import path from "path";
import { JsonFileConnector } from "../connectors/json-file.connector";
import { AcquisitionPipeline } from "../core/pipeline";
import { getServiceClient } from "../lib/client";

const EXECUTE = process.argv.includes("--execute");
const DATASET = path.join(__dirname, "../datasets/sample-products.json");

async function main() {
  console.log(`\n[import-json] Mode: ${EXECUTE ? "EXECUTE" : "DRY-RUN"}`);
  console.log(`[import-json] Dataset: ${DATASET}\n`);

  const connector = new JsonFileConnector({
    filePath: DATASET,
    storeSlug: "cellshop",
    id: "json-file:sample",
    name: "Sample JSON Import",
  });

  const batch = await connector.fetch();
  console.log(`[import-json] Fetched ${batch.items.length} items from connector`);

  const supabase = getServiceClient();
  const pipeline = new AcquisitionPipeline({ skipMedia: true });

  const result = await pipeline.run(
    connector.metadata.id,
    batch.items,
    supabase,
    { dryRun: !EXECUTE, verbose: true }
  );

  if (!result.success) {
    console.error("\n[import-json] Pipeline completed with errors:");
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
