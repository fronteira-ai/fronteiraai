import type { DecisionContext, Opportunity } from "../types/decision.types";
import { OpportunityType, ImpactLevel } from "../types/enums";

// ── Opportunity Detector ──────────────────────────────────────────────────────
// Detects opportunities based exclusively on observable data.
// Never invents opportunities. Evidence required for every detection.

export class OpportunityDetector {
  detect(context: DecisionContext): Opportunity[] {
    const opportunities: Opportunity[] = [];
    const now = new Date().toISOString();

    // 1. High views, low contact → conversion opportunity
    {
      const { views, contact_clicks } = context.analytics;
      if (views >= 30 && contact_clicks === 0) {
        opportunities.push({
          id: `opp:high_views_no_contact:${context.merchant.id}`,
          type: OpportunityType.HighViewsLowContact,
          title: "Compradores visitam mas não contatam",
          description: `${views} visitas sem nenhum contato iniciado. Há demanda real, mas algo está impedindo a conversão.`,
          why_it_matters: "Visitas sem contato indicam que compradores chegam mas não encontram o que precisam para decidir.",
          how_to_act: "Revise seu perfil público: adicione contato visível, melhore descrições e ative sinais de confiança.",
          expected_benefit: "Converter 3% das visitas já seria uma transformação no volume de negócios",
          impact: ImpactLevel.High,
          evidence: [
            { label: "Visitas", value: views, data_source: "analytics" },
            { label: "Contatos", value: 0, data_source: "analytics" },
          ],
          product_id: null,
          category_id: null,
          detected_at: now,
        });
      }
    }

    // 2. Products with impressions but zero clicks → under-exposed or unattractive
    {
      const neverClicked = context.products.products.filter(
        (p) => p.impressions > 10 && p.clicks === 0
      );
      if (neverClicked.length > 0) {
        const top = neverClicked[0];
        opportunities.push({
          id: `opp:never_clicked:${context.merchant.id}`,
          type: OpportunityType.NeverClickedProduct,
          title: `${neverClicked.length} produto(s) com impressões mas sem cliques`,
          description: `${neverClicked.length} produto(s) aparecem nos resultados mas nenhum comprador clica. Títulos ou preços podem estar fora do padrão esperado.`,
          why_it_matters: "CTR zero com impressões indica que compradores veem mas não se interessam — perda de oportunidade.",
          how_to_act: "Revise o título, preço e imagem dos produtos com mais impressões e zero cliques.",
          expected_benefit: "Melhorar apenas 1 produto pode dobrar o tráfego qualificado",
          impact: ImpactLevel.Medium,
          evidence: [
            { label: "Produtos afetados", value: neverClicked.length, data_source: "analytics" },
            { label: "Produto com mais impressões sem clique", value: top.product_name ?? top.product_id.slice(0, 8), data_source: "analytics" },
            { label: "Impressões", value: top.impressions, data_source: "analytics" },
          ],
          product_id: top.product_id,
          category_id: null,
          detected_at: now,
        });
      }
    }

    // 3. Saves are zero but impressions exist → low purchase intent signals
    {
      const { offer_saves, product_impressions } = context.analytics;
      if (product_impressions >= 100 && offer_saves === 0) {
        opportunities.push({
          id: `opp:low_saves:${context.merchant.id}`,
          type: OpportunityType.LowSavesHighImpressions,
          title: "Alta exposição com zero intenção de retorno",
          description: `${product_impressions} impressões e 0 ofertas salvas. Compradores não estão marcando para voltar depois.`,
          why_it_matters: "Ofertas salvas são intenção de compra futura. Zero saves com muitas impressões indica que os preços ou produtos não justificam retorno.",
          how_to_act: "Analise se seus preços estão competitivos e se as descrições comunicam valor claramente.",
          expected_benefit: "Aumentar saves em 1% das impressões gera pipeline de clientes de retorno",
          impact: ImpactLevel.Medium,
          evidence: [
            { label: "Impressões", value: product_impressions, data_source: "analytics" },
            { label: "Ofertas salvas", value: 0, data_source: "analytics" },
          ],
          product_id: null,
          category_id: null,
          detected_at: now,
        });
      }
    }

    // 4. Catalog health score below 50 → catalog quality opportunity
    {
      if (context.catalog.healthScore < 50 && context.summary.totalProducts > 0) {
        opportunities.push({
          id: `opp:catalog_health:${context.merchant.id}`,
          type: OpportunityType.UnderExposedProduct,
          title: "Catálogo com baixa qualidade estrutural",
          description: `Score de qualidade do catálogo: ${context.catalog.healthScore}/100. Problemas estruturais reduzem a exposição nos resultados de busca.`,
          why_it_matters: "Catálogos incompletos são penalizados no ranking de busca — você aparece menos mesmo tendo os produtos certos.",
          how_to_act: `Resolva os ${context.catalog.issues.length} problema(s) detectado(s) no catálogo, começando pelos críticos.`,
          expected_benefit: "Cada 10 pontos de melhoria no score aumenta a superfície de busca proporcionalmente",
          impact: context.catalog.healthScore < 30 ? ImpactLevel.High : ImpactLevel.Medium,
          evidence: [
            { label: "Score atual", value: `${context.catalog.healthScore}/100`, data_source: "catalog" },
            { label: "Problemas detectados", value: context.catalog.issues.length, data_source: "catalog" },
            { label: "Total de produtos", value: context.summary.totalProducts, data_source: "catalog" },
          ],
          product_id: null,
          category_id: null,
          detected_at: now,
        });
      }
    }

    return opportunities;
  }
}
