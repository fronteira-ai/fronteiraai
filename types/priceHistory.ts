// Schema proposto na Sprint 3.7 (ADR-013), implementado como tipo na Sprint
// 3.9 (ADR-017) junto da migration database/migrations/0006_proposed_price_history.sql
// — a tabela ainda não existe no Supabase real (migration não aplicada),
// então estes tipos descrevem o schema pretendido, não um schema confirmado
// por consulta direta (diferente da convenção do resto de types/*.ts).
export type PriceChangeSource = "seed" | "manual" | "admin" | "crawler";

export interface PriceHistoryEntry {
  id: string;
  offer_id: string;
  price_usd: number;
  price_brl: number | null;
  old_price_usd: number | null;
  source: PriceChangeSource;
  recorded_at: string;
}

export interface PriceUpdateResult {
  offerId: string;
  previousPriceUSD: number;
  newPriceUSD: number;
  changed: boolean;
}

// `lowestPriceUSD`/`highestPriceUSD`/`priceChangePercent`/`lastPriceChangeAt`
// vêm de `price_history`; ficam `null` enquanto a tabela não existir ou não
// tiver nenhum registro para a oferta — getOfferPriceMetrics() nunca lança
// nesse caso, só degrada para o que é calculável a partir de `offers` (ver
// services/offer.service.ts).
export interface OfferPriceMetrics {
  offerId: string;
  currentPriceUSD: number;
  lowestPriceUSD: number | null;
  highestPriceUSD: number | null;
  priceChangePercent: number | null;
  lastPriceChangeAt: string | null;
}
