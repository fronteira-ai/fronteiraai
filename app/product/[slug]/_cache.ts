import { cache } from "react";
import { getProductBySlug, getRelatedProducts } from "@/services/product.service";
import { getOffersByProduct } from "@/services/offer.service";

export const getCachedProduct = cache(getProductBySlug);
export const getCachedOffers = cache(getOffersByProduct);
export const getCachedRelatedProducts = cache(getRelatedProducts);
