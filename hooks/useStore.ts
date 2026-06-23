"use client";

import { useEffect, useState } from "react";
import { getStoreBySlug, getRelatedStores } from "@/services/store.service";
import { getOffersByStore } from "@/services/offer.service";
import { Store } from "@/types/store";
import { OfferWithProduct } from "@/types/offer";

interface UseStoreResult {
  store: Store | null;
  offers: OfferWithProduct[];
  relatedStores: Store[];
  loading: boolean;
  notFound: boolean;
}

export function useStore(slug: string): UseStoreResult {
  const [store, setStore] = useState<Store | null>(null);
  const [offers, setOffers] = useState<OfferWithProduct[]>([]);
  const [relatedStores, setRelatedStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setNotFound(false);

      const storeData = await getStoreBySlug(slug);

      if (!active) return;

      if (!storeData) {
        setStore(null);
        setOffers([]);
        setRelatedStores([]);
        setNotFound(true);
        setLoading(false);
        return;
      }

      const [offersData, relatedData] = await Promise.all([
        getOffersByStore(storeData.id),
        getRelatedStores(storeData.id),
      ]);

      if (!active) return;

      setStore(storeData);
      setOffers(offersData);
      setRelatedStores(relatedData);
      setLoading(false);
    }

    load();

    return () => {
      active = false;
    };
  }, [slug]);

  return { store, offers, relatedStores, loading, notFound };
}
