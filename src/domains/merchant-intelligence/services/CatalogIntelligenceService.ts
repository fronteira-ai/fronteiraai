import type { SupabaseClient } from "@supabase/supabase-js";
import { CatalogIssueType, InsightSeverity } from "../types/enums";
import type { CatalogIssue, CatalogInsight, CatalogIntelligence } from "../types/merchant-intelligence.types";

type OfferRow = {
  id: string;
  in_stock: boolean;
  price_usd: number;
  products: {
    id: string;
    image_url: string | null;
    category_id: string | null;
    brand_id: string | null;
    description: string | null;
  };
};

export async function buildCatalogIntelligence(
  merchantId: string,
  storeIds: string[],
  serviceClient: SupabaseClient
): Promise<CatalogIntelligence> {
  const now = new Date().toISOString();

  if (storeIds.length === 0) {
    return empty(merchantId, now);
  }

  const offersResult = await serviceClient
    .from("offers")
    .select("id, in_stock, price_usd, products!inner(id, image_url, category_id, brand_id, description)")
    .in("store_id", storeIds);

  const lastImportResult = await serviceClient
    .from("connector_sync_runs")
    .select("started_at, completed_at")
    .eq("merchant_id", merchantId)
    .order("started_at", { ascending: false })
    .limit(1);

  const offers = (offersResult.data ?? []) as unknown as OfferRow[];
  const total = offers.length;

  if (total === 0) {
    return empty(merchantId, now);
  }

  // Count issues per type
  const noImage = offers.filter((o) => !o.products.image_url).length;
  const noCategory = offers.filter((o) => !o.products.category_id).length;
  const noBrand = offers.filter((o) => !o.products.brand_id).length;
  const noDescription = offers.filter((o) => !o.products.description?.trim()).length;
  const noPrice = offers.filter((o) => !o.price_usd || o.price_usd <= 0).length;

  const lastLog = lastImportResult.data?.[0];
  const lastImportAt = lastLog?.completed_at ?? lastLog?.started_at ?? null;
  const daysSinceLastImport = lastImportAt
    ? Math.floor((Date.now() - new Date(lastImportAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const issues: CatalogIssue[] = [];

  if (noImage > 0) {
    issues.push({
      type: CatalogIssueType.NoImage,
      severity: noImage / total >= 0.3 ? InsightSeverity.Critical : InsightSeverity.Warning,
      label: "Produtos sem imagem",
      count: noImage,
      total,
      percentage: Math.round((noImage / total) * 100),
      description: `${noImage} produto(s) sem imagem publicada.`,
      impact: "Produtos sem foto recebem 3× menos cliques e são ignorados pelos compradores visuais.",
      actionHref: "/merchant/imports/new",
      actionLabel: "Reimportar com mídia",
    });
  }

  if (noCategory > 0) {
    issues.push({
      type: CatalogIssueType.NoCategory,
      severity: noCategory / total >= 0.2 ? InsightSeverity.Critical : InsightSeverity.Warning,
      label: "Produtos sem categoria",
      count: noCategory,
      total,
      percentage: Math.round((noCategory / total) * 100),
      description: `${noCategory} produto(s) sem categoria atribuída.`,
      impact: "Sem categoria, produtos não aparecem em filtros e buscas por categoria — perdendo até 60% do tráfego orgânico.",
      actionHref: "/merchant/catalog",
      actionLabel: "Categorizar produtos",
    });
  }

  if (noBrand > 0) {
    issues.push({
      type: CatalogIssueType.NoBrand,
      severity: InsightSeverity.Warning,
      label: "Produtos sem marca",
      count: noBrand,
      total,
      percentage: Math.round((noBrand / total) * 100),
      description: `${noBrand} produto(s) sem marca identificada.`,
      impact: "Compradores que filtram por marca não encontram seus produtos — você perde buscas de alta intenção.",
      actionHref: "/merchant/catalog",
      actionLabel: "Atribuir marcas",
    });
  }

  if (noDescription > 0) {
    issues.push({
      type: CatalogIssueType.NoDescription,
      severity: InsightSeverity.Info,
      label: "Produtos sem descrição",
      count: noDescription,
      total,
      percentage: Math.round((noDescription / total) * 100),
      description: `${noDescription} produto(s) sem descrição detalhada.`,
      impact: "Descrições aumentam a confiança do comprador e o ranking nos algoritmos de busca.",
      actionHref: "/merchant/catalog",
      actionLabel: "Adicionar descrições",
    });
  }

  if (noPrice > 0) {
    issues.push({
      type: CatalogIssueType.NoPrice,
      severity: InsightSeverity.Critical,
      label: "Produtos sem preço",
      count: noPrice,
      total,
      percentage: Math.round((noPrice / total) * 100),
      description: `${noPrice} produto(s) com preço zerado ou ausente.`,
      impact: "Produtos sem preço são excluídos do comparador. Você não existe para o comprador que pesquisa por preço.",
      actionHref: "/merchant/imports/new",
      actionLabel: "Sincronizar preços",
    });
  }

  if (daysSinceLastImport !== null && daysSinceLastImport > 14) {
    issues.push({
      type: CatalogIssueType.StaleImport,
      severity: daysSinceLastImport > 30 ? InsightSeverity.Critical : InsightSeverity.Warning,
      label: "Catálogo desatualizado",
      count: 1,
      total: 1,
      percentage: 100,
      description: `Última sincronização há ${daysSinceLastImport} dias.`,
      impact: "Preços desatualizados geram frustração e perda de confiança. O algoritmo de ranking penaliza catálogos obsoletos.",
      actionHref: "/merchant/imports/new",
      actionLabel: "Sincronizar agora",
    });
  }

  // Sort by severity: critical → warning → info
  const severityOrder: Record<InsightSeverity, number> = {
    [InsightSeverity.Critical]: 0,
    [InsightSeverity.Warning]: 1,
    [InsightSeverity.Info]: 2,
  };
  issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Compute health score: each complete field contributes weight
  const weights = {
    image: 30,
    category: 25,
    brand: 15,
    description: 15,
    price: 15,
  };
  const completeImage = total > 0 ? ((total - noImage) / total) * weights.image : 0;
  const completeCat = total > 0 ? ((total - noCategory) / total) * weights.category : 0;
  const completeBrand = total > 0 ? ((total - noBrand) / total) * weights.brand : 0;
  const completeDesc = total > 0 ? ((total - noDescription) / total) * weights.description : 0;
  const completePrice = total > 0 ? ((total - noPrice) / total) * weights.price : 0;
  const healthScore = Math.round(completeImage + completeCat + completeBrand + completeDesc + completePrice);

  const insights = buildInsights(issues, healthScore, total, daysSinceLastImport);

  return {
    merchantId,
    totalProducts: total,
    healthScore,
    issues,
    insights,
    lastImportAt,
    daysSinceLastImport,
    generatedAt: now,
  };
}

function buildInsights(
  issues: CatalogIssue[],
  healthScore: number,
  totalProducts: number,
  daysSinceLastImport: number | null
): CatalogInsight[] {
  const insights: CatalogInsight[] = [];

  if (healthScore >= 90) {
    insights.push({
      severity: InsightSeverity.Info,
      message: `Seu catálogo tem ${totalProducts} produtos com ${healthScore}% de completude. Excelente qualidade.`,
      why: "Catálogos completos aparecem em mais filtros e geram maior taxa de clique.",
    });
  } else if (healthScore < 50) {
    insights.push({
      severity: InsightSeverity.Critical,
      message: `Apenas ${healthScore}% dos dados do seu catálogo estão completos. Visibilidade crítica.`,
      why: "Metade ou mais dos seus produtos podem estar invisíveis nas buscas por falta de dados obrigatórios.",
    });
  }

  const criticalIssues = issues.filter((i) => i.severity === InsightSeverity.Critical);
  if (criticalIssues.length > 0) {
    const worst = criticalIssues[0];
    insights.push({
      severity: InsightSeverity.Critical,
      message: `${worst.count} produto(s) com problema crítico: ${worst.label.toLowerCase()}.`,
      why: worst.impact,
    });
  }

  if (daysSinceLastImport !== null && daysSinceLastImport > 7 && daysSinceLastImport <= 14) {
    insights.push({
      severity: InsightSeverity.Warning,
      message: `Catálogo não sincronizado há ${daysSinceLastImport} dias.`,
      why: "Preços desatualizados reduzem conversão e podem representar sua loja incorretamente aos compradores.",
    });
  }

  return insights;
}

function empty(merchantId: string, now: string): CatalogIntelligence {
  return {
    merchantId,
    totalProducts: 0,
    healthScore: 0,
    issues: [
      {
        type: CatalogIssueType.NoProducts,
        severity: InsightSeverity.Critical,
        label: "Nenhum produto publicado",
        count: 0,
        total: 0,
        percentage: 0,
        description: "Sua loja ainda não tem produtos publicados no ParaguAI.",
        impact: "Sem produtos, sua loja não aparece em nenhuma busca ou comparação.",
        actionHref: "/merchant/imports/new",
        actionLabel: "Fazer primeira importação",
      },
    ],
    insights: [
      {
        severity: InsightSeverity.Critical,
        message: "Sua loja ainda não tem produtos. Faça sua primeira importação.",
        why: "Sem produtos, sua loja não existe para os compradores do ParaguAI.",
      },
    ],
    lastImportAt: null,
    daysSinceLastImport: null,
    generatedAt: now,
  };
}
