import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConnectorHealthService, ConnectorHealthSummary } from "@/src/domains/connectors/services/ConnectorHealthService";
import { MarketplaceHealthFactor } from "../types/enums";
import { scoreMarketplaceHealth, type FactorInput } from "../scoring/HealthScoring";
import type { MarketplaceHealthBreakdown } from "../types/health.types";
import { getCatalogCounts, getCategoryCoverage } from "../metrics/CatalogMetrics";

// Epic 2 — Marketplace Health Engine. Composes 8 independently-fetched
// factors via Promise.allSettled (same isolation pattern as
// app/api/admin/platform-health/route.ts) so one failing sub-computation
// never breaks the whole score — a failed factor scores 0 with its failure
// reason recorded in `detail`, not silently dropped.
export class MarketplaceHealthEngine {
  constructor(
    private readonly client: SupabaseClient,
    private readonly connectorHealthService: ConnectorHealthService
  ) {}

  async compute(): Promise<MarketplaceHealthBreakdown> {
    const [connectorResult, coverageResult, canonicalResult, discoveryResult, claimsResult, analyticsResult] =
      await Promise.allSettled([
        this.connectorFactors(),
        this.coverageFactor(),
        this.canonicalCatalogFactor(),
        this.discoveryFactor(),
        this.claimsFactor(),
        this.analyticsBrainFactor(),
      ]);

    const inputs: FactorInput[] = [];

    if (connectorResult.status === "fulfilled") {
      inputs.push(...connectorResult.value);
    } else {
      inputs.push(
        errorFactor(MarketplaceHealthFactor.ConnectorHealth, connectorResult.reason),
        errorFactor(MarketplaceHealthFactor.ConnectorErrors, connectorResult.reason),
        errorFactor(MarketplaceHealthFactor.Freshness, connectorResult.reason)
      );
    }

    inputs.push(resolveOrError(coverageResult, MarketplaceHealthFactor.Coverage));
    inputs.push(resolveOrError(canonicalResult, MarketplaceHealthFactor.CanonicalCatalog));
    inputs.push(resolveOrError(discoveryResult, MarketplaceHealthFactor.Discovery));
    inputs.push(resolveOrError(claimsResult, MarketplaceHealthFactor.Claims));
    inputs.push(resolveOrError(analyticsResult, MarketplaceHealthFactor.AnalyticsBrainVolume));

    return scoreMarketplaceHealth(inputs);
  }

  // ConnectorHealth, ConnectorErrors and Freshness all derive from the same
  // ConnectorHealthService.getSummaries() call — computed together to avoid
  // fetching connector_sync_runs three times.
  private async connectorFactors(): Promise<FactorInput[]> {
    const summaries = await this.connectorHealthService.getSummaries();

    if (summaries.length === 0) {
      return [
        { factor: MarketplaceHealthFactor.ConnectorHealth, score: 100, detail: "Nenhum conector registrado ainda." },
        { factor: MarketplaceHealthFactor.ConnectorErrors, score: 100, detail: "Nenhum conector registrado ainda." },
        {
          factor: MarketplaceHealthFactor.Freshness,
          score: 0,
          detail: "Nenhum conector com sincronização registrada — ausência de sincronização é, ela mesma, um problema de frescor.",
        },
      ];
    }

    const avgHealth = Math.round(summaries.reduce((sum, s) => sum + s.healthScore, 0) / summaries.length);
    const avgErrorRate = summaries.reduce((sum, s) => sum + s.errorRate, 0) / summaries.length;
    const avgFreshness = Math.round(
      summaries.reduce((sum, s) => sum + freshnessScoreFor(s), 0) / summaries.length
    );

    return [
      {
        factor: MarketplaceHealthFactor.ConnectorHealth,
        score: avgHealth,
        detail: `Média de ${summaries.length} conector(es): ${avgHealth}/100.`,
      },
      {
        factor: MarketplaceHealthFactor.ConnectorErrors,
        score: Math.round((1 - avgErrorRate) * 100),
        detail: `Taxa de erro média: ${(avgErrorRate * 100).toFixed(1)}%.`,
      },
      {
        factor: MarketplaceHealthFactor.Freshness,
        score: avgFreshness,
        detail: `Recência média de sincronização entre ${summaries.length} conector(es).`,
      },
    ];
  }

