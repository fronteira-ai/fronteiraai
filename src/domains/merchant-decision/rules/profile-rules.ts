import type { Rule, RuleResult } from "./Rule";
import type { DecisionContext } from "../types/decision.types";
import {
  RecommendationCategory,
  RecommendationPriority,
  EstimatedEffort,
} from "../types/enums";

// ── Rule: No Contact Channels ─────────────────────────────────────────────────

export const ProfileNoContactRule: Rule = {
  id: "profile.no_contact",
  name: "Sem Canais de Contato",
  description: "Sem WhatsApp, telefone ou site, compradores não conseguem iniciar negociação.",
  category: RecommendationCategory.Profile,
  defaultPriority: RecommendationPriority.Critical,

  evaluate(ctx: DecisionContext): RuleResult | null {
    const { contactsAvailable } = ctx.summary;
    if (contactsAvailable > 0) return null;

    return {
      rule_id: this.id,
      category: this.category,
      priority: RecommendationPriority.Critical,
      title: "Adicione canais de contato ao seu perfil",
      description: "Sem WhatsApp, telefone ou site, compradores não conseguem negociar com você.",
      expected_impact: "Canais de contato habilitam toda conversão. Esta é a ação mais urgente.",
      estimated_effort: EstimatedEffort.Minutes,
      estimated_minutes: 5,
      reason: "Nenhum canal de contato disponível. Compradores que chegam ao seu perfil não têm como comprar.",
      evidence: [
        { label: "Canais de contato", value: 0, data_source: "profile" },
      ],
      data_sources: ["profile", "merchants"],
      action_url: "/merchant/settings",
      action_label: "Adicionar contato agora",
      expires_at: null,
    };
  },
};

// ── Rule: Single Contact Channel ─────────────────────────────────────────────

export const ProfileSingleChannelRule: Rule = {
  id: "profile.single_channel",
  name: "Canal de Contato Único",
  description: "Múltiplos canais aumentam a acessibilidade para diferentes perfis de compradores.",
  category: RecommendationCategory.Profile,
  defaultPriority: RecommendationPriority.Low,

  evaluate(ctx: DecisionContext): RuleResult | null {
    const { contactsAvailable } = ctx.summary;
    if (contactsAvailable !== 1) return null;

    return {
      rule_id: this.id,
      category: this.category,
      priority: RecommendationPriority.Low,
      title: "Adicione mais canais de contato",
      description: "Você tem apenas 1 canal de contato. Diferentes compradores preferem diferentes meios.",
      expected_impact: "Mais canais = mais compradores acessando sua loja com sucesso",
      estimated_effort: EstimatedEffort.Minutes,
      estimated_minutes: 10,
      reason: "Compradores mais jovens preferem WhatsApp; outros preferem site ou telefone. Cobrir mais perfis aumenta contatos.",
      evidence: [
        { label: "Canais ativos", value: 1, data_source: "profile" },
        { label: "Canais recomendados", value: 3, data_source: "benchmark" },
      ],
      data_sources: ["profile", "merchants"],
      action_url: "/merchant/settings",
      action_label: "Adicionar mais canais",
      expires_at: null,
    };
  },
};
