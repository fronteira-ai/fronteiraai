"use client";

import { useEffect } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { AnalyticsEventType } from "@/src/domains/merchant-analytics/types/enums";

// Invisible client island on the canonical /lojas/[slug] page — same
// convention as ProductViewTracker on /product/[slug].
export default function StoreViewTracker({ storeId }: { storeId: string }) {
  const { track } = useAnalytics();

  useEffect(() => {
    track(AnalyticsEventType.MerchantViewed, { store_id: storeId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  return null;
}
