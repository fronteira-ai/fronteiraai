import { GrowthCategory, GrowthStrategyType, GrowthPriority, GrowthEffort, OpportunityCategory, PlanTier } from "../types/enums";
import type { GrowthStrategy } from "./GrowthStrategy";
import type { GrowthContext } from "../domain/GrowthContext";
import type { DraftRecommendation } from "../types/growth.types";
import { draft, evidence } from "./strategy-helpers";

export class MerchantProfileStrategy implements GrowthStrategy {
  readonly id = GrowthStrategyType.MerchantProfile;
  readonly name = "Completar Perfil do Lojista";
  readonly category = GrowthCategory.Profile;

  evaluate(ctx: GrowthContext): DraftRecommendation[] {
    const recs: DraftRecommendation[] = [];
    const { summary } = ctx;
    const mid = ctx.merchant.id;

    if (!summary.onboardingDone) {
      recs.push(draft(this.id, mid, {
        strategy_id: this.id,
        category: this.category,
        subcategory: "complete_onboarding",
        title: "Completar configuração inicial da loja",
        description: "O onboarding da sua loja ainda não foi concluído. Algumas funcionalidades estão bloqueadas.",
        explanation: "Lojas com onboarding completo têm acesso a todas as funcionalidades e aparecem como 'loja ativa' nas buscas.",
        evidence: [
          evidence("Onboarding", "Incompleto"),
          evidence("Funcionalidades liberadas após onboarding", "Todas"),
        ],
        data_sources: ["executive_summary"],
        expected_impact: "Acesso completo a todas as funcionalidades e maior visibilidade",
        estimated_effort: GrowthEffort.Minutes,
        estimated_minutes: 15,
        priority: GrowthPriority.High,
        expires_at: null,
        action_url: "/merchant/onboarding",
        action_label: "Completar onboarding",
        moat_strengthened: ["Dados Proprietários"],
        asset_strengthened: ["Merchant Knowledge"],
        opportunity_category: OpportunityCategory.IncompleteProfile,
      }, PlanTier.Free));
    }

    if (summary.contactsAvailable === 0) {
      recs.push(draft(this.id, mid, {
        strategy_id: this.id,
        category: this.category,
        subcategory: "add_contact",
        title: "Adicionar canais de contato",
        description: "Sua loja não tem nenhum canal de contato cadastrado. Compradores não conseguem falar com você.",
        explanation: "Sem canais de contato, sua loja não converte. Compradores que não conseguem tirar dúvidas simplesmente escolhem outra loja.",
        evidence: [
          evidence("Canais de contato", 0),
          evidence("Canais recomendados", "WhatsApp, telefone ou e-mail"),
        ],
        data_sources: ["executive_summary"],
        expected_impact: "Desbloquear conversões — compradores poderão entrar em contato",
        estimated_effort: GrowthEffort.Minutes,
        estimated_minutes: 5,
        priority: GrowthPriority.Critical,
        expires_at: null,
        action_url: "/merchant/settings",
        action_label: "Adicionar contatos",
        moat_strengthened: ["Confiança", "Dados Proprietários"],
        asset_strengthened: ["Merchant Knowledge", "Knowledge Graph"],
        opportunity_category: OpportunityCategory.IncompleteProfile,
      }, PlanTier.Free));
    } else if (summary.contactsAvailable < 2) {
      recs.push(draft(this.id, mid, {
        strategy_id: this.id,
        category: this.category,
        subcategory: "diversify_channels",
        title: "Adicionar mais um canal de contato",
        description: `Você tem apenas ${summary.contactsAvailable} canal de contato. Compradores preferem lojas com múltiplas opções.`,
        explanation: "Oferecer WhatsApp, telefone e e-mail aumenta a probabilidade de contato porque cada comprador tem uma preferência diferente.",
        evidence: [
          evidence("Canais disponíveis", summary.contactsAvailable),
          evidence("Canais recomendados", "3+"),
        ],
        data_sources: ["executive_summary"],
        expected_impact: "Aumento de 30-50% nas taxas de contato com múltiplos canais",
        estimated_effort: GrowthEffort.Minutes,
        estimated_minutes: 5,
        priority: GrowthPriority.Medium,
        expires_at: null,
        action_url: "/merchant/settings",
        action_label: "Diversificar canais",
        moat_strengthened: ["Confiança", "Dados Proprietários"],
        asset_strengthened: ["Merchant Knowledge"],
        opportunity_category: OpportunityCategory.IncompleteProfile,
      }, PlanTier.Free));
    }

    return recs;
  }
}
