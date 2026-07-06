import type { SupabaseClient } from "@supabase/supabase-js";
import { Currency } from "@/src/domains/exchange/enums/Currency";
import { getHealthBreakdown, scoreOffer } from "@/src/domains/catalog-intelligence/services/ProductHealthService";
import type { ProductHealthRecord } from "@/src/domains/catalog-intelligence/types/catalog-intelligence.types";
import type {
  CertificationCriterionKey,
  CertificationCriterionResult,
  CertificationReport,
  ConnectorQualityScore,
} from "@/src/domains/connectors/certification/types";
import { createConnectorsServices } from "./connectors-factory";
import { createMarketplaceOperationsServices } from "./marketplace-operations-factory";
import { createRealtimeCommerceServices } from "./realtime-commerce-factory";
import { createExchangeServices } from "./exchange-factory";
import { fetchStoreOfferCatalog, type StoreOfferCatalogRow } from "./connector-store-catalog-query";

// Certification Framework + Connector Quality Score (Release 1.8 — Program A
// — Wave 5, Connector Platform V2). Composes services from FIVE domains
// (connectors, catalog-intelligence, marketplace-operations, realtime-commerce,
// exchange) — this cannot live inside src/domains/connectors/ because
// marketplace-operations already depends on connectors (ConnectorHealthService),
// so connectors depending back on marketplace-operations would be circular.
// This is the same "bridge lives one layer up" rule already applied to
// lib/exchange-trust-bridge.ts — connectors/certification/types.ts owns the
// vocabulary, this file owns the cross-domain composition.
//
// Deferred from Wave 3 (docs/marketplace/Tier1_Merchants.md §1/§3, "Overall
// Certification Score... nenhum código foi escrito") — built now that the
// Real-Time Commerce/Exchange/Marketplace Operations tables are actually
// live in production (migrations pushed in Wave 4).

export class ConnectorCertificationService {
  constructor(private readonly client: SupabaseClient) {}

  async certify(connectorId: string, storeSlug: string): Promise<CertificationReport> {
    const { catalogRepo } = createConnectorsServices(this.client);
    const storeId = await catalogRepo.findStoreIdBySlug(storeSlug);

    if (!storeId) {
      return {
        connectorId,
        storeId: "",
        storeSlug,
        criteria: [],
        certified: false,
        evaluatedCount: 0,
        passedCount: 0,
        generatedAt: new Date().toISOString(),
      };
    }

    const offers = await fetchStoreOfferCatalog(this.client, storeId);
    const criteria = await this.evaluateCriteria(connectorId, storeId, storeSlug, offers);

    const evaluated = criteria.filter((c) => c.passed !== null);
    const passed = evaluated.filter((c) => c.passed === true);

    return {
      connectorId,
      storeId,
      storeSlug,
      criteria,
      certified: evaluated.length > 0 && passed.length === evaluated.length,
      evaluatedCount: evaluated.length,
      passedCount: passed.length,
      generatedAt: new Date().toISOString(),
    };
  }

  async computeQualityScore(connectorId: string, storeSlug: string): Promise<ConnectorQualityScore | null> {
    const { catalogRepo, healthService: connectorHealthService } = createConnectorsServices(this.client);
    const storeId = await catalogRepo.findStoreIdBySlug(storeSlug);
    if (!storeId) return null;

    const offers = await fetchStoreOfferCatalog(this.client, storeId);

    const [healthSummaries, storeUpdateProfile] = await Promise.all([
      connectorHealthService.getSummaries(),
      createRealtimeCommerceServices(this.client).storeUpdateService.computeForStore(storeId, storeSlug),
    ]);

    const health = healthSummaries.find((h) => h.connectorKey === connectorId);
    const reliability = health?.healthScore ?? 0;

    const records = this.toHealthRecords(offers);
    const completeness = records.length > 0 ? getHealthBreakdown(records).health_score : 0;

    const canonicalMatch =
      offers.length > 0 ? Math.round((offers.filter((o) => o.canonical_product_id).length / offers.length) * 100) : 0;

    const freshness = storeUpdateProfile.avgFreshnessScore;

    const factors = { reliability, completeness, canonicalMatch, freshness };
    const score = Math.round((reliability + completeness + canonicalMatch + freshness) / 4);

    return { connectorId, storeId, score, factors, generatedAt: new Date().toISOString() };
  }

  private toHealthRecords(offers: StoreOfferCatalogRow[]): ProductHealthRecord[] {
    return offers.map((o) => {
      const { score, status, diagnoses } = scoreOffer(o);
      return {
        offer_id: o.id,
        product_id: o.products.id,
        product_name: o.products.name,
        image_url: o.products.image_url,
        price_usd: o.price_usd,
        in_stock: o.in_stock,
        status,
        score,
        diagnoses,
        action_href: "/merchant/catalog",
      };
    });
  }

