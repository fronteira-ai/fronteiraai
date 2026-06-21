"use client";

import { useEffect, useState } from "react";
import { getProductBySlug, getRelatedProducts } from "@/services/product.service";
import { getOffersByProduct } from "@/services/offer.service";
import { Product, ProductWithRelations } from "@/types/product";
import { OfferWithStore } from "@/types/offer";

interface UseProductResult {
  product: ProductWithRelations | null;
  offers: OfferWithStore[];
  relatedProducts: Product[];
  loading: boolean;
  notFound: boolean;
}

export function useProduct(slug: string): UseProductResult {
  const [product, setProduct] = useState<ProductWithRelations | null>(null);
  const [offers, setOffers] = useState<OfferWithStore[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setNotFound(false);

      const productData = await getProductBySlug(slug);

      if (!active) return;

      if (!productData) {
        setProduct(null);
        setOffers([]);
        setRelatedProducts([]);
        setNotFound(true);
        setLoading(false);
        return;
      }

      const [offersData, relatedData] = await Promise.all([
        getOffersByProduct(productData.id),
        getRelatedProducts(productData.category_id, productData.id),
      ]);

      if (!active) return;

      setProduct(productData);
      setOffers(offersData);
      setRelatedProducts(relatedData);
      setLoading(false);
    }

    load();

    return () => {
      active = false;
    };
  }, [slug]);

  return { product, offers, relatedProducts, loading, notFound };
}
