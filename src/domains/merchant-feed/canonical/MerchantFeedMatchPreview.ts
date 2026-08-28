/**
 * Merchant Feed Platform — canonical match preview (dry-run).
 *
 * Simula o casamento canônico SEM escrever no catálogo. Para cada oferta
 * normalizada do feed, determina:
 *   MATCHED_EXISTING_PRODUCT  → encontrou um produto canônico existente (por
 *                               atributos estruturados: brand + título normalizado);
 *   NEW_PRODUCT_CANDIDATE     → nenhum produto existente equivalente;
 *   AMBIGUOUS                 → mais de um candidato possível (não fundir às cegas);
 *   INVALID                   → item rejeitado (sem identidade/preço).
 *
 * FALSE MERGE é pior que duplicado: match só por alta confiança (mesma marca +
 * normalização forte de título). Ambíguos → preservados para reconciliação.
 */

export type MatchStatus = "MATCHED_EXISTING_PRODUCT" | "NEW_PRODUCT_CANDIDATE" | "AMBIGUOUS" | "INVALID";

export interface ExistingProductRef {
  id: string;
  brand?: string | null;
  name: string;
  slug?: string;
}

export interface MatchPreviewRow {
  externalId?: string;
  title: string;
  status: MatchStatus;
  matchedProductId?: string;
  candidateTitle?: string;
  ambiguityCount?: number;
  reason?: string;
}

/** Normaliza título p/ comparação (case, acentos, pontuação, espaços). */
export function normalizeTitleForMatch(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export class MerchantFeedMatchPreview {
  /**
   * @param existing produtos canônicos existentes p/ busca (injetável).
   * Implementação V1 determinística: mesmo brand + igualdade de título
   * normalizado (com pequena tolerância de sufixo de modelo) → MATCHED;
   * múltiplos matches → AMBIGUOUS.
   */
  constructor(private readonly existing: ExistingProductRef[]) {}

  preview(offers: Array<{ product: { externalId?: string; name: string; brand?: string } }>): MatchPreviewRow[] {
    const rows: MatchPreviewRow[] = [];
    const indexed = indexByBrand(this.existing);
    const normalize = normalizeTitleForMatch;

    for (const offer of offers) {
      if (!offer.product.externalId && !offer.product.name?.trim()) {
        rows.push({ externalId: offer.product.externalId, title: offer.product.name || "(vazio)", status: "INVALID", reason: "MISSING_CODIGO_AND_TITLE" });
        continue;
      }
      const brand = offer.product.brand?.trim().toLowerCase();
      const title = normalize(offer.product.name);

      const candidates = indexByBrandTitle(indexed, brand, title);
      if (candidates.length === 0) {
        rows.push({ externalId: offer.product.externalId, title: offer.product.name, status: "NEW_PRODUCT_CANDIDATE" });
      } else if (candidates.length === 1) {
        rows.push({ externalId: offer.product.externalId, title: offer.product.name, status: "MATCHED_EXISTING_PRODUCT", matchedProductId: candidates[0].id, candidateTitle: candidates[0].name });
      } else {
        rows.push({ externalId: offer.product.externalId, title: offer.product.name, status: "AMBIGUOUS", ambiguityCount: candidates.length });
      }
    }
    return rows;
  }
}

function indexByBrand(existing: ExistingProductRef[]): Map<string, ExistingProductRef[]> {
  const m = new Map<string, ExistingProductRef[]>();
  for (const e of existing) {
    const brand = (e.brand ?? "").trim().toLowerCase();
    if (!m.has(brand)) m.set(brand, []);
    m.get(brand)!.push(e);
  }
  return m;
}

function indexByBrandTitle(indexed: Map<string, ExistingProductRef[]>, brand: string | undefined, title: string): ExistingProductRef[] {
  const pool = brand ? (indexed.get(brand) ?? []) : [...indexed.values()].flat();
  const out: ExistingProductRef[] = [];
  for (const e of pool) {
    if (normalizeTitleForMatch(e.name) === title) out.push(e);
  }
  return out;
}
