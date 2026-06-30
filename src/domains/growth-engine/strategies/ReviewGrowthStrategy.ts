import { GrowthCategory, GrowthStrategyType, GrowthPriority, GrowthEffort, OpportunityCategory, PlanTier } from "../types/enums";
import type { GrowthStrategy } from "./GrowthStrategy";
import type { GrowthContext } from "../domain/GrowthContext";
import type { DraftRecommendation } from "../types/growth.types";
import { draft, evidence } from "./strategy-helpers";

export class ReviewGrowthStrategy implements GrowthStrategy {
  readonly id = GrowthStrategyType.ReviewGrowth;
  readonly name = "Crescimento de Avaliações";
  readonly category = GrowthCategory.Review;

  evaluate(ctx: GrowthContext): DraftRecommendation[] {
    const recs: DraftRecommendation[] = [];
    const { summary } = ctx;
    const mid = ctx.merchant.id;

    if (summary.totalReviews === 0 && summary.totalProducts > 0) {
      recs.push(draft(this.id, mid, {
        strategy_id: this.id,
        category: this.category,
        subcategory: "get_first_reviews",
        title: "Solicitar as primeiras avaliações de clientes",
        description: "Sua loja ainda não tem avaliações. Compradores confiam mais em lojas com avaliações reais.",
        explanation: "A primeira avaliação é a mais difícil e a mais valiosa. Lojas com pelo menos 3 avaliações têm 40% mais conversão que lojas sem nenhuma.",
        evidence: [
          evidence("Avaliações recebidas", 0),
          evidence("Produtos com vendas possíveis", summary.totalProducts),
        ],
        data_sources: ["executive_summary"],
        expected_impact: "Aumento de 40% na confiança dos compradores — mesmo com apenas 1 avaliação",
        estimated_effort: GrowthEffort.Minutes,
        estimated_minutes: 5,
        priority: GrowthPriority.Medium,
        expires_at: null,
        action_url: "/merchant/dashboard",
        action_label: "Ver como solicitar avaliações",
        moat_strengthened: ["Confiança", "Histórico Acumulado", "Dados Proprietários"],
        asset_strengthened: ["Merchant Knowledge", "Buyer Behavioral Knowledge", "Knowledge Graph"],
        opportunity_category: OpportunityCategory.IncompleteProfile,
      }, PlanTier.Free));
    }

    if (summary.totalReviews > 0 && summary.averageRating !== null && summary.averageRating < 4.0) {
      recs.push(draft(this.id, mid, {
        strategy_id: this.id,
        category: this.category,
        subcategory: "improve_rating",
        title: `Melhorar avaliação média (atual: ${summary.averageRating.toFixed(1)}/5.0)`,
        description: `Avaliação ${summary.averageRating.toFixed(1)} está abaixo do recomendado. Responder avaliações negativas demonstra cuidado com o cliente.`,
        explanation: "Responder avaliações — especialmente as negativas — mostra que a loja é ativa e se preocupa com a experiência do cliente.",
        evidence: [
          evidence("Avaliação média", summary.averageRating.toFixed(1), "/5.0"),
          evidence("Total de avaliações", summary.totalReviews),
          evidence("Meta", "4.0+"),
        ],
        data_sources: ["executive_summary"],
        expected_impact: "Aumento de 0.5 ponto na avaliação melhora conversão em até 25%",
        estimated_effort: GrowthEffort.Minutes,
        estimated_minutes: 20,
        priority: GrowthPriority.High,
        expires_at: null,
        action_url: "/merchant/dashboard",
        action_label: "Ver avaliações para responder",
        moat_strengthened: ["Confiança", "Histórico Acumulado"],
        asset_strengthened: ["Merchant Knowledge", "Knowledge Graph"],
        opportunity_category: null,
      }, PlanTier.Free));
    }

    return recs;
  }
}