  private async coverageFactor(): Promise<FactorInput> {
    const categories = await getCategoryCoverage(this.client);
    if (categories.length === 0) {
      return { factor: MarketplaceHealthFactor.Coverage, score: 0, detail: "Nenhuma categoria cadastrada." };
    }
    const covered = categories.filter((c) => c.productCount > 0).length;
    const score = Math.round((covered / categories.length) * 100);
    return {
      factor: MarketplaceHealthFactor.Coverage,
      score,
      detail: `${covered}/${categories.length} categorias com pelo menos 1 produto.`,
    };
  }

  private async canonicalCatalogFactor(): Promise<FactorInput> {
    const [catalogCounts, pendingRes] = await Promise.all([
      getCatalogCounts(this.client),
      this.client.from("merge_candidates").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);
    const pending = pendingRes.count ?? 0;
    return {
      factor: MarketplaceHealthFactor.CanonicalCatalog,
      score: catalogCounts.canonicalBootstrapPct,
      detail: `${catalogCounts.canonicalBootstrapPct}% das ofertas vinculadas a um canonical product; ${pending} merge candidate(s) pendente(s) de revisão.`,
    };
  }

  private async discoveryFactor(): Promise<FactorInput> {
    const { data } = await this.client
      .from("stores")
      .select("discovered_at")
      .not("discovered_at", "is", null)
      .order("discovered_at", { ascending: false })
      .limit(1);

    const last = (data?.[0] as { discovered_at: string } | undefined)?.discovered_at;
    if (!last) {
      return { factor: MarketplaceHealthFactor.Discovery, score: 0, detail: "Nenhuma loja descoberta via Discovery ainda." };
    }

    const days = (Date.now() - new Date(last).getTime()) / (1000 * 60 * 60 * 24);
    const score = days <= 7 ? 100 : days <= 30 ? 60 : days <= 90 ? 30 : 10;
    return { factor: MarketplaceHealthFactor.Discovery, score, detail: `Última loja descoberta há ${Math.round(days)} dia(s).` };
  }

  private async claimsFactor(): Promise<FactorInput> {
    const { data } = await this.client.from("store_claims").select("status");
    const claims = (data ?? []) as { status: string }[];

    if (claims.length === 0) {
      return { factor: MarketplaceHealthFactor.Claims, score: 100, detail: "Nenhuma claim registrada ainda." };
    }

    const approved = claims.filter((c) => c.status === "approved").length;
    const pending = claims.filter((c) => c.status === "pending" || c.status === "awaiting_review").length;
    const approvalRate = Math.round((approved / claims.length) * 100);
    const pendingPenalty = Math.min(30, pending * 5);
    const score = Math.max(0, approvalRate - pendingPenalty);

    return {
      factor: MarketplaceHealthFactor.Claims,
      score,
      detail: `${approved}/${claims.length} claims aprovadas; ${pending} pendente(s) de revisão.`,
    };
  }

  private async analyticsBrainFactor(): Promise<FactorInput> {
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [buyerRes, brainRes] = await Promise.all([
      this.client.from("buyer_events").select("id", { count: "exact", head: true }).gte("occurred_at", since7d),
      this.client.from("merchant_trust_events").select("id", { count: "exact", head: true }).gte("created_at", since7d),
    ]);

    const buyerEvents = buyerRes.count ?? 0;
    const brainEvents = brainRes.count ?? 0;
    const score = buyerEvents > 0 && brainEvents > 0 ? 100 : buyerEvents > 0 || brainEvents > 0 ? 50 : 0;

    return {
      factor: MarketplaceHealthFactor.AnalyticsBrainVolume,
      score,
      detail: `${buyerEvents} evento(s) de comprador e ${brainEvents} evento(s) de Brain nos últimos 7 dias.`,
    };
  }
}

function freshnessScoreFor(summary: ConnectorHealthSummary): number {
  if (!summary.lastSyncAt) return 0;
  const ageHours = (Date.now() - new Date(summary.lastSyncAt).getTime()) / (1000 * 60 * 60);
  if (ageHours <= 24) return 100;
  if (ageHours <= 24 * 7) return 60;
  if (ageHours <= 24 * 30) return 20;
  return 0;
}

function resolveOrError(result: PromiseSettledResult<FactorInput>, factor: MarketplaceHealthFactor): FactorInput {
  if (result.status === "fulfilled") return result.value;
  return errorFactor(factor, result.reason);
}

function errorFactor(factor: MarketplaceHealthFactor, reason: unknown): FactorInput {
  return { factor, score: 0, detail: `Falha ao computar este fator: ${String(reason)}` };
}
