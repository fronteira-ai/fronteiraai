import { cache } from "react";
import { getStoreBySlug, getRelatedStores } from "@/services/store.service";
import { getOffersByStore } from "@/services/offer.service";

export const getCachedStore = cache(getStoreBySlug);
export const getCachedStoreOffers = cache(getOffersByStore);
export const getCachedRelatedStores = cache(getRelatedStores);
