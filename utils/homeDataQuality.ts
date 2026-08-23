// Sprint 39A — Home 2.0 Foundation (Data Quality Model).
//
// Regra reutilizável de elegibilidade de produto para a Home ("Home-ready"):
// um produto só pode entrar em vitrines se tiver slug válido, imagem
// utilizável, preço válido e oferta disponível. Helpers puros e
// determinísticos — nenhum acesso a banco/rede aqui; os adapters decidem
// quais campos passam (ProductCatalogItem, ProductHighlight ou shape mínimo).
//
// Reutiliza a política de imagem existente (utils/image.ts) em vez de
// duplicá-la: `hasUsableImage` delega para `isRealProductImage`, que já
// rejeita placeholders de seed (placehold.co).

import { isRealProductImage } from "@/utils/image";
import type { ProductCatalogItem, ProductHighlight } from "@/types/product";
import type { Offer } from "@/types/offer";

/** Shape mínimo aceito pelos helpers — qualquer fonte real (Product,
 * ProductCatalogItem, ProductHighlight, linha de query) pode ser mapeada
 * para ele. */
export interface HomeProductCandidate {
  slug?: string | null;
  image_url?: string | null;
  imageUrl?: string | null;
  lowestPriceUSD?: number | null;
  priceUSD?: number | null;
  inStock?: boolean;
  /** Ofertas disponíveis (`available=true`), quando carregadas. Ausente =
   * candidato não informou ofertas. */
  offers?: Pick<Offer, "available">[] | null;
}

export function hasValidSlug(slug: string | null | undefined): boolean {
  return typeof slug === "string" && slug.trim().length > 0;
}

/** Imagem do candidato na ordem de precedência real dos tipos (catalogo usa
 * image_url; highlight usa imageUrl). */
export function candidateImageUrl(candidate: HomeProductCandidate): string | null {
  return candidate.image_url ?? candidate.imageUrl ?? null;
}

export function hasUsableImage(candidate: HomeProductCandidate): boolean {
  return isRealProductImage(candidateImageUrl(candidate));
}

/** Preço exibível: número finito estritamente maior que zero. `0` ou `null`
 * não é preço válido — nunca anunciar preço que não existe. */
export function candidatePriceUSD(candidate: HomeProductCandidate): number | null {
  const price = candidate.lowestPriceUSD ?? candidate.priceUSD ?? null;
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) return null;
  return price;
}

export function hasValidPrice(candidate: HomeProductCandidate): boolean {
  return candidatePriceUSD(candidate) !== null;
}

/** Oferta disponível: se o candidato carregou `offers`, exige pelo menos uma
 * com `available=true` (ADR-008: `available=false` é oferta arquivada e nunca
 * deve formar preço exibível; `in_stock=false` continua elegível). Se não
 * carregou, cai no sinal agregado `inStock` — e, sem nenhum dos dois, não há
 * evidência de oferta. */
export function hasAvailableOffer(candidate: HomeProductCandidate): boolean {
  if (candidate.offers && candidate.offers.length > 0) {
    return candidate.offers.some((offer) => offer.available === true);
  }
  return candidate.inStock === true;
}

export function isHomeReadyProduct(candidate: HomeProductCandidate): boolean {
  return (
    hasValidSlug(candidate.slug) &&
    hasUsableImage(candidate) &&
    hasValidPrice(candidate) &&
    hasAvailableOffer(candidate)
  );
}

// Adapters tipados para os contratos reais — seções futuras (39B–39D) usam
// estes em vez de montar o shape mínimo à mão.

export function isCatalogItemHomeReady(item: ProductCatalogItem): boolean {
  return isHomeReadyProduct({
    slug: item.slug,
    image_url: item.image_url,
    lowestPriceUSD: item.lowestPriceUSD,
    inStock: item.inStock,
  });
}

export function isHighlightHomeReady(item: ProductHighlight): boolean {
  return isHomeReadyProduct({
    slug: item.slug,
    imageUrl: item.imageUrl,
    priceUSD: item.priceUSD,
    inStock: item.inStock,
  });
}
