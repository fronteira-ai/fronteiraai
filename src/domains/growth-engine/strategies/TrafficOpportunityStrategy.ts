import { GrowthCategory, GrowthStrategyType, GrowthPriority, GrowthEffort, OpportunityCategory, PlanTier } from "../types/enums";
import type { GrowthStrategy } from "./GrowthStrategy";
import type { GrowthContext } from "../domain/GrowthContext";
import type { DraftRecommendation } from "../types/growth.types";
import { draft, evidence } from "./strategy-helpers";

export class TrafficOpportunityStrategy implements GrowthStrategy {
  readonly id = GrowthStrategyType.TrafficOpportunity;
  readonly name = "Oportunidade de Tráfego";
  readonly category = GrowthCategory.Traffic;

  evaluate(ctx: GrowthContext): DraftRecommendation[] {
    const recs: DraftRecommendation[] = [];
    const { analytics } = ctx;
    const mid = ctx.merchant.id;

    if (analytics.unique_visitors > 20 && analytics.ctr < 3) {
      recs.push(draft(this.id, mid, {
        strategy_id: this.id,
        category: this.category,
        subcategory: "improve_conversion",
        title: "Visitantes chegam mas não convertem",
        description: `${analytics.unique_visitors} visitantes únicos, mas CTR de apenas ${analytics.ctr.toFixed(1)}%. Há tráfego desperdiçado.`,
        explanation: "Quando visitantes chegam mas não clicam nos produtos, o problema geralmente está na apresentação: título, imagem ou preço não estão convencendo.",
        evidence: [
          evidence("Visitantes únicos", analytics.unique_visitors),
          evidence("CTR", analytics.ctr.toFixed(1), "%"),
          evidence("Cliques gerados", analytics.product_clicks),
        ],
        data_sources: ["analytics"],
        expected_impact: "Cada 1% de melhora no CTR gera tráfego adicional sem custo",
        estimated_effort: GrowthEffort.Hours,
        estimated_minutes: 60,
        priority: GrowthPriority.High,
        expires_at: null,
        action_url: "/merchant/catalog",
        action_label: "Otimizar apresentação dos produtos",
        moat_strengthened: ["Dados Proprietários", "Histórico Acumulado"],
        asset_strengthened: ["Buyer Behavioral Knowledge", "Search Intelligence"],
        opportunity_category: OpportunityCategory.HighDemand,
      }, PlanTier.Premium));
    }

    if (analytics.product_impressions > 100 && analytics.offer_saves < analytics.product_impressions * 0.03) {
      recs.push(draft(this.id, mid, {
        strategy_id: this.id,
        category: this.category,
        subcategory: "boost_engagement",
        title: "Engajamento de produtos abaixo do esperado",
        description: `${analytics.product_impressions} impressões geraram apenas ${analytics.offer_saves} favoritos — taxa de favoritos abaixo de 3%.`,
        explanation: "Salvar uma oferta indica intenção de compra futura. Taxa baixa significa que os produtos não estão convencendo no primeiro contato.",
        evidence: [
          evidence("Impressões", analytics.product_impressions),
          evidence("Ofertas salvas", analytics.offer_saves),
          evidence("Taxa de favoritos", ((analytics.offer_saves / Math.max(analytics.product_impressions, 1)) * 100).toFixed(1), "%"),
        ],
        data_sources: ["analytics"],
        expected_impact: "Mais compradores favorecendo ofertas aumenta o pipeline de vendas futuras",
        estimated_effort: GrowthEffort.Hours,
        estimated_minutes: 45,
        priority: GrowthPriority.Medium,
        expires_at: null,
        action_url: "/merchant/catalog",
        action_label: "Melhorar engajamento",
        moat_strengthened: ["Dados Proprietários"],
        asset_strengthened: ["Buyer Behavioral Knowledge", "Historical Data"],
        opportunity_category: OpportunityCategory.NeglectedProduct,
      }, PlanTier.Premium));
    }

    return recs;
  }
}
