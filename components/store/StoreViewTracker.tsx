"use client";

import { useEffect } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { AnalyticsEventType } from "@/src/domains/merchant-analytics/types/enums";

// Invisible client island on the canonical /lojas/[slug] page — same
// convention as ProductViewTracker on /product/[slug]. merchantId (null for
// unclaimed stores) is what lets this event later cross the Brain bridge
// (Release 1.8, Program 0 Wave 0) — only merchant-attributable buyer_events
// can become merchant_trust_events, since that table requires merchant_id.
export default function StoreViewTracker({
  storeId,
  merchantId,
}: {
  storeId: string;
  merchantId: string | null;
}) {
  const { track } = useAnalytics({ merchantId: merchantId ?? undefined });

  useEffect(() => {
    track(AnalyticsEventType.MerchantViewed, { store_id: storeId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  return null;
}
