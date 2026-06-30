import { GrowthCategory, GrowthStrategyType, GrowthPriority, GrowthEffort, OpportunityCategory, PlanTier } from "../types/enums";
import type { GrowthStrategy } from "./GrowthStrategy";
import type { GrowthContext } from "../domain/GrowthContext";
import type { DraftRecommendation } from "../types/growth.types";
import { draft, evidence } from "./strategy-helpers";

export class PricingOpportunityStrategy implements GrowthStrategy {
  readonly id = GrowthStrategyType.PricingOpportunity;
  readonly name = "Oportunidade de Precificação";
  readonly category = GrowthCategory.Pricing;

  evaluate(ctx: GrowthContext): DraftRecommendation[] {
    const recs: DraftRecommendation[] = [];
    const { analytics } = ctx;
    const mid = ctx.merchant.id;

    const hasEnoughTraffic = analytics.views > 50;
    const contactRate = analytics.views > 0 ? analytics.contact_clicks / analytics.views : 0;
    const saveRate = analytics.product_impressions > 0 ? analytics.offer_saves / analytics.product_impressions : 0;

    if (hasEnoughTraffic && contactRate < 0.03) {
      recs.push(draft(this.id, mid, {
        strategy_id: this.id,
        category: this.category,
        subcategory: "competitive_review",
        title: "Revisar competitividade de preços",
        description: `Você tem ${analytics.views} visitas mas apenas ${analytics.contact_clicks} contatos (${(contactRate * 100).toFixed(1)}%). Preço pode ser uma barreira.`,
        explanation: "Quando visitantes não entram em contato apesar de chegarem à página, o preço frequentemente é o fator decisivo. Uma revisão de competitividade pode desbloquear conversões.",
        evidence: [
          evidence("Visitas no período", analytics.views),
          evidence("Contatos gerados", analytics.contact_clicks),
          evidence("Taxa de contato", (contactRate * 100).toFixed(1), "%"),
        ],
        data_sources: ["analytics"],
        expected_impact: "Aumento de 20-40% em contatos ao alinhar preço com mercado",
        estimated_effort: GrowthEffort.Hours,
        estimated_minutes: 45,
        priority: GrowthPriority.Medium,
        expires_at: null,
        action_url: "/merchant/catalog",
        action_label: "Revisar preços",
        moat_strengthened: ["Dados Proprietários", "Histórico Acumulado"],
        asset_strengthened: ["Buyer Behavioral Knowledge", "Historical Data"],
        opportunity_category: OpportunityCategory.StrategicProduct,
      }, PlanTier.Premium));
    }

    if (analytics.product_impressions > 100 && saveRate < 0.01) {
      recs.push(draft(this.id, mid, {
        strategy_id: this.id,
        category: this.category,
        subcategory: "save_rate",
        title: "Produtos com baixa taxa de favoritos",
        description: `${analytics.product_impressions} impressões geraram apenas ${analytics.offer_saves} favoritos. Compradores vêem mas não salvam.`,
        explanation: "Salvar uma oferta é o primeiro passo da jornada de compra. Taxa baixa indica que o preço ou a descrição não convenceu no primeiro momento.",
        evidence: [
          evidence("Impressões de produtos", analytics.product_impressions),
          evidence("Ofertas salvas", analytics.offer_saves),
          evidence("Taxa de salvamento", (saveRate * 100).toFixed(2), "%"),
        ],
        data_sources: ["analytics"],
        expected_impact: "Melhora no funil de conversão — mais compradores salvando para comparar",
        estimated_effort: GrowthEffort.Hours,
        estimated_minutes: 30,
        priority: GrowthPriority.Low,
        expires_at: null,
        action_url: "/merchant/catalog",
        action_label: "Ver análise de produtos",
        moat_strengthened: ["Dados Proprietários"],
        asset_strengthened: ["Buyer Behavioral Knowledge", "Historical Data"],
        opportunity_category: OpportunityCategory.StrategicProduct,
      }, PlanTier.Premium));
    }

    return recs;
  }
}
