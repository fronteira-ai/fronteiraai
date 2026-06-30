import type { SupabaseClient } from "@supabase/supabase-js";
import { ProductHealthStatus, ProductDiagnosisType } from "../types/enums";
import type { ProductDiagnosis, ProductHealthRecord, CatalogHealthBreakdown } from "../types/catalog-intelligence.types";

type OfferRow = {
  id: string;
  in_stock: boolean;
  price_usd: number;
  products: {
    id: string;
    name: string;
    image_url: string | null;
    category_id: string | null;
    brand_id: string | null;
    description: string | null;
  };
};

const WEIGHTS = { image: 30, category: 25, brand: 15, description: 15, price: 15 } as const;

const STATUS_ORDER: Record<ProductHealthStatus, number> = {
  [ProductHealthStatus.Critical]: 0,
  [ProductHealthStatus.Attention]: 1,
  [ProductHealthStatus.Ideal]: 2,
};

export function scoreOffer(offer: OfferRow): { score: number; status: ProductHealthStatus; diagnoses: ProductDiagnosis[] } {
  const diagnoses: ProductDiagnosis[] = [];
  let score = 0;

  if (offer.products.image_url) {
    score += WEIGHTS.image;
  } else {
    diagnoses.push({
      type: ProductDiagnosisType.NoImage,
      label: "Sem imagem",
      impact: "Produtos sem foto recebem 3× menos cliques.",
      severity: "critical",
    });
  }

  if (offer.products.category_id) {
    score += WEIGHTS.category;
  } else {
    diagnoses.push({
      type: ProductDiagnosisType.NoCategory,
      label: "Sem categoria",
      impact: "Invisível nos filtros — perde até 60% do tráfego orgânico.",
      severity: "critical",
    });
  }

  if (offer.products.brand_id) {
    score += WEIGHTS.brand;
  } else {
    diagnoses.push({
      type: ProductDiagnosisType.NoBrand,
      label: "Sem marca",
      impact: "Perde buscas de alta intenção por marca.",
      severity: "warning",
    });
  }

  if (offer.products.description?.trim()) {
    score += WEIGHTS.description;
  } else {
    diagnoses.push({
      type: ProductDiagnosisType.NoDescription,
      label: "Sem descrição",
      impact: "Menor confiança do comprador e menor ranking na busca.",
      severity: "info",
    });
  }

  if (offer.price_usd && offer.price_usd > 0) {
    score += WEIGHTS.price;
  } else {
    diagnoses.push({
      type: ProductDiagnosisType.NoPrice,
      label: "Sem preço",
      impact: "Excluído do comparador — invisível para o comprador que pesquisa por preço.",
      severity: "critical",
    });
  }

  const status =
    score >= 80
      ? ProductHealthStatus.Ideal
      : score >= 50
        ? ProductHealthStatus.Attention
        : ProductHealthStatus.Critical;

  return { score, status, diagnoses };
}

export async function getProductHealthList(
  storeIds: string[],
  serviceClient: SupabaseClient
): Promise<ProductHealthRecord[]> {
  if (storeIds.length === 0) return [];

  const { data } = await serviceClient
    .from("offers")
    .select("id, in_stock, price_usd, products!inner(id, name, image_url, category_id, brand_id, description)")
    .in("store_id", storeIds);

  const offers = (data ?? []) as unknown as OfferRow[];

  const records: ProductHealthRecord[] = offers.map((offer) => {
    const { score, status, diagnoses } = scoreOffer(offer);
    return {
      offer_id: offer.id,
      product_id: offer.products.id,
      product_name: offer.products.name,
      image_url: offer.products.image_url,
      price_usd: offer.price_usd,
      in_stock: offer.in_stock,
      status,
      score,
      diagnoses,
      action_href: "/merchant/catalog",
    };
  });

  return records.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
}

export function getHealthBreakdown(products: ProductHealthRecord[]): CatalogHealthBreakdown {
  const total = products.length;
  const ideal_count = products.filter((p) => p.status === ProductHealthStatus.Ideal).length;
  const attention_count = products.filter((p) => p.status === ProductHealthStatus.Attention).length;
  const critical_count = products.filter((p) => p.status === ProductHealthStatus.Critical).length;

  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
  const health_score =
    total > 0 ? Math.round(products.reduce((sum, p) => sum + p.score, 0) / total) : 0;

  return {
    ideal_count,
    attention_count,
    critical_count,
    total,
    ideal_pct: pct(ideal_count),
    attention_pct: pct(attention_count),
    critical_pct: pct(critical_count),
    health_score,
  };
}
