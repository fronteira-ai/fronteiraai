/**
 * Sincronização completa do conector Atacado Connect.
 *
 * Uso:
 *   npm run sync:atacadoconnect               # dry-run (padrão)
 *   npm run sync:atacadoconnect -- --execute  # grava no banco
 */

import { AtacadoConnectConnector } from "../src/domains/connectors/crawler/atacadoconnect/connector";
import { createConnectorsServices } from "../lib/connectors-factory";
import { getServiceClient } from "./lib/client";

const args = process.argv.slice(2);
const dryRun = !args.includes("--execute");

async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║   Atacado Connect Connector — Sync           ║");
  console.log("╠══════════════════════════════════════════════╣");
  console.log(`║  Modo   : ${dryRun ? "DRY-RUN (sem gravar)         " : "EXECUÇÃO REAL                "} ║`);
  console.log("╚══════════════════════════════════════════════╝\n");

  const connector = new AtacadoConnectConnector();
  console.log(`[Fetch] Buscando produtos em atacadoconnect.com...`);

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
