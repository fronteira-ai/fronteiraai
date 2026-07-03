"use client";

import { useEffect } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { AnalyticsEventType } from "@/src/domains/merchant-analytics/types/enums";

// Invisible client island, same convention as FavoriteButton/ShareButton on
// this page — fires once per mount, not on every render.
export default function ProductViewTracker({ productId }: { productId: string }) {
  const { track } = useAnalytics();

  useEffect(() => {
    track(AnalyticsEventType.ProductClicked, { product_id: productId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  return null;
}
