import type { Rule, RuleResult } from "./Rule";
import type { DecisionContext } from "../types/decision.types";
import {
  RecommendationCategory,
  RecommendationPriority,
  EstimatedEffort,
} from "../types/enums";

// ── Rule: No Trust Verification ───────────────────────────────────────────────

export const TrustNoVerificationRule: Rule = {
  id: "trust.no_verification",
  name: "Sem Verificações de Trust",
  description: "Lojistas sem nenhuma verificação têm Trust Score baixo e aparecem menos.",
  category: RecommendationCategory.Trust,
  defaultPriority: RecommendationPriority.High,

  evaluate(ctx: DecisionContext): RuleResult | null {
    const { verificationCount } = ctx.summary;
    if (verificationCount > 0) return null;

    return {
      rule_id: this.id,
      category: this.category,
      priority: RecommendationPriority.High,
      title: "Inicie seu processo de verificação",
      description: "Compradores preferem lojistas verificados. A verificação aumenta sua credibilidade e posicionamento.",
      expected_impact: "Aumento no Trust Score + maior confiança dos compradores",
      estimated_effort: EstimatedEffort.Minutes,
      estimated_minutes: 15,
      reason: "Sem verificação, seu Trust Score é zero. Compradores filtram por confiança antes de contatar.",
      evidence: [
        { label: "Verificações ativas", value: 0, data_source: "trust" },
        { label: "Trust Score atual", value: ctx.summary.trustScore ?? 0, data_source: "trust" },
      ],
      data_sources: ["trust", "merchant_trust"],
      action_url: "/merchant/trust/verification",
      action_label: "Iniciar verificação",
      expires_at: null,
    };
  },
};

// ── Rule: Low Trust Score ────────────────────────────────────────────────────

export const LowTrustScoreRule: Rule = {
  id: "trust.low_score",
  name: "Trust Score Baixo",
  description: "Trust Score abaixo de 30 indica falta de sinais de confiança.",
  category: RecommendationCategory.Trust,
  defaultPriority: RecommendationPriority.High,

  evaluate(ctx: DecisionContext): RuleResult | null {
    const score = ctx.summary.trustScore ?? 0;
    // Only fire if has some verifications but score is still low
    if (ctx.summary.verificationCount === 0) return null; // handled by TrustNoVerificationRule
    if (score >= 40) return null;

    return {
      rule_id: this.id,
      category: this.category,
      priority: score < 20 ? RecommendationPriority.Critical : RecommendationPriority.High,
      title: "Fortaleça seu Trust Score",
      description: `Seu Trust Score é ${score}/100. Adicione mais sinais de confiança para melhorar seu posicionamento.`,
      expected_impact: "Trust Score mais alto = mais visibilidade + mais conversões",
      estimated_effort: EstimatedEffort.Hours,
      estimated_minutes: 45,
      reason: `Score de ${score}/100 está abaixo da média dos lojistas verificados (40+).`,
      evidence: [
        { label: "Trust Score atual", value: score, data_source: "trust" },
        { label: "Verificações ativas", value: ctx.summary.verificationCount, data_source: "trust" },
        { label: "Sinais ativos", value: ctx.summary.activeSignalCount ?? 0, data_source: "trust" },
      ],
      data_sources: ["trust", "merchant_trust"],
      action_url: "/merchant/trust",
      action_label: "Ver central de Trust",
      expires_at: null,
    };
  },
};

// ── Rule: No Active Signals ───────────────────────────────────────────────────

export const TrustNoSignalsRule: Rule = {
  id: "trust.no_signals",
  name: "Sem Sinais de Confiança",
  description: "Sinais de confiança visíveis aumentam a taxa de contato dos compradores.",
  category: RecommendationCategory.Trust,
  defaultPriority: RecommendationPriority.Medium,

  evaluate(ctx: DecisionContext): RuleResult | null {
    const signals = ctx.summary.activeSignalCount ?? 0;
    if (signals >= 2) return null;

    return {
      rule_id: this.id,
      category: this.category,
      priority: RecommendationPriority.Medium,
      title: "Ative sinais de confiança no seu perfil",
      description: "Exiba badges e sinais verificados para aumentar a credibilidade com compradores.",
      expected_impact: "Compradores com acesso a sinais de confiança convertem 2× mais",
      estimated_effort: EstimatedEffort.Minutes,
      estimated_minutes: 20,
      reason: `Você possui apenas ${signals} sinal(is) ativo(s). Sinais públicos constroem confiança antes do primeiro contato.`,
      evidence: [
        { label: "Sinais ativos", value: signals, data_source: "trust" },
      ],
      data_sources: ["trust"],
      action_url: "/merchant/trust",
      action_label: "Gerenciar sinais",
      expires_at: null,
    };
  },
};
