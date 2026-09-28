"use client";

import { useEffect } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { AnalyticsEventType } from "@/src/domains/merchant-analytics/types/enums";
import { productViewMetadata } from "@/utils/buyerEvents";

// Invisible client island, same convention as FavoriteButton/ShareButton on
// this page — fires once per mount, not on every render.
//
// Mission 01 (C2): o `action` explícito diferencia este evento de
// `ProductClickedFromList`, o clique em produto a partir de uma grade. O
// TIPO do evento não foi renomeado (consumidores existentes contam por
// `event_type`), mas o metadado torna a distinção legível para quem for
// analisar o funil depois.
export default function ProductViewTracker({ productId }: { productId: string }) {
  const { track } = useAnalytics();

  useEffect(() => {
    track(AnalyticsEventType.ProductClicked, {
      product_id: productId,
      metadata: productViewMetadata(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  return null;
}
