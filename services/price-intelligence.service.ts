import { supabase } from "@/lib/supabase";
import { computePriceIntelligence, type PriceIntelligenceResult, type PricePoint } from "@/utils/priceIntelligence";

// Price Intelligence — consulta de histórico de preços de um PRODUTO (servidor).
//
// Lê `price_history` (via `offers.product_id`) para o produto bruto da página
// `/product/[slug]`, de forma LIMITADA (bloqueia N+1 e payloads grandes) e com
// downsampling simples (o modelo agrega pelo melhor preço por timestamp e a
// série é truncada para o teto abaixo). Roda em Server Component; nunca no
// browser. Devolve o resultado determinístico `computePriceIntelligence`.

/** Máximo de linhas de price_history lidas por produto (segurança de payload). */
const MAX_HISTORY_ROWS = 3000;

interface PriceHistoryRow {
  price_usd: number | null;
  recorded_at: string;
}

export interface ProductPriceIntelligence {
  result: PriceIntelligenceResult;
  /** Pontos para o gráfico (downsampled, ordenados). Pode estar vazio quando insufficient. */
  series: PricePoint[];
}

export async function getProductPriceIntelligence(productId: string): Promise<ProductPriceIntelligence> {
  // P2 Public Catalog Visibility. Este card é consumer (/product/[slug]) e
  // agrega estado HISTÓRICO — mas o histórico de uma loja que hoje não é
  // pública não pode formar inteligência de preço do consumidor, mesmo que a
  // oferta atual já esteja oculta em outras superfícies.
  //
  // `stores!inner(active)` + `.eq("offers.stores.active", true)` resolvem isso
  // ESTRUTURALMENTE no banco: o caminho do filtro espelha a cadeia de embeds
  // (`price_history` -> `offers` -> `stores`) e o `!inner` faz o filtro valer
  // para a linha de `price_history` (não apenas para o embed). Nada é filtrado
  // em JavaScript depois da agregação.
  //
  // SEMÂNTICA DE `available` (preservada de propósito): o card NÃO exige
  // `offers.available = true`. `available=false` é oferta ARQUIVADA e não
  // forma preço ATUAL (ADR-008), mas o gráfico é o registro de preços
  // OBSERVADOS — inclusive de uma oferta que hoje está arquivada ou esgotada
  // numa loja que continua ativa. A exigência deste incidente é sobre loja não
  // pública; mudar também `available` aqui inventaria uma regra nova.
  const { data, error } = await supabase
    .from("price_history")
    .select("price_usd, recorded_at, offers!inner(product_id, stores!inner(active))")
    .eq("offers.product_id", productId)
    .eq("offers.stores.active", true)
    .order("recorded_at", { ascending: true })
    .limit(MAX_HISTORY_ROWS);

  const points: PricePoint[] = ((data ?? []) as unknown as PriceHistoryRow[]).map((row) => ({
    recordedAt: row.recorded_at,
    priceUSD: row.price_usd ?? 0,
  }));

  if (error) {
    console.error("[price-intelligence] query error:", error.message);
    return { result: computePriceIntelligence([]), series: [] };
  }

  const result = computePriceIntelligence(points);
  return { result, series: normalizeForChart(points) };
}

/** Downsample para o gráfico (≤ ~60 pontos), mantendo o primeiro/último. */
function normalizeForChart(points: PricePoint[]): PricePoint[] {
  if (points.length <= 60) return points;
  const step = Math.ceil(points.length / 60);
  const sampled: PricePoint[] = [];
  sampled.push(points[0]);
  for (let i = step; i < points.length; i += step) sampled.push(points[i]);
  if (sampled[sampled.length - 1] !== points[points.length - 1]) sampled.push(points[points.length - 1]);
  return sampled;
}
