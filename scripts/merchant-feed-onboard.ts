#!/usr/bin/env tsx
/**
 * MERCHANT FEED — internal operator onboarding CLI (PART C §16).
 *
 * Uso interno (NÃO self-service / não dashboard de lojista):
 *   npx tsx scripts/merchant-feed-onboard.ts --url <feed-url> --store <slug> \
 *      [--source-type XML_FEED|JSON_FEED] [--root products] [--map 'id=>codigo,price=>preco']
 *      [--dry-run]            # default: valida + preview SEM escrever
 *      [--authorize '<JSON>'] # ativação oficial exige registro de autorização
 *
 * Regras:
 *   - NADA é escrito em produção por este CLI sem `--authorize` (que exige um
 *     registro de autorização válido do lojista — não inventa).
 *   - `--dry-run` é autônomo e seguro (VALIDA + PREVIEW).
 *   - A URL é validada por SecureFeedFetcher (SSRF/bounded/timeout).
 */

import { MerchantOperatorWorkflow } from "../src/domains/merchant-feed/onboarding/MerchantOperatorWorkflow";
import { normalizeFieldMapping, validateMerchantSourceConfig, type MerchantSourceConfig } from "../src/domains/merchant-feed/config/MerchantSourceConfig";
import { canOnboardMerchant, type MerchantAuthorizationRecord } from "../src/domains/merchant-feed/auth/MerchantAuthorization";

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
      out[key] = val;
    }
  }
  return out;
}

function buildSourceConfig(args: Record<string, string>): MerchantSourceConfig | undefined {
  if (!args["source-type"] || args["source-type"] !== "JSON_FEED") return undefined;
  const mapping: Record<string, string> = {};
  if (args.map) {
    for (const pair of args.map.split(",")) {
      const [slot, path] = pair.split("=>");
      if (slot && path) mapping[slot.trim()] = path.trim();
    }
  }
  const cfg: MerchantSourceConfig = {
    sourceType: "JSON_FEED",
    feedUrl: args.url,
    rootPath: args.root || "$",
    fieldMapping: normalizeFieldMapping(mapping as never),
  };
  validateMerchantSourceConfig(cfg); // fail fast antes de ativar
  return cfg;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.url || !args.store) {
    console.error("Uso: --url <feed-url> --store <slug> [--source-type ...] [--root ...] [--map 'id=>codigo,price=>preco'] [--dry-run] [--authorize '<json>']");
    process.exit(1);
  }

  const sourceConfig = buildSourceConfig(args);
  const authorization: MerchantAuthorizationRecord | undefined = args.authorize ? JSON.parse(args.authorize) : undefined;
  const authorized = canOnboardMerchant(authorization);

  const wf = new MerchantOperatorWorkflow();

  console.log(`\n[Merchant Feed] onboarding interno de "${args.store}"`);
  console.log(`  URL: ${args.url}`);
  console.log(`  type: ${args["source-type"] ?? (sourceConfig ? "JSON_FEED" : "XML_FEED")}`);
  console.log(`  autorização: ${authorized ? "OK (registrada)" : "NENHUMA (ativação bloqueada)"}`);

  // 1) VALIDAR + PREVIEW (dry-run, autônomo, sem escrita)
  const report = await wf.validateAndPreview(
    { storeSlug: args.store, feedUrl: args.url, sourceConfig, sourceType: (sourceConfig?.sourceType ?? args["source-type"] ?? "XML_FEED") as never },
  );
  const val = report.validation;
  console.log(`\n--- VALIDATE_PREVIEW ---`);
  console.log(`  format detectado: ${val?.couldValidate ? "✓" : "✗ (formato não reconhecido)"}`);
  console.log(`  total=${val?.totalItems ?? 0} valid=${val?.valid ?? 0} invalid=${val?.invalid ?? 0}`);
  console.log(`  dup_external_ids=${val?.duplicateExternalIds ?? 0} price_cov=${toPct(val?.priceCoverage)} stock_cov=${toPct(val?.stockCoverage)} image_cov=${toPct(val?.imageCoverage)} brand_cov=${toPct(val?.brandCoverage)}`);
  const mp = report.matchPreview;
  console.log(`  matched_existing=${mp?.matchedExisting ?? 0} new_candidates=${mp?.newProductCandidates ?? 0} ambiguous=${mp?.ambiguous ?? 0} rejected=${mp?.prohibitedRejected ?? 0}`);
  if (report.migration) {
    console.log(`\n--- MIGRATION dry-run ---`);
    console.log(`  existing=${report.migration.existingOffers} feed=${report.migration.feedOffers} matched=${report.migration.matchedOffers} unmatched_existing=${report.migration.unmatchedExisting} new_feed=${report.migration.newFeedOffers} ambiguous=${report.migration.ambiguous}`);
    console.log(`  price_diff=${report.migration.priceDifferences} stock_diff=${report.migration.stockDifferences} cutover_ok=${report.migration.canCutover}`);
  }

  // 2) ACTIVATE (bloqueado se não houver autorização real)
  if (args["dry-run"] === "false" && authorized) {
    const act = wf.activate({ storeSlug: args.store, feedUrl: args.url, sourceConfig, sourceType: (sourceConfig?.sourceType ?? "XML_FEED") as never, authorization }, report.validation as never);
    console.log(`\n--- ACTIVATE ---`);
    console.log(`  canActivate=${act.activation.canActivate}`);
    if (!act.config) console.error("  ATENÇÃO: activation não retornou config — rever autorização.");
  } else {
    console.log(`\n[NÃO ativado] ${args["dry-run"] === "false" ? "sem autorização do lojista (gate §18)" : "modo dry-run (autônomo, sem escrita)"}`);
  }
  console.log(`\nFim. Nada foi escrito em produção por este CLI a menos que --dry-run=false + --authorize válido.`);
}

function toPct(x: number | undefined): string {
  return x === undefined ? "-" : `${Math.round((x ?? 0) * 100)}%`;
}

main().catch((e) => {
  console.error("FALHOU:", (e as Error).message);
  process.exit(1);
});
