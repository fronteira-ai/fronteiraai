/**
 * Sincronização New Zone (API GraphQL pública).
 *
 * Uso:
 *   npm run sync:newzone               # dry-run (padrão)
 *   npm run sync:newzone -- --execute  # grava no banco
 */

import { NewZoneConnector } from "../src/domains/connectors/crawler/newzone/connector";
import { createConnectorsServices } from "../lib/connectors-factory";
import { getServiceClient } from "./lib/client";

const args = process.argv.slice(2);
const dryRun = !args.includes("--execute");

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║   New Zone Connector — Sync (GraphQL)    ║");
  console.log("╠══════════════════════════════════════════╣");
  console.log(`║  Modo   : ${dryRun ? "DRY-RUN (sem gravar)" : "EXECUÇÃO REAL     "} ║`);
  console.log("╚══════════════════════════════════════════╝\n");

  const connector = new NewZoneConnector();
  const supabase = getServiceClient();
  const { manualSyncTrigger } = createConnectorsServices(supabase);
  const result = await manualSyncTrigger.trigger(connector, { dryRun, verbose: true });

  console.log("\n");
  if (result.success) {
    console.log(`✔ Sincronização concluída — ${result.persisted.filter((p) => p.action !== "error").length} registros processados`);
  } else {
    console.log(`✗ Sincronização falhou — ${result.errors.length} erros`);
  }
  process.exit(result.success ? 0 : 1);
}

main().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});
