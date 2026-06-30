import { GrowthCategory, GrowthStrategyType, GrowthPriority, GrowthEffort, OpportunityCategory, PlanTier } from "../types/enums";
import type { GrowthStrategy } from "./GrowthStrategy";
import type { GrowthContext } from "../domain/GrowthContext";
import type { DraftRecommendation } from "../types/growth.types";
import { draft, evidence } from "./strategy-helpers";

export class VisibilityGrowthStrategy implements GrowthStrategy {
  readonly id = GrowthStrategyType.Visibility;
  readonly name = "Visibilidade nas Buscas";
  readonly category = GrowthCategory.Visibility;

  evaluate(ctx: GrowthContext): DraftRecommendation[] {
    const recs: DraftRecommendation[] = [];
    const { summary, catalog, analytics } = ctx;
    const mid = ctx.merchant.id;

    const incompletePct = summary.totalProducts > 0
      ? summary.incompleteProducts / summary.totalProducts
      : 0;

    if (incompletePct > 0.3 && summary.totalProducts > 0) {
      recs.push(draft(this.id, mid, {
        strategy_id: this.id,
        category: this.category,
        subcategory: "search_coverage",
        title: `${Math.round(incompletePct * 100)}% do catálogo está oculto nas buscas`,
        description: `${summary.incompleteProducts} de ${summary.totalProducts} produtos têm dados incompletos e perdem visibilidade nos filtros de busca.`,
        explanation: "Filtros de categoria, marca e faixa de preço só funcionam se esses campos estiverem preenchidos. Produtos incompletos ficam invisíveis.",
        evidence: [
          evidence("Produtos sem visibilidade total", summary.incompleteProducts),
          evidence("% do catálogo afetado", Math.round(incompletePct * 100), "%"),
          evidence("Score de saúde", catalog.healthScore, "%"),
        ],
        data_sources: ["executive_summary", "catalog_intelligence"],
        expected_impact: "Aumento de 40-60% em impressões ao completar os campos ausentes",
        estimated_effort: GrowthEffort.Hours,
        estimated_minutes: Math.min(summary.incompleteProducts * 2, 90),
        priority: incompletePct > 0.5 ? GrowthPriority.High : GrowthPriority.Medium,
        expires_at: null,
        action_url: "/merchant/catalog",
        action_label: "Ver produtos com baixa visibilidade",
        moat_strengthened: ["Dados Proprietários", "Qualidade de Catálogo"],
        asset_strengthened: ["Search Intelligence", "Merchant Knowledge"],
        opportunity_category: OpportunityCategory.LowCoverage,
      }, PlanTier.Free));
    }

    if (analytics.ctr < 5 && analytics.product_impressions > 50) {
      recs.push(draft(this.id, mid, {
        strategy_id: this.id,
        category: this.category,
        subcategory: "ctr_optimization",
        title: `Taxa de clique baixa — apenas ${analytics.ctr.toFixed(1)}% dos que vêem seus produtos clicam`,
        description: "Seus produtos aparecem nas buscas mas os compradores não estão clicando. Isso indica que título, foto ou preço precisam melhorar.",
        explanation: "CTR baixo significa que sua oferta não está convencendo o comprador no primeiro contato — o momento mais crítico.",
        evidence: [
          evidence("CTR atual", analytics.ctr.toFixed(1), "%"),
          evidence("Impressões no período", analytics.product_impressions),
          evidence("Cliques gerados", analytics.product_clicks),
        ],
        data_sources: ["analytics"],
        expected_impact: "Dobrar o CTR pode dobrar o tráfego sem mudar o número de impressões",
        estimated_effort: GrowthEffort.Hours,
        estimated_minutes: 45,
        priority: GrowthPriority.High,
        expires_at: null,
        action_url: "/merchant/catalog",
        action_label: "Otimizar títulos e fotos",
        moat_strengthened: ["Qualidade de Catálogo", "Dados Proprietários"],
        asset_strengthened: ["Buyer Behavioral Knowledge", "Search Intelligence"],
        opportunity_category: OpportunityCategory.NeglectedProduct,
      }, PlanTier.Premium));
    }

    return recs;
  }
}
