import { GrowthCategory, GrowthStrategyType, GrowthPriority, GrowthEffort, OpportunityCategory, PlanTier } from "../types/enums";
import type { GrowthStrategy } from "./GrowthStrategy";
import type { GrowthContext } from "../domain/GrowthContext";
import type { DraftRecommendation } from "../types/growth.types";
import { draft, evidence } from "./strategy-helpers";

export class FreshnessStrategy implements GrowthStrategy {
  readonly id = GrowthStrategyType.Freshness;
  readonly name = "Atualização de Catálogo";
  readonly category = GrowthCategory.Freshness;

  evaluate(ctx: GrowthContext): DraftRecommendation[] {
    const recs: DraftRecommendation[] = [];
    const { summary } = ctx;
    const mid = ctx.merchant.id;

    if (summary.daysSinceLastImport === null) {
      return recs;
    }

    if (summary.daysSinceLastImport > 30) {
      recs.push(draft(this.id, mid, {
        strategy_id: this.id,
        category: this.category,
        subcategory: "sync_now",
        title: `Catálogo sem atualização há ${summary.daysSinceLastImport} dias`,
        description: "Preços e estoque desatualizados prejudicam a confiança do comprador e penalizam seu ranking.",
        explanation: "O algoritmo do ParaguAI penaliza catálogos obsoletos. Compradores que encontram preços incorretos não voltam.",
        evidence: [
          evidence("Dias sem sincronização", summary.daysSinceLastImport),
          evidence("Última importação", summary.lastImportAt ? new Date(summary.lastImportAt).toLocaleDateString("pt-BR") : "Nunca"),
        ],
        data_sources: ["executive_summary"],
        expected_impact: "Restaurar ranking e confiança — preços atualizados convertem 3× mais",
        estimated_effort: GrowthEffort.Minutes,
        estimated_minutes: 10,
        priority: GrowthPriority.High,
        expires_at: null,
        action_url: "/merchant/imports/new",
        action_label: "Sincronizar agora",
        moat_strengthened: ["Dados Proprietários", "Histórico Acumulado"],
        asset_strengthened: ["Merchant Knowledge", "Historical Data"],
        opportunity_category: OpportunityCategory.IncompleteCatalog,
      }, PlanTier.Free));
    } else if (summary.daysSinceLastImport > 14) {
      recs.push(draft(this.id, mid, {
        strategy_id: this.id,
        category: this.category,
        subcategory: "sync_soon",
        title: `Catálogo com ${summary.daysSinceLastImport} dias sem atualização`,
        description: "Recomendamos sincronizar semanalmente para manter preços e estoque precisos.",
        explanation: "Catálogos atualizados com frequência têm mais confiança dos compradores e melhor posicionamento nas buscas.",
        evidence: [
          evidence("Dias sem sincronização", summary.daysSinceLastImport),
          evidence("Ciclo recomendado", "7 dias"),
        ],
        data_sources: ["executive_summary"],
        expected_impact: "Manter ranking e evitar perda de confiança por dados desatualizados",
        estimated_effort: GrowthEffort.Minutes,
        estimated_minutes: 10,
        priority: GrowthPriority.Medium,
        expires_at: null,
        action_url: "/merchant/imports/new",
        action_label: "Atualizar catálogo",
        moat_strengthened: ["Dados Proprietários"],
        asset_strengthened: ["Merchant Knowledge", "Historical Data"],
        opportunity_category: null,
      }, PlanTier.Free));
    }

    return recs;
  }
}
