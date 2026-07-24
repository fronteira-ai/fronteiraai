/**
 * Catalog Recovery Engine — Mission Ω-Rehabilitation.
 *
 * Percorre TODO o catálogo (não apenas Top Products) recuperando brand_id/
 * category_id de produtos históricos (escritos antes do Catalog Integrity
 * Firewall) usando somente evidência determinística — ProductSignature
 * (EAN/MPN), Canonical Catalog, Merchant Memory, Universal Taxonomy,
 * normalização de marca. Nunca inventa, nunca usa IA/embeddings/inferência
 * textual livre. Dry-run por padrão — mesma convenção de todo script
 * operacional deste repositório.
 *
 * Uso:
 *   npx tsx scripts/catalog-recovery-run.ts               # dry-run (padrão)
 *   npx tsx scripts/catalog-recovery-run.ts --execute      # grava no banco
 */

import { getServiceClient } from "./lib/client";
import { SupabaseRecoveryRepository } from "../src/domains/connectors/infrastructure/SupabaseRecoveryRepository";
import { SupabaseCatalogRepository } from "../src/domains/connectors/infrastructure/SupabaseCatalogRepository";
import { MarketplaceMemoryService, SupabaseMerchantAttributePatternRepository, SupabaseLearnedFactRepository } from "../src/domains/marketplace-memory";
import { evaluateCandidate } from "../src/domains/connectors/services/CatalogRecoveryEngine";
import type { RecoveryDependencies } from "../src/domains/connectors/services/CatalogRecoveryEngine";
import type { RecordRecoveryDecisionInput } from "../src/domains/connectors/repositories/IRecoveryRepository";

const EXECUTE = process.argv.includes("--execute");
const PAGE_SIZE = 200;

async function main() {
  const startedAt = Date.now();
  console.log(`\n[catalog-recovery] Mode: ${EXECUTE ? "EXECUTE" : "DRY-RUN"}\n`);

  const supabase = getServiceClient();
  const recoveryRepo = new SupabaseRecoveryRepository(supabase);
  const catalogRepo = new SupabaseCatalogRepository(supabase);
  const marketplaceMemoryService = new MarketplaceMemoryService(
    new SupabaseLearnedFactRepository(supabase),
    new SupabaseMerchantAttributePatternRepository(supabase)
  );

  const deps: RecoveryDependencies = {
    findConfirmedByIdentifier: (type, value) => recoveryRepo.findConfirmedByIdentifier(type, value),
    findCanonicalLinkAttributes: (productId) => recoveryRepo.findCanonicalLinkAttributes(productId),
    findLearnedCorrection: async (storeId, rawValue, concept) => {
      const pattern = await marketplaceMemoryService.getPattern(storeId, rawValue);
      if (!pattern || pattern.concept !== concept) return null;
      return pattern.resolvedValue;
    },
    findBrandByNormalizedName: (n) => catalogRepo.findBrandByNormalizedName(n),
    findCategoryByNormalizedName: (n) => catalogRepo.findCategoryByNormalizedName(n),
  };

  const total = await recoveryRepo.countCandidates();
  console.log(`[catalog-recovery] Candidatos totais (brand ou category pendente): ${total}\n`);

  let audited = 0;
  let recoveredProducts = 0;
  const byLayer = { product_signature: 0, canonical_catalog: 0, merchant_memory: 0, universal_taxonomy: 0, brand_normalization: 0 };
  let pendingFields = 0;
  let conflicts = 0;
  let falsePositivesRejected = 0;

  let cursor: string | null = null;
  for (;;) {
    const batch = await recoveryRepo.fetchCandidates(cursor, PAGE_SIZE);
    if (batch.length === 0) break;
    cursor = batch[batch.length - 1].productId;

    for (const candidate of batch) {
      audited++;
      const result = await evaluateCandidate(candidate, deps);
      let anyRecoveredThisProduct = false;

      for (const [fieldType, decision] of [
        ["brand", result.brand],
        ["category", result.category],
      ] as const) {
        if (!decision) continue;

        if (decision.outcome === "recovered") {
          anyRecoveredThisProduct = true;
          byLayer[decision.layer]++;

          if (EXECUTE) {
            if (fieldType === "brand") await recoveryRepo.updateProductBrand(candidate.productId, decision.id);
            else await recoveryRepo.updateProductCategory(candidate.productId, decision.id);

            const decisionInput: RecordRecoveryDecisionInput = {
              productId: candidate.productId,
              fieldType,
              previousValue: fieldType === "brand" ? candidate.brandName : candidate.categoryName,
              layer: decision.layer,
              recoveredValue: decision.value,
              recoveredBrandId: fieldType === "brand" ? decision.id : null,
              recoveredCategoryId: fieldType === "category" ? decision.id : null,
              confidence: decision.confidence,
              evidence: decision.evidence,
            };
            await recoveryRepo.recordDecision(decisionInput);
          }
        } else {
          pendingFields++;
          if (decision.conflict) conflicts++;
          if (decision.reasons.some((r) => r.startsWith("rejected-forbidden"))) falsePositivesRejected++;

          if (EXECUTE) {
            await catalogRepo.createPendingReview({
              productId: candidate.productId,
              storeId: candidate.storeId,
              fieldType,
              rawValue: (fieldType === "brand" ? candidate.brandName : candidate.categoryName) ?? "",
              reasons: decision.reasons,
              payload: { productId: candidate.productId, name: candidate.name },
            });
          }
        }
      }

      if (anyRecoveredThisProduct) recoveredProducts++;
    }

    if (audited % 2000 === 0 || batch.length < PAGE_SIZE) {
      console.log(`[catalog-recovery] Progresso: ${audited} auditados, ${recoveredProducts} recuperados até agora...`);
    }
  }

  const durationMs = Date.now() - startedAt;

  console.log("\n" + "═".repeat(60));
  console.log("  CATALOG RECOVERY ENGINE — RELATÓRIO");
  console.log("═".repeat(60));
  console.log(`  Modo                          : ${EXECUTE ? "EXECUTE" : "DRY-RUN"}`);
  console.log(`  Produtos auditados            : ${audited}`);
  console.log(`  Produtos recuperados (1+ campo): ${recoveredProducts}`);
  console.log(`  Recuperados por ProductSignature: ${byLayer.product_signature}`);
  console.log(`  Recuperados por Canonical Catalog: ${byLayer.canonical_catalog}`);
  console.log(`  Recuperados por Merchant Memory : ${byLayer.merchant_memory}`);
  console.log(`  Recuperados por Universal Taxonomy: ${byLayer.universal_taxonomy}`);
  console.log(`  Recuperados por Brand Normalization: ${byLayer.brand_normalization}`);
  console.log(`  Campos ainda pendentes         : ${pendingFields}`);
  console.log(`  Falsos positivos detectados/bloqueados: ${falsePositivesRejected}`);
  console.log(`  Conflitos encontrados (camadas discordantes): ${conflicts}`);
  console.log(`  Tempo de execução              : ${(durationMs / 1000).toFixed(1)}s`);
  console.log("═".repeat(60) + "\n");
}

main().catch((err) => {
  console.error("[catalog-recovery] Fatal:", err);
  process.exit(1);
});
