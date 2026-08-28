/**
 * Merchant Import — deterministic plan builder (preview ≡ commit).
 *
 * Converte um conjunto de RawOffer normalizadas num plano de decisões por item.
 * Preview e commit usam ESTE MESMO builder — nunca recomputam diferente entre
 * a promessa (preview) e a execução (commit). Regras (conservadoras):
 *   - PROHIBITED: título/brand/categoria em valores proibidos ou genéricos
 *     ("IPHONE"/"CELULAR"/"PROMOÇÃO"/"OFERTA"/"Outros"/"GENERAL"...). NUNCA commit.
 *   - Canonical: mesma brand + título normalizado → match de produto existente;
 *     múltiplos → AMBIGUOUS (não fundir às cegas).
 *   - Oferta: produto match + store → se existe oferta com MESMO external_id →
 *     UPDATE/UNCHANGED; senão CREATE_NEW_OFFER.
 */

import type { RawOffer } from "../connectors/types/raw.types";
import { isForbiddenValue, isGenericToken } from "../connectors/normalization/ForbiddenValues";
import { normalizeTitleForMatch } from "../merchant-feed/canonical/MerchantFeedMatchPreview";
import type { ImportItemDecision, ImportPlanItem, ImportPlanSummary } from "./types";

export interface ExistingProductForMatch {
  id: string;
  externalId?: string | null;
  brand?: string | null;
  name: string;
}

export interface PlanBuilderDeps {
  /** Produtos canônicos existentes (injectável — mesma fonte usada no preview e commit). */
  existingProducts: ExistingProductForMatch[];
  /** Ofertas existentes do store por external_id (para determiner UPDATE vs NEW vs UNCHANGED). */
  existingOffersByExternalId?: Map<string, { priceUSD: number; inStock: boolean; productId: string }>;
  storeId: string;
}

const GARBAGE_TITLE_RE = /^(celular|iphone|smartphone|notebook|tv|promo[a-zã]*|oferta|produto|gadget|acess[a-z]*)$/i;

export class ImportPlanBuilder {
  constructor(private readonly deps: PlanBuilderDeps) {}

  build(offers: RawOffer[]): { items: ImportPlanItem[]; summary: ImportPlanSummary } {
    const items: ImportPlanItem[] = [];
    const summary: ImportPlanSummary = { total: offers.length, matchedExisting: 0, createCandidates: 0, updateExistingOffers: 0, createNewOffers: 0, ambiguous: 0, invalid: 0, prohibited: 0, unchanged: 0 };

    const indexByBrand = new Map<string, ExistingProductForMatch[]>();
    for (const p of this.deps.existingProducts) {
      const b = (p.brand ?? "").trim().toLowerCase();
      if (!indexByBrand.has(b)) indexByBrand.set(b, []);
      indexByBrand.get(b)!.push(p);
    }

    for (const offer of offers) {
      const ext = offer.product.externalId;
      const name = offer.product.name?.trim() ?? "";
      if (!ext && !name) {
        items.push({ externalId: ext ?? "", name, decision: "INVALID", reason: "MISSING_EXTERNAL_ID_AND_TITLE" });
        summary.invalid++; continue;
      }
      // PROHIBITED / garbage title → nunca commit. Brand/categoria ausente (undefined)
      // NÃO é proibido (oferta mínima legítima); só quando presentes e inválidos.
      const brandRaw = offer.product.brand?.trim();
      const categoryRaw = offer.product.category?.trim();
      const badBrand = brandRaw !== undefined && brandRaw !== "" && (isForbiddenValue(brandRaw) || isGenericToken(brandRaw));
      const badCategory = categoryRaw !== undefined && categoryRaw !== "" && isForbiddenValue(categoryRaw);
      if (badBrand || badCategory || GARBAGE_TITLE_RE.test(name) || name.length < 3) {
        items.push({ externalId: ext ?? "", name, decision: "PROHIBITED", reason: "FORBIDDEN_VALUE_OR_GENERIC" });
        summary.prohibited++; continue;
      }
      if (!ext) {
        items.push({ externalId: ext ?? "", name, decision: "INVALID", reason: "MISSING_EXTERNAL_ID" });
        summary.invalid++; continue;
      }

      // Canonical: match por brand + título normalizado.
      const brand = (offer.product.brand ?? "").trim().toLowerCase();
      const matchPool = brand ? (indexByBrand.get(brand) ?? []) : [...indexByBrand.values()].flat();
      const normalized = normalizeTitleForMatch(name);
      const candidates = matchPool.filter((p) => normalizeTitleForMatch(p.name) === normalized);

      let decision: ImportItemDecision;
      let productId: string | undefined;
      if (candidates.length === 0) {
        decision = "CREATE_PRODUCT_CANDIDATE";
        summary.createCandidates++;
      } else if (candidates.length === 1) {
        productId = candidates[0].id;
        // Determina ação na oferta deste store.
        const existing = this.deps.existingOffersByExternalId?.get(ext);
        if (existing && existing.productId === productId) {
          const unchanged = Math.abs(existing.priceUSD - offer.priceUSD) < 0.001 && existing.inStock === (offer.inStock ?? false);
          if (unchanged) { decision = "UNCHANGED"; summary.unchanged++; }
          else { decision = "UPDATE_EXISTING_OFFER"; summary.updateExistingOffers++; }
        } else {
          decision = "CREATE_NEW_OFFER";
          summary.createNewOffers++;
        }
        items.push({ externalId: ext, name, decision, productId });
        continue;
      } else {
        decision = "AMBIGUOUS";
        summary.ambiguous++;
      }
      items.push({ externalId: ext, name, decision, productId, reason: decision === "AMBIGUOUS" ? "MULTIPLE_MATCHES" : undefined });
    }
    return { items, summary };
  }
}

export function summarizePlan(items: ImportPlanItem[]): ImportPlanSummary {
  const s: ImportPlanSummary = { total: items.length, matchedExisting: 0, createCandidates: 0, updateExistingOffers: 0, createNewOffers: 0, ambiguous: 0, invalid: 0, prohibited: 0, unchanged: 0 };
  for (const it of items) {
    switch (it.decision) {
      case "MATCH_EXISTING_PRODUCT": s.matchedExisting++; break;
      case "CREATE_PRODUCT_CANDIDATE": s.createCandidates++; break;
      case "UPDATE_EXISTING_OFFER": s.updateExistingOffers++; break;
      case "CREATE_NEW_OFFER": s.createNewOffers++; break;
      case "AMBIGUOUS": s.ambiguous++; break;
      case "INVALID": s.invalid++; break;
      case "PROHIBITED": s.prohibited++; break;
      case "UNCHANGED": s.unchanged++; break;
    }
  }
  return s;
}
