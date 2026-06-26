/**
 * Sincronização completa do conector Shopping China.
 *
 * Uso:
 *   npm run sync:shoppingchina            # dry-run (padrão)
 *   npm run sync:shoppingchina -- --execute  # grava no banco
 *   npm run sync:shoppingchina -- --execute --skip-media
 */

import { ShoppingChinaConnector } from "../connectors/shoppingchina";
import { AcquisitionPipeline } from "../core/pipeline";
import { getServiceClient } from "../lib/client";

const args = process.argv.slice(2);
const dryRun = !args.includes("--execute");
const skipMedia = args.includes("--skip-media");

async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║   Shopping China Connector — Sync            ║");
  console.log("╠══════════════════════════════════════════════╣");
  console.log(`║  Modo   : ${dryRun ? "DRY-RUN (sem gravar)         " : "EXECUÇÃO REAL                "} ║`);
  console.log(`║  Mídia  : ${skipMedia ? "Pulada                        " : "Processada                   "} ║`);
  console.log("╚══════════════════════════════════════════════╝\n");

  const connector = new ShoppingChinaConnector();
  console.log(`[Fetch] Buscando produtos em shoppingchina.com.py...`);

  const batch = await connector.fetch();
  console.log(`[Fetch] ${batch.items.length} ofertas coletadas\n`);

  if (batch.items.length === 0) {
    console.log("[Aviso] Nenhuma oferta coletada. Verifique a conectividade.");
    process.exit(0);
  }

  const supabase = getServiceClient();
  const pipeline = new AcquisitionPipeline();

  const result = await pipeline.run(
    connector.metadata.id,
    batch.items,
    supabase,
    { dryRun, skipMedia, verbose: true }
  );

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