  private async evaluateCriteria(
    connectorId: string,
    storeId: string,
    storeSlug: string,
    offers: StoreOfferCatalogRow[]
  ): Promise<CertificationCriterionResult[]> {
    const productIds = new Set(offers.map((o) => o.products.id));
    const categoryIds = new Set(offers.map((o) => o.products.category_id).filter(Boolean));
    const brandIds = new Set(offers.map((o) => o.products.brand_id).filter(Boolean));
    const withImage = offers.filter((o) => o.products.image_url).length;
    const currencies = new Set(offers.map((o) => o.currency));
    const withCanonical = offers.filter((o) => o.canonical_product_id).length;

    const results: CertificationCriterionResult[] = [
      criterion("products", "Produtos", productIds.size > 0, `${productIds.size} produtos distintos`),
      criterion("offers", "Ofertas", offers.length > 0, `${offers.length} ofertas`),
      criterion("categories", "Categorias", categoryIds.size > 0, `${categoryIds.size} categorias distintas`),
      criterion("brands", "Marcas", brandIds.size > 0, `${brandIds.size} marcas distintas`),
      criterion(
        "images",
        "Imagens",
        offers.length > 0 && withImage / offers.length >= 0.5,
        `${withImage}/${offers.length} ofertas com imagem`
      ),
      criterion(
        "currency",
        "Moeda",
        offers.length > 0 && currencies.size > 0 && !offers.some((o) => !o.currency),
        `moeda(s) declarada(s): ${[...currencies].join(", ") || "nenhuma"}`
      ),
      await this.freshnessCriterion(storeId, storeSlug),
      criterion(
        "canonicalMatch",
        "Canonical Match",
        offers.length > 0 && withCanonical > 0,
        `${withCanonical}/${offers.length} ofertas com produto canônico vinculado`
      ),
      await this.exchangeCriterion(offers),
      await this.marketplaceOperationsCriterion(connectorId, storeId),
      // Analytics/Brain: not evaluated — see docs/engineering/CONNECTOR_PLATFORM_V2.md §7.
      // Requires a real merchant_id link (buyer_events/Brain both key on it);
      // most Tier 1 stores are not claimed yet (same structural gap named
      // since Program 0 Wave 0). Reporting `false` would misrepresent an
      // absent link as a failed check.
      { key: "analytics", label: "Analytics", passed: null, evidence: "Não avaliado — loja sem merchant vinculado" },
      { key: "brain", label: "Brain", passed: null, evidence: "Não avaliado — loja sem merchant vinculado" },
      await this.changeDetectionCriterion(storeId),
    ];

    return results;
  }

  private async freshnessCriterion(storeId: string, storeSlug: string): Promise<CertificationCriterionResult> {
    const { storeUpdateService } = createRealtimeCommerceServices(this.client);
    const profile = await storeUpdateService.computeForStore(storeId, storeSlug);
    return criterion(
      "freshness",
      "Atualização (Freshness)",
      profile.sampleSize > 0 && profile.avgFreshnessScore > 0,
      `Freshness médio: ${profile.avgFreshnessScore}/100 (${profile.sampleSize} mudanças na janela)`
    );
  }

  private async exchangeCriterion(offers: StoreOfferCatalogRow[]): Promise<CertificationCriterionResult> {
    if (offers.length === 0) {
      return criterion("exchange", "Exchange", false, "Sem ofertas para verificar conversão de moeda");
    }

    const nonUsd = offers.find((o) => o.currency && o.currency !== Currency.USD);
    if (!nonUsd) {
      return criterion("exchange", "Exchange", true, "Todas as ofertas já em USD — conversão não é necessária");
    }

    try {
      const { currencyService } = createExchangeServices(this.client);
      await currencyService.convert({
        amountOriginal: nonUsd.price_usd,
        currencyOriginal: nonUsd.currency as Currency,
        targetCurrency: Currency.USD,
      });
      return criterion("exchange", "Exchange", true, `Conversão ${nonUsd.currency}→USD resolvida com sucesso`);
    } catch (err) {
      return criterion("exchange", "Exchange", false, `Falha ao converter ${nonUsd.currency}→USD: ${String(err)}`);
    }
  }

  private async marketplaceOperationsCriterion(connectorId: string, storeId: string): Promise<CertificationCriterionResult> {
    const { alertService } = createMarketplaceOperationsServices(this.client);
    const pending = await alertService.list();
    const openAlert = pending.find(
      (a) =>
        (a.subjectType === "store" && a.subjectId === storeId) ||
        (a.subjectType === "connector" && a.subjectId === connectorId)
    );

    return criterion(
      "marketplaceOperations",
      "Marketplace Operations",
      !openAlert,
      openAlert ? `Alerta aberto: ${openAlert.title}` : "Nenhum alerta operacional aberto para esta loja/conector"
    );
  }

  private async changeDetectionCriterion(storeId: string): Promise<CertificationCriterionResult> {
    const { changeRepo } = createRealtimeCommerceServices(this.client);
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    const changes = await changeRepo.listForStore(storeId, from, to, 1);

    return criterion(
      "changeDetection",
      "Change Detection",
      changes.length > 0,
      changes.length > 0
        ? `Ao menos 1 mudança registrada em market_changes nos últimos 30 dias`
        : "Nenhuma mudança registrada em market_changes nos últimos 30 dias"
    );
  }
}

function criterion(
  key: CertificationCriterionKey,
  label: string,
  passed: boolean,
  evidence: string
): CertificationCriterionResult {
  return { key, label, passed, evidence };
}
