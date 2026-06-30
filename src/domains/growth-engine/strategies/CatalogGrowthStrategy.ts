import { GrowthCategory, GrowthStrategyType, GrowthPriority, GrowthEffort, OpportunityCategory, PlanTier } from "../types/enums";
import type { GrowthStrategy } from "./GrowthStrategy";
import type { GrowthContext } from "../domain/GrowthContext";
import type { DraftRecommendation } from "../types/growth.types";
import { draft, evidence } from "./strategy-helpers";

export class CatalogGrowthStrategy implements GrowthStrategy {
  readonly id = GrowthStrategyType.CatalogGrowth;
  readonly name = "Crescimento de Catálogo";
  readonly category = GrowthCategory.Catalog;

  evaluate(ctx: GrowthContext): DraftRecommendation[] {
    const recs: DraftRecommendation[] = [];
    const { summary, catalog } = ctx;
    const mid = ctx.merchant.id;

    if (summary.totalProducts === 0) {
      recs.push(draft(this.id, mid, {
        strategy_id: this.id,
        category: this.category,
        subcategory: "first_import",
        title: "Publicar seus primeiros produtos",
        description: "Sua loja ainda não tem produtos. Sem produtos, você não aparece em nenhuma busca.",
        explanation: "Produtos são o pré-requisito de tudo. Sem catálogo, nenhuma outra estratégia funciona.",
        evidence: [evidence("Produtos publicados", 0)],
        data_sources: ["executive_summary"],
        expected_impact: "Começar a aparecer nas buscas do ParaguAI",
        estimated_effort: GrowthEffort.Hours,
        estimated_minutes: 30,
        priority: GrowthPriority.Critical,
        expires_at: null,
        action_url: "/merchant/imports/new",
        action_label: "Importar produtos agora",
        moat_strengthened: ["Dados Proprietários", "Rede de Catálogos"],
        asset_strengthened: ["Merchant Knowledge", "Search Intelligence"],
        opportunity_category: OpportunityCategory.IncompleteCatalog,
      }, PlanTier.Free));
      return recs;
    }

    if (summary.incompleteProducts > 0) {
      const isUrgent = summary.incompleteProducts > 10;
      recs.push(draft(this.id, mid, {
        strategy_id: this.id,
        category: this.category,
        subcategory: "completeness",
        title: `Completar dados de ${summary.incompleteProducts} produto(s)`,
        description: `${summary.incompleteProducts} produto(s) estão com imagem, categoria, marca, descrição ou preço ausentes.`,
        explanation: "Produtos completos recebem prioridade no algoritmo de ranking e aparecem em mais filtros. Cada campo ausente reduz a visibilidade.",
        evidence: [
          evidence("Produtos incompletos", summary.incompleteProducts),
          evidence("Score atual do catálogo", catalog.healthScore, "%"),
        ],
        data_sources: ["executive_summary", "catalog_intelligence"],
        expected_impact: `Aumento estimado de ${isUrgent ? "30-50" : "15-25"}% em impressões de produtos`,
        estimated_effort: GrowthEffort.Hours,
        estimated_minutes: Math.min(summary.incompleteProducts * 3, 120),
        priority: isUrgent ? GrowthPriority.High : GrowthPriority.Medium,
        expires_at: null,
        action_url: "/merchant/catalog",
        action_label: "Ver produtos com problemas",
        moat_strengthened: ["Dados Proprietários", "Qualidade de Catálogo"],
        asset_strengthened: ["Merchant Knowledge", "Search Intelligence"],
        opportunity_category: OpportunityCategory.IncompleteCatalog,
      }, PlanTier.Free));
    }

    if (catalog.healthScore < 70 && summary.totalProducts > 0) {
      recs.push(draft(this.id, mid, {
        strategy_id: this.id,
        category: this.category,
        subcategory: "quality",
        title: "Melhorar qualidade geral do catálogo",
        description: `Apenas ${catalog.healthScore}% dos dados do seu catálogo estão completos — abaixo da média recomendada.`,
        explanation: "Catálogos com score acima de 80% aparecem em mais comparações e têm maior taxa de clique.",
        evidence: [
          evidence("Score de saúde", catalog.healthScore, "%"),
          evidence("Meta recomendada", "80%"),
        ],
        data_sources: ["catalog_intelligence"],
        expected_impact: "Aumento de visibilidade em comparações de produtos",
        estimated_effort: GrowthEffort.Hours,
        estimated_minutes: 60,
        priority: GrowthPriority.Medium,
        expires_at: null,
        action_url: "/merchant/catalog",
        action_label: "Melhorar catálogo",
        moat_strengthened: ["Dados Proprietários"],
        asset_strengthened: ["Search Intelligence", "Merchant Knowledge"],
        opportunity_category: OpportunityCategory.IncompleteCatalog,
      }, PlanTier.Free));
    }

    if (summary.totalProducts < 20 && summary.totalProducts > 0) {
      recs.push(draft(this.id, mid, {
        strategy_id: this.id,
        category: this.category,
        subcategory: "expansion",
        title: `Expandir catálogo além dos ${summary.totalProducts} produtos atuais`,
        description: "Lojas com mais de 20 produtos recebem mais exposição nas buscas e comparações.",
        explanation: "O algoritmo do ParaguAI favorece lojas com catálogos mais amplos para comparações de preço.",
        evidence: [
          evidence("Produtos atuais", summary.totalProducts),
          evidence("Mínimo recomendado", 20),
        ],
        data_sources: ["executive_summary"],
        expected_impact: "Mais aparições em buscas e comparações de categoria",
        estimated_effort: GrowthEffort.Days,
        estimated_minutes: 180,
        priority: GrowthPriority.Medium,
        expires_at: null,
        action_url: "/merchant/imports/new",
        action_label: "Importar mais produtos",
        moat_strengthened: ["Rede de Catálogos", "Dados Proprietários"],
        asset_strengthened: ["Merchant Knowledge", "Buyer Behavioral Knowledge"],
        opportunity_category: OpportunityCategory.LowCoverage,
      }, PlanTier.Free));
    }

    return recs;
  }
}
