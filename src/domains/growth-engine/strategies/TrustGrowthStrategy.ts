import { GrowthCategory, GrowthStrategyType, GrowthPriority, GrowthEffort, OpportunityCategory, PlanTier } from "../types/enums";
import type { GrowthStrategy } from "./GrowthStrategy";
import type { GrowthContext } from "../domain/GrowthContext";
import type { DraftRecommendation } from "../types/growth.types";
import { draft, evidence } from "./strategy-helpers";

export class TrustGrowthStrategy implements GrowthStrategy {
  readonly id = GrowthStrategyType.TrustGrowth;
  readonly name = "Crescimento de Confiança";
  readonly category = GrowthCategory.Trust;

  evaluate(ctx: GrowthContext): DraftRecommendation[] {
    const recs: DraftRecommendation[] = [];
    const { summary } = ctx;
    const mid = ctx.merchant.id;

    if (summary.verificationCount === 0) {
      recs.push(draft(this.id, mid, {
        strategy_id: this.id,
        category: this.category,
        subcategory: "first_verification",
        title: "Concluir primeira verificação empresarial",
        description: "Sua loja ainda não tem nenhuma verificação ativa. Compradores tendem a escolher lojas verificadas.",
        explanation: "Verificação é o sinal de confiança mais forte do ParaguAI. Lojas verificadas têm 2× mais conversão de contato.",
        evidence: [
          evidence("Verificações ativas", 0),
          evidence("Score de confiança atual", summary.trustScore, "pts"),
        ],
        data_sources: ["executive_summary"],
        expected_impact: "Aumento de até 2× na taxa de conversão de visitas em contatos",
        estimated_effort: GrowthEffort.Days,
        estimated_minutes: 120,
        priority: GrowthPriority.Critical,
        expires_at: null,
        action_url: "/merchant/audit",
        action_label: "Iniciar verificação",
        moat_strengthened: ["Confiança", "Dados Verificados", "Histórico Acumulado"],
        asset_strengthened: ["Merchant Knowledge", "Search Intelligence", "Knowledge Graph"],
        opportunity_category: OpportunityCategory.IncompleteTrust,
      }, PlanTier.Free));
    }

    if (summary.trustScore < 50 && summary.verificationCount > 0) {
      recs.push(draft(this.id, mid, {
        strategy_id: this.id,
        category: this.category,
        subcategory: "trust_score",
        title: `Melhorar score de confiança (atual: ${summary.trustScore}/100)`,
        description: "Score de confiança abaixo de 50 reduz sua visibilidade em comparações e recomendações.",
        explanation: "O score de confiança influencia diretamente o ranking da sua loja nas buscas do ParaguAI.",
        evidence: [
          evidence("Score atual", summary.trustScore, "/100"),
          evidence("Meta recomendada", "70+"),
          evidence("Verificações ativas", summary.verificationCount),
        ],
        data_sources: ["executive_summary"],
        expected_impact: "Melhora de visibilidade nas buscas e recomendações",
        estimated_effort: GrowthEffort.Days,
        estimated_minutes: 90,
        priority: GrowthPriority.High,
        expires_at: null,
        action_url: "/merchant/audit",
        action_label: "Ver como melhorar",
        moat_strengthened: ["Confiança", "Histórico Acumulado"],
        asset_strengthened: ["Merchant Knowledge", "Search Intelligence"],
        opportunity_category: OpportunityCategory.IncompleteTrust,
      }, PlanTier.Free));
    }

    if (summary.activeSignalCount < 2 && summary.verificationCount > 0) {
      recs.push(draft(this.id, mid, {
        strategy_id: this.id,
        category: this.category,
        subcategory: "add_signals",
        title: "Ativar mais sinais de confiança",
        description: `Você tem apenas ${summary.activeSignalCount} sinal(is) de confiança ativo(s). Lojas com 3+ sinais têm maior ranking.`,
        explanation: "Sinais de confiança (localização confirmada, horários, parceiro oficial) constroem o perfil público da sua loja.",
        evidence: [
          evidence("Sinais ativos", summary.activeSignalCount),
          evidence("Meta recomendada", "3+"),
        ],
        data_sources: ["executive_summary"],
        expected_impact: "Melhora do perfil público e maior confiança dos compradores",
        estimated_effort: GrowthEffort.Hours,
        estimated_minutes: 30,
        priority: GrowthPriority.Medium,
        expires_at: null,
        action_url: "/merchant/audit",
        action_label: "Ativar sinais de confiança",
        moat_strengthened: ["Confiança", "Dados Verificados"],
        asset_strengthened: ["Merchant Knowledge", "Knowledge Graph"],
        opportunity_category: OpportunityCategory.IncompleteTrust,
      }, PlanTier.Free));
    }

    return recs;
  }
}
