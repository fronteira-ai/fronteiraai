import { GrowthCategory, GrowthStrategyType, GrowthPriority, GrowthEffort, OpportunityCategory, PlanTier } from "../types/enums";
import type { GrowthStrategy } from "./GrowthStrategy";
import type { GrowthContext } from "../domain/GrowthContext";
import type { DraftRecommendation } from "../types/growth.types";
import { draft, evidence } from "./strategy-helpers";

export class DemandOpportunityStrategy implements GrowthStrategy {
  readonly id = GrowthStrategyType.DemandOpportunity;
  readonly name = "Oportunidade de Demanda";
  readonly category = GrowthCategory.Demand;

  evaluate(ctx: GrowthContext): DraftRecommendation[] {
    const recs: DraftRecommendation[] = [];
    const { summary, analytics } = ctx;
    const mid = ctx.merchant.id;

    const hasOrganicTraffic = analytics.product_impressions > 0;
    const hasFewProducts = summary.totalProducts < 30 && summary.totalProducts > 0;

    if (hasOrganicTraffic && hasFewProducts) {
      recs.push(draft(this.id, mid, {
        strategy_id: this.id,
        category: this.category,
        subcategory: "expand_to_demand",
        title: "Há demanda além do seu catálogo atual",
        description: `Você recebe ${analytics.product_impressions} impressões com apenas ${summary.totalProducts} produtos. Há compradores buscando mais do que você oferece.`,
        explanation: "Quando um catálogo pequeno gera tráfego significativo, é sinal de que há demanda reprimida. Ampliar o catálogo captura essa demanda.",
        evidence: [
          evidence("Impressões geradas", analytics.product_impressions),
          evidence("Produtos atuais", summary.totalProducts),
          evidence("Impressões por produto", Math.round(analytics.product_impressions / Math.max(summary.totalProducts, 1))),
        ],
        data_sources: ["executive_summary", "analytics"],
        expected_impact: "Cada novo produto pode capturar impressões adicionais da mesma demanda existente",
        estimated_effort: GrowthEffort.Days,
        estimated_minutes: 180,
        priority: GrowthPriority.High,
        expires_at: null,
        action_url: "/merchant/imports/new",
        action_label: "Expandir catálogo",
        moat_strengthened: ["Rede de Catálogos", "Dados Proprietários", "Histórico Acumulado"],
        asset_strengthened: ["Merchant Knowledge", "Buyer Behavioral Knowledge", "Search Intelligence"],
        opportunity_category: OpportunityCategory.HighDemand,
      }, PlanTier.Premium));
    }

    if (analytics.views > 0 && analytics.unique_visitors > analytics.views * 0.7) {
      recs.push(draft(this.id, mid, {
        strategy_id: this.id,
        category: this.category,
        subcategory: "new_visitors",
        title: "Maioria dos seus visitantes é nova — janela de crescimento aberta",
        description: `${analytics.unique_visitors} de ${analytics.views} visitas são de novos compradores. Primeira impressão é decisiva.`,
        explanation: "Alta proporção de novos visitantes indica que sua loja está sendo descoberta. É a janela ideal para investir em qualidade e confiança.",
        evidence: [
          evidence("Visitantes únicos", analytics.unique_visitors),
          evidence("Total de visitas", analytics.views),
          evidence("Taxa de novos visitantes", Math.round((analytics.unique_visitors / Math.max(analytics.views, 1)) * 100), "%"),
        ],
        data_sources: ["analytics"],
        expected_impact: "Converter visitantes novos em contatos ou favoritos recorrentes",
        estimated_effort: GrowthEffort.Hours,
        estimated_minutes: 60,
        priority: GrowthPriority.Medium,
        expires_at: null,
        action_url: "/merchant/catalog",
        action_label: "Preparar primeira impressão",
        moat_strengthened: ["Dados Proprietários", "Rede de Compradores"],
        asset_strengthened: ["Buyer Behavioral Knowledge", "Historical Data"],
        opportunity_category: OpportunityCategory.GrowingCategory,
      }, PlanTier.Premium));
    }

    return recs;
  }
}
