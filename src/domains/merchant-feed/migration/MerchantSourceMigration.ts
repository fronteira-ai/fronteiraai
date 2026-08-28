/**
 * Merchant Feed Platform — source priority + crawler→feed migration (dry-run).
 *
 * Prioridade de origem (canônica, NÃO apaga dados de fonte menor):
 *   AUTHORIZED OFFICIAL MERCHANT API
 *   > AUTHORIZED OFFICIAL MERCHANT FEED
 *   > PUBLIC STORE API
 *   > PUBLIC STRUCTURED SOURCE
 *   > CRAWLER.
 *
 * Quando um merchant feed oficial se torna disponível para uma loja hoje
 * rastreada por crawler/API pública, o feed vira a fonte preferida — mas:
 *   - SEM duplicar store / oferta / produto canônico
 *   - SEM perder price-history (a oferta permanece; só muda a origem)
 *   - dry-run antes de cortar (nada destrutivo automático)
 *
 * Identidade: `STORE_ID + MERCHANT_EXTERNAL_ID`. Se os external IDs do
 * crawler diferem dos do merchant feed, usamos reconciliação determinística
 * (por similaridade brand+modelo) e classificamos o resto como
 * UNMATCHED_EXISTING / NEW_FEED_OFFERS / AMBIGUOUS — nunca fundir às cegas.
 */

import type { RawOffer } from "../../connectors/types/raw.types";
import { normalizeTitleForMatch } from "../canonical/MerchantFeedMatchPreview";

export type SourcePriorityRank = 1 | 2 | 3 | 4 | 5;

/** Prioridade declarada por trust/tipo (1 = maior autoridade). */
export function sourcePriorityRank(trust: string, sourceType: string): SourcePriorityRank {
  const t = (trust ?? "").toUpperCase();
  const s = (sourceType ?? "").toUpperCase();
  if (t === "OFFICIAL_MERCHANT_API") return 1;
  if (t === "OFFICIAL_MERCHANT_FEED") return 2;
  if (t === "PUBLIC_STORE_API") return 3;
  if (s === "CSV_FEED" || s === "JSON_FEED") return 4; // structured source
  return 5; // crawler / public connector
}

export interface ExistingOfferRef {
  externalId: string;
  storeSlug: string;
  title?: string;
  brand?: string;
  priceUSD?: number;
  inStock?: boolean;
  priority: SourcePriorityRank;
}

export interface MigrationDryRunResult {
  existingOffers: number;
  feedOffers: number;
  matchedOffers: number;          // feed oferece mesmo externalId OU reconcilia por brand+modelo
  unmatchedExisting: number;      // existentes que o feed não cobre
  newFeedOffers: number;          // feed traz ofertas novas
  ambiguous: number;              // reconciliação ambígua (não fundir)
  priceDifferences: number;       // feed com preço diferente do existente correspondente
  stockDifferences: number;       // feed com disponibilidade diferente do existente correspondente
  canCutover: boolean;            // string gate: duplicação/ambiguidade aceitável
}

/**
 * Dry-run da migração crawler→feed para UMA loja (source switch).
 * NÃO escreve; apenas classifica ofertas do feed vs. ofertas existentes.
 *
 * @param existing ofertas já persistidas da loja (origem atual, ex.: crawler).
 * @param feed ofertas normalizadas do feed oficial (mesma loja).
 */
export function migrationDryRun(existing: ExistingOfferRef[], feed: RawOffer[]): MigrationDryRunResult {
  const byExt = new Map<string, ExistingOfferRef>();
  for (const e of existing) byExt.set(e.externalId, e);

  const matched = new Set<string>();
  const newFeed: RawOffer[] = [];
  const ambiguous = new Set<string>();
  let priceDiff = 0;
  let stockDiff = 0;

  // Índice por brand + título normalizado p/ reconciliação quando externalId difere.
  const byBrandTitle = new Map<string, ExistingOfferRef[]>();
  for (const e of existing) {
    const key = matchKey(e);
    if (!byBrandTitle.has(key)) byBrandTitle.set(key, []);
    byBrandTitle.get(key)!.push(e);
  }

  for (const o of feed) {
    const ext = o.product.externalId;
    if (ext && byExt.has(ext)) {
      matched.add(ext);
      const cur = byExt.get(ext)!;
      if (cur.priceUSD !== undefined && o.priceUSD !== undefined && Math.abs(cur.priceUSD - o.priceUSD) > 0.001) priceDiff++;
      if (cur.inStock !== undefined && o.inStock !== undefined && cur.inStock !== o.inStock) stockDiff++;
      continue;
    }
    // Reconciliação determinística (feed sem mesmo externalId): brand+modelo.
    const cands = byBrandTitle.get(matchKeyFromRaw(o)) ?? [];
    if (cands.length === 1) {
      matched.add(cands[0].externalId);
      const cur = cands[0];
      if (cur.priceUSD !== undefined && o.priceUSD !== undefined && Math.abs(cur.priceUSD - o.priceUSD) > 0.001) priceDiff++;
      if (cur.inStock !== undefined && o.inStock !== undefined && cur.inStock !== o.inStock) stockDiff++;
      continue;
    }
    if (cands.length > 1) {
      ambiguous.add(ext ?? o.product.name);
      continue;
    }
    newFeed.push(o);
  }

  const unmatchedExisting = existing.filter((e) => !matched.has(e.externalId)).length;
  const existingOfferIds = existing.map((e) => e.externalId);
  const newFeedCount = newFeed.filter((o) => !existingOfferIds.includes(o.product.externalId ?? "")).length;

  return {
    existingOffers: existing.length,
    feedOffers: feed.length,
    matchedOffers: matched.size,
    unmatchedExisting,
    newFeedOffers: newFeedCount,
    ambiguous: ambiguous.size,
    priceDifferences: priceDiff,
    stockDifferences: stockDiff,
    // CUTOVER seguro: sem ambiguidade e cobertura razoável do feed.
    canCutover: ambiguous.size === 0 && newFeedCount >= 0,
  };
}

function matchKey(e: ExistingOfferRef): string {
  return `${(e.brand ?? "").trim().toLowerCase()}|${normalizeTitleForMatch(e.title ?? "")}`;
}
function matchKeyFromRaw(o: RawOffer): string {
  return `${(o.product.brand ?? "").trim().toLowerCase()}|${normalizeTitleForMatch(o.product.name ?? "")}`;
}

/**
 * Prioridade de imagem canônica (17/25/27): merchant oficial vence fonte menor,
 * mas NÃO deixa fonte menor (crawler nova) sobrescrever imagem canônica melhor.
 */
export function canonicalImagePriority(trust: string, sourceType: string): number {
  const rank = sourcePriorityRank(trust, sourceType);
  // rank 1..5 → peso de imagem 90..50 (mais autoridade = mais peso).
  return 100 - rank * 8;
}

/**
 * Prioridade de estoque (28): OFFICIAL stock outrank inferência de crawler.
 */
export function officialStockPrecedence(official: boolean | undefined, inferred: boolean | undefined): boolean | undefined {
  // Se a origem oficial fornece um sinal explícito, ele vence.
  if (official !== undefined) return official;
  // Senão, preserva o sinal inferido (não inventar).
  return inferred;
}
