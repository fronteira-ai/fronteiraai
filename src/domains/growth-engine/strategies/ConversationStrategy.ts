import { GrowthCategory, GrowthStrategyType, GrowthPriority, GrowthEffort, OpportunityCategory, PlanTier } from "../types/enums";
import type { GrowthStrategy } from "./GrowthStrategy";
import type { GrowthContext } from "../domain/GrowthContext";
import type { DraftRecommendation } from "../types/growth.types";
import { draft, evidence } from "./strategy-helpers";

export class ConversationStrategy implements GrowthStrategy {
  readonly id = GrowthStrategyType.Conversation;
  readonly name = "Canais de Conversação";
  readonly category = GrowthCategory.Conversation;

  evaluate(ctx: GrowthContext): DraftRecommendation[] {
    const recs: DraftRecommendation[] = [];
    const { summary, analytics } = ctx;
    const mid = ctx.merchant.id;

    if (analytics.contact_clicks === 0 && analytics.views > 10) {
      recs.push(draft(this.id, mid, {
        strategy_id: this.id,
        category: this.category,
        subcategory: "activate_conversations",
        title: "Nenhum comprador entrou em contato ainda",
        description: `${analytics.views} visitas e zero contatos. Os compradores estão chegando mas não têm como falar com você.`,
        explanation: "No mercado de fronteira, a conversa direta é o passo crítico antes da compra. Sem contato, não há venda.",
        evidence: [
          evidence("Visitas no período", analytics.views),
          evidence("Contatos gerados", 0),
          evidence("Canais disponíveis", summary.contactsAvailable),
        ],
        data_sources: ["executive_summary", "analytics"],
        expected_impact: "Ativar conversações é o passo mais direto para converter visitantes em clientes",
        estimated_effort: GrowthEffort.Minutes,
        estimated_minutes: 10,
        priority: GrowthPriority.Critical,
        expires_at: null,
        action_url: "/merchant/settings",
        action_label: "Ativar canais de contato",
        moat_strengthened: ["Confiança", "Dados Proprietários", "Rede de Compradores"],
        asset_strengthened: ["Merchant Knowledge", "Buyer Behavioral Knowledge", "Knowledge Graph"],
        opportunity_category: OpportunityCategory.IncompleteProfile,
      }, PlanTier.Free));
    } else if (analytics.whatsapp_clicks === 0 && analytics.views > 20 && summary.contactsAvailable > 0) {
      recs.push(draft(this.id, mid, {
        strategy_id: this.id,
        category: this.category,
        subcategory: "activate_whatsapp",
        title: "WhatsApp não está sendo usado pelos compradores",
        description: `${analytics.views} visitas mas zero cliques no WhatsApp. Este é o canal de maior conversão na fronteira.`,
        explanation: "WhatsApp é o canal de conversão número 1 para lojas de fronteira. Se ninguém está usando, o botão pode não estar visível ou o número pode estar incorreto.",
        evidence: [
          evidence("Cliques no WhatsApp", 0),
          evidence("Total de visitas", analytics.views),
          evidence("Canais disponíveis", summary.contactsAvailable),
        ],
        data_sources: ["analytics", "executive_summary"],
        expected_impact: "WhatsApp ativo pode gerar 2-5× mais contatos que outros canais",
        estimated_effort: GrowthEffort.Minutes,
        estimated_minutes: 5,
        priority: GrowthPriority.High,
        expires_at: null,
        action_url: "/merchant/settings",
        action_label: "Verificar WhatsApp",
        moat_strengthened: ["Confiança", "Rede de Compradores"],
        asset_strengthened: ["Merchant Knowledge", "Buyer Behavioral Knowledge"],
        opportunity_category: null,
      }, PlanTier.Free));
    }

    return recs;
  }
}
