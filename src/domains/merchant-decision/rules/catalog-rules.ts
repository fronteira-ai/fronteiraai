import type { Rule, RuleResult } from "./Rule";
import type { DecisionContext } from "../types/decision.types";
import {
  RecommendationCategory,
  RecommendationPriority,
  EstimatedEffort,
} from "../types/enums";

// ── Rule: Low Image Coverage ──────────────────────────────────────────────────

export const CatalogImageCoverageRule: Rule = {
  id: "catalog.image_coverage",
  name: "Cobertura de Imagens",
  description: "Produtos sem imagem perdem CTR. Acima de 30% sem foto é crítico.",
  category: RecommendationCategory.Catalog,
  defaultPriority: RecommendationPriority.Critical,

  evaluate(ctx: DecisionContext): RuleResult | null {
    const total = ctx.summary.totalProducts;
    const incomplete = ctx.summary.incompleteProducts;
    if (total === 0) return null;

    // Use incomplete products as proxy for products needing attention
    const withoutImages = incomplete;
    const coveragePct = Math.round(((total - withoutImages) / total) * 100);
    if (coveragePct >= 85) return null;

    const priority = coveragePct < 50
      ? RecommendationPriority.Critical
      : RecommendationPriority.High;

    return {
      rule_id: this.id,
      category: this.category,
      priority,
      title: "Adicione imagens aos seus produtos",
      description: `${withoutImages} produto(s) incompletos. Produtos com imagem têm até 4× mais cliques.`,
      expected_impact: "Aumento significativo de impressões e CTR nos resultados de busca",
      estimated_effort: EstimatedEffort.Hours,
      estimated_minutes: Math.min(withoutImages * 5, 120),
      reason: `Apenas ${coveragePct}% dos seus produtos estão completos. Compradores filtram por foto.`,
      evidence: [
        { label: "Total de produtos", value: total, data_source: "catalog" },
        { label: "Produtos incompletos", value: withoutImages, data_source: "catalog" },
        { label: "Cobertura atual", value: `${coveragePct}%`, data_source: "catalog" },
      ],
      data_sources: ["catalog", "merchant_intelligence"],
      action_url: "/merchant/products",
      action_label: "Ver produtos incompletos",
      expires_at: null,
    };
  },
};

// ── Rule: Stale Import ────────────────────────────────────────────────────────

export const StaleImportRule: Rule = {
  id: "catalog.stale_import",
  name: "Catálogo Desatualizado",
  description: "Mais de 30 dias sem atualizar o catálogo sinaliza abandono para compradores.",
  category: RecommendationCategory.Catalog,
  defaultPriority: RecommendationPriority.High,

  evaluate(ctx: DecisionContext): RuleResult | null {
    const { lastImportAt } = ctx.summary;
    if (!lastImportAt) {
      return {
        rule_id: this.id,
        category: this.category,
        priority: RecommendationPriority.Critical,
        title: "Importe seus produtos",
        description: "Sua loja ainda não tem produtos publicados. Comece agora para aparecer nas buscas.",
        expected_impact: "Aparecer nos resultados de busca para compradores da sua categoria",
        estimated_effort: EstimatedEffort.Minutes,
        estimated_minutes: 30,
        reason: "Sem produtos, sua loja é invisível para compradores. Esta é a ação mais importante.",
        evidence: [
          { label: "Produtos publicados", value: 0, data_source: "catalog" },
          { label: "Última importação", value: "Nunca", data_source: "catalog" },
        ],
        data_sources: ["catalog"],
        action_url: "/merchant/imports/new",
        action_label: "Importar produtos agora",
        expires_at: null,
      };
    }

    const daysSince = Math.floor((Date.now() - new Date(lastImportAt).getTime()) / 86400000);
    if (daysSince < 14) return null;

    const priority = daysSince > 60
      ? RecommendationPriority.Critical
      : daysSince > 30
        ? RecommendationPriority.High
        : RecommendationPriority.Medium;

    return {
      rule_id: this.id,
      category: this.category,
      priority,
      title: "Atualize seu catálogo",
      description: `Sua última atualização foi há ${daysSince} dias. Preços e estoque podem estar incorretos.`,
      expected_impact: "Manter compradores confiantes nos preços e disponibilidade da sua loja",
      estimated_effort: EstimatedEffort.Minutes,
      estimated_minutes: 20,
      reason: `${daysSince} dias sem atualização. Produtos com preços desatualizados afastam compradores.`,
      evidence: [
        { label: "Dias sem atualização", value: daysSince, data_source: "connector_sync_runs" },
        { label: "Última importação", value: new Date(lastImportAt).toLocaleDateString("pt-BR"), data_source: "connector_sync_runs" },
      ],
      data_sources: ["catalog", "connector_sync_runs"],
      action_url: "/merchant/imports/new",
      action_label: "Atualizar catálogo",
      expires_at: null,
    };
  },
};

// ── Rule: No Products ────────────────────────────────────────────────────────

export const LowActiveProductsRule: Rule = {
  id: "catalog.low_active_products",
  name: "Poucos Produtos Ativos",
  description: "Loja com menos de 5 produtos ativos tem visibilidade muito baixa.",
  category: RecommendationCategory.Catalog,
  defaultPriority: RecommendationPriority.High,

  evaluate(ctx: DecisionContext): RuleResult | null {
    const activeProducts = ctx.summary.activeProducts;
    const totalProducts = ctx.summary.totalProducts;
    if (activeProducts >= 5) return null;
    if (totalProducts === 0) return null; // handled by StaleImportRule

    return {
      rule_id: this.id,
      category: this.category,
      priority: activeProducts === 0 ? RecommendationPriority.Critical : RecommendationPriority.High,
      title: "Expanda seu catálogo",
      description: `Você tem apenas ${activeProducts} produto(s) ativo(s). Lojas com mais produtos recebem mais visitas.`,
      expected_impact: "Mais produtos = mais superfície de busca = mais compradores alcançados",
      estimated_effort: EstimatedEffort.Hours,
      estimated_minutes: 60,
      reason: `Com apenas ${activeProducts} produtos ativos, sua visibilidade é muito limitada.`,
      evidence: [
        { label: "Produtos ativos", value: activeProducts, data_source: "catalog" },
        { label: "Total no catálogo", value: totalProducts, data_source: "catalog" },
      ],
      data_sources: ["catalog"],
      action_url: "/merchant/imports/new",
      action_label: "Adicionar mais produtos",
      expires_at: null,
    };
  },
};
