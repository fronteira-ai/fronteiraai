/**
 * Sincronização completa do conector Mobile Zone.
 *
 * Uso:
 *   npm run sync:mobilezone               # dry-run (padrão)
 *   npm run sync:mobilezone -- --execute  # grava no banco
 */

import { MobileZoneConnector } from "../src/domains/connectors/crawler/mobilezone/connector";
import { createConnectorsServices } from "../lib/connectors-factory";
import { getServiceClient } from "./lib/client";

const args = process.argv.slice(2);
const dryRun = !args.includes("--execute");

async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║   Mobile Zone Connector — Sync               ║");
  console.log("╠══════════════════════════════════════════════╣");
  console.log(`║  Modo   : ${dryRun ? "DRY-RUN (sem gravar)         " : "EXECUÇÃO REAL                "} ║`);
  console.log("╚══════════════════════════════════════════════╝\n");

  const connector = new MobileZoneConnector();
  console.log(`[Fetch] Buscando produtos via API pública de mobilezone.com.py...`);

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
