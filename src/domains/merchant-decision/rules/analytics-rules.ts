import type { Rule, RuleResult } from "./Rule";
import type { DecisionContext } from "../types/decision.types";
import {
  RecommendationCategory,
  RecommendationPriority,
  EstimatedEffort,
} from "../types/enums";

// ── Rule: High Views Low Contact ──────────────────────────────────────────────

export const HighViewsLowContactRule: Rule = {
  id: "analytics.high_views_low_contact",
  name: "Visitas sem Conversão",
  description: "Muitas visitas mas poucos contatos indicam problema de confiança ou informações.",
  category: RecommendationCategory.Analytics,
  defaultPriority: RecommendationPriority.High,

  evaluate(ctx: DecisionContext): RuleResult | null {
    const { views, contact_clicks, unique_visitors } = ctx.analytics;
    if (views < 20) return null;
    if (contact_clicks === 0 && unique_visitors < 10) return null;

    const contactRate = views > 0 ? (contact_clicks / views) * 100 : 0;
    if (contactRate >= 3) return null;

    return {
      rule_id: this.id,
      category: this.category,
      priority: contactRate < 1 ? RecommendationPriority.High : RecommendationPriority.Medium,
      title: "Sua loja recebe visitas mas poucos contatos",
      description: `${views} visitas, ${contact_clicks} contato(s) — taxa de ${contactRate.toFixed(1)}%. Compradores entram mas não perguntam.`,
      expected_impact: "Aumentar taxa de contato pode triplicar suas conversões",
      estimated_effort: EstimatedEffort.Minutes,
      estimated_minutes: 30,
      reason: `Taxa de contato de ${contactRate.toFixed(1)}% está abaixo do esperado. Pode indicar perfil incompleto, preços pouco competitivos ou falta de confiança.`,
      evidence: [
        { label: "Visitas", value: views, data_source: "analytics" },
        { label: "Contatos iniciados", value: contact_clicks, data_source: "analytics" },
        { label: "Taxa de contato", value: `${contactRate.toFixed(1)}%`, data_source: "analytics" },
        { label: "Visitantes únicos", value: unique_visitors, data_source: "analytics" },
      ],
      data_sources: ["analytics", "buyer_events"],
      action_url: "/merchant/trust",
      action_label: "Melhorar perfil de confiança",
      expires_at: null,
    };
  },
};

// ── Rule: Low CTR ─────────────────────────────────────────────────────────────

export const LowCTRRule: Rule = {
  id: "analytics.low_ctr",
  name: "CTR de Produtos Baixo",
  description: "Taxa de cliques menor que 2% em produtos com impressões indica títulos ou preços não competitivos.",
  category: RecommendationCategory.Analytics,
  defaultPriority: RecommendationPriority.Medium,

  evaluate(ctx: DecisionContext): RuleResult | null {
    const { product_impressions, ctr } = ctx.analytics;
    if (product_impressions < 50) return null;
    if (ctr >= 3) return null;

    return {
      rule_id: this.id,
      category: this.category,
      priority: ctr < 1 ? RecommendationPriority.High : RecommendationPriority.Medium,
      title: "Poucos compradores clicam nos seus produtos",
      description: `CTR de ${ctr}% com ${product_impressions} impressões. Títulos e preços podem precisar de ajuste.`,
      expected_impact: "Melhorar CTR para 3%+ pode triplicar o tráfego qualificado",
      estimated_effort: EstimatedEffort.Hours,
      estimated_minutes: 60,
      reason: `CTR de ${ctr}% está abaixo da média esperada (3%). Compradores veem seus produtos mas não clicam — geralmente por título pouco descritivo ou preço fora do contexto.`,
      evidence: [
        { label: "Impressões de produtos", value: product_impressions, data_source: "analytics" },
        { label: "Cliques", value: ctx.analytics.product_clicks, data_source: "analytics" },
        { label: "CTR atual", value: `${ctr}%`, data_source: "analytics" },
      ],
      data_sources: ["analytics", "buyer_events"],
      action_url: "/merchant/products",
      action_label: "Revisar títulos e preços",
      expires_at: null,
    };
  },
};

// ── Rule: Zero Offer Saves ────────────────────────────────────────────────────

export const ZeroOfferSavesRule: Rule = {
  id: "analytics.zero_saves",
  name: "Nenhuma Oferta Salva",
  description: "Ofertas salvas indicam intenção de compra futura. Zero saves sugere falta de interesse ou de urgência.",
  category: RecommendationCategory.Analytics,
  defaultPriority: RecommendationPriority.Medium,

  evaluate(ctx: DecisionContext): RuleResult | null {
    const { offer_saves, unique_visitors } = ctx.analytics;
    if (unique_visitors < 20) return null;
    if (offer_saves > 0) return null;

    return {
      rule_id: this.id,
      category: this.category,
      priority: RecommendationPriority.Medium,
      title: "Nenhum comprador salvou suas ofertas",
      description: `Com ${unique_visitors} visitantes e 0 ofertas salvas, seus produtos podem não estar despertando interesse de retorno.`,
      expected_impact: "Compradores que salvam ofertas convertem com alta taxa posteriormente",
      estimated_effort: EstimatedEffort.Hours,
      estimated_minutes: 90,
      reason: `${unique_visitors} compradores visitaram mas nenhum salvou uma oferta. Isso pode indicar preços pouco competitivos ou descrições insuficientes.`,
      evidence: [
        { label: "Visitantes únicos", value: unique_visitors, data_source: "analytics" },
        { label: "Ofertas salvas", value: 0, data_source: "analytics" },
      ],
      data_sources: ["analytics", "buyer_events"],
      action_url: "/merchant/products",
      action_label: "Revisar competitividade de preços",
      expires_at: null,
    };
  },
};
